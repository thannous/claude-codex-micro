#!/usr/bin/env node

// SPIKE — HID framing probe, Node side.
//
// OBSOLETE FOR WRITING. Measured since: `node-hid` cannot open this device on
// macOS. It ships hidapi 0.15.0, which opens in *seize* mode and does not expose
// `hid_darwin_set_open_exclusive`; macOS refuses the grab even with "Input
// Monitoring" granted. `--send` will therefore always fail. The frame was
// confirmed another way, by scripts/lib/hid-probe.swift, opening
// non-exclusively through IOKit.
//
// This file stays useful for one thing only: the read-only enumeration, which
// shows the four collections where IOKit exposes a single device.
//
// It exists to settle one uncertainty, not to become the DeviceAdapter: it is
// meant to be thrown away once the real transport is written.
//
// The uncertainty: the reported frame — 64-byte reports, byte 0 = report ID
// `0x06`, byte 1 = channel `2`, byte 2 = length, UTF-8 payload after that — had
// never been verified at runtime. Until it is, writing the encoding libraries
// and their tests would be manufacturing confidence: the tests would go green
// while encoding nothing.
//
// Two precautions dictate the shape of the probe:
//
//   1. It does nothing by default. Without `--send`, it enumerates and prints
//      the frame it would send. Writing to a device is a side effect; it takes
//      an explicit gesture.
//   2. Its payload is a no-op. The observed SDK documents "Only the thread id is
//      required on each entry" and "omit optional fields to leave those
//      parameters unchanged on the device": an entry reduced to `{"id":0}`
//      therefore proves the frame without changing a single colour.
//
// It writes no file, and touches neither Input's storage, nor the firmware, nor
// the ChatGPT app. See docs/research/thread-status-feasibility.md.

const VENDOR_ID = 0x303a;
const PRODUCT_ID = 0x8360;

// The frame under test, overridable for the bounded iteration of step 2.
const DEFAULT_FRAME = { reportId: 0x06, channel: 0x02, size: 64, headerLength: 3 };

// Plausible variants should the default frame fail. Deliberately bounded: a
// probe sweeping the full byte space writes anything at all to a device that is
// also a keyboard.
const FRAME_VARIANTS = [
  { reportId: 0x06, channel: 0x02, size: 64, headerLength: 3 },
  { reportId: 0x06, channel: 0x02, size: 65, headerLength: 3 },
  { reportId: 0x00, channel: 0x02, size: 64, headerLength: 3 },
  { reportId: 0x06, channel: 0x01, size: 64, headerLength: 3 },
  { reportId: 0x06, channel: 0x02, size: 32, headerLength: 3 },
];

const READ_TIMEOUT_MS = 1500;
const READ_ATTEMPTS = 6;

function usage() {
  return `Usage: node scripts/lighting-probe.mjs [options]

Par défaut : énumère le périphérique et affiche la trame, sans rien écrire.

Options
  --send              écrit réellement la trame no-op et lit la réponse
  --variants          essaie les cadres alternatifs si le défaut échoue
  --map               allume les six emplacements un par un (implique --send,
                      MODIFIE l'éclairage)
  --report-id=N       surcharge l'octet 0
  --channel=N         surcharge l'octet 1
  --size=N            surcharge la taille du rapport
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function mask(value) {
  if (typeof value !== "string" || value.length < 4) return value ? "***" : value;
  return `${value.slice(0, 2)}…${value.slice(-2)}`;
}

function hex(value, width = 2) {
  return `0x${value.toString(16).padStart(width, "0")}`;
}

// --- cadrage -----------------------------------------------------------------

function encode(payload, frame) {
  const bytes = Buffer.from(payload, "utf8");
  const capacity = frame.size - frame.headerLength;
  if (bytes.length > capacity) {
    // Multi-report continuation is out of scope for the probe: all of its
    // payloads fit in one report, by construction.
    throw new Error(
      `Payload of ${bytes.length} bytes for a capacity of ${capacity}. ` +
        "The probe does not implement continuation.",
    );
  }
  const report = Buffer.alloc(frame.size, 0);
  report[0] = frame.reportId;
  report[1] = frame.channel;
  report[2] = bytes.length;
  bytes.copy(report, frame.headerLength);
  return report;
}

// Reading is deliberately tolerant: knowing *which* interpretation works is
// precisely what the probe has to report.
function decode(buffer) {
  const bytes = Buffer.from(buffer);
  const attempts = [
    { label: "3-byte header, length in [2]", start: 3, length: bytes[2] },
    { label: "report ID stripped by hidapi, length in [1]", start: 2, length: bytes[1] },
  ];
  for (const attempt of attempts) {
    if (!Number.isInteger(attempt.length) || attempt.length <= 0) continue;
    const slice = bytes.subarray(attempt.start, attempt.start + attempt.length).toString("utf8");
    try {
      return { json: JSON.parse(slice), interpretation: attempt.label, raw: slice };
    } catch {
      // Next interpretation.
    }
  }
  const text = bytes.toString("utf8");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return {
        json: JSON.parse(text.slice(first, last + 1)),
        interpretation: "JSON recovered by scanning, frame does not conform",
        raw: text.slice(first, last + 1),
      };
    } catch {
      // Rien d'exploitable.
    }
  }
  return { json: null, interpretation: null, raw: bytes.subarray(0, 24).toString("hex") };
}

// --- transport ---------------------------------------------------------------

async function loadHid() {
  try {
    return (await import("node-hid")).default ?? (await import("node-hid"));
  } catch (error) {
    throw new Error(
      "node-hid is missing. It sits in optionalDependencies:\n" +
        "  npm install node-hid\n" +
        `Cause: ${error.message}`,
    );
  }
}

function describe(entry) {
  return [
    `  interface ${entry.interface ?? "?"}`,
    `usagePage ${hex(entry.usagePage ?? 0, 4)}`,
    `usage ${hex(entry.usage ?? 0, 2)}`,
    `serial ${mask(entry.serialNumber)}`,
  ].join("  ");
}

// The vendor collection is preferred when it exists: on macOS, access to a
// keyboard-usage collection is gated by the "Input Monitoring" permission, where
// access to a vendor collection is not.
function chooseInterface(entries) {
  const vendor = entries.find((entry) => (entry.usagePage ?? 0) >= 0xff00);
  return { entry: vendor ?? entries[0], isVendor: Boolean(vendor) };
}

function openDevice(HID, entry) {
  try {
    return new HID.HID(entry.path);
  } catch (error) {
    const message = String(error?.message ?? error);
    if (/permission|not permitted|cannot open|privile/i.test(message)) {
      throw new Error(
        "macOS refused to open the device.\n" +
          "  Measured: the refusal covers the vendor collection too. The lock is on\n" +
          "  the device — which exposes a keyboard usage — not on the targeted\n" +
          "  collection. The \"Input Monitoring\" permission is required.\n" +
          "\n" +
          "  Mind the responsible process: macOS grants the permission to the parent\n" +
          "  application, not to the `node` executable. Started from an agent or an\n" +
          "  IDE, the probe asks for the permission on behalf of that application.\n" +
          "  Run it from Terminal.app, and authorise Terminal:\n" +
          "    System Settings > Privacy & Security > Input Monitoring\n" +
          "\n" +
          `  Original message: ${message}`,
      );
    }
    throw error;
  }
}

function exchange(device, payload, frame) {
  const report = encode(payload, frame);
  device.write([...report]);
  for (let attempt = 0; attempt < READ_ATTEMPTS; attempt += 1) {
    let data;
    try {
      data = device.readTimeout(READ_TIMEOUT_MS);
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
    if (!data || data.length === 0) continue;
    const decoded = decode(data);
    if (decoded.json) return { ok: true, ...decoded };
  }
  return { ok: false, error: "no usable answer" };
}

// --- sonde -------------------------------------------------------------------

const NO_OP_REQUEST = JSON.stringify({
  method: "v.oai.thstatus",
  params: [{ id: 0 }],
  id: 1,
});

function reportFrame(frame, payload) {
  const report = encode(payload, frame);
  process.stdout.write(
    `  frame       report ID ${hex(frame.reportId)}, channel ${hex(frame.channel)}, ` +
      `${frame.size} bytes, header ${frame.headerLength}\n` +
      `  payload     ${payload}\n` +
      `              ${Buffer.byteLength(payload, "utf8")} bytes of ` +
      `${frame.size - frame.headerLength} available\n` +
      `  report      ${report.subarray(0, 16).toString("hex")}…\n`,
  );
}

async function probe(options) {
  const HID = await loadHid();
  const entries = HID.devices().filter(
    (entry) => entry.vendorId === VENDOR_ID && entry.productId === PRODUCT_ID,
  );

  process.stdout.write(`Device ${hex(VENDOR_ID, 4)}:${hex(PRODUCT_ID, 4)}\n`);
  if (entries.length === 0) {
    return fail("  Not found. Is the Codex Micro connected, over USB or Bluetooth?");
  }
  for (const entry of entries) process.stdout.write(`${describe(entry)}\n`);

  const { entry, isVendor } = chooseInterface(entries);
  process.stdout.write(
    `  chosen      interface ${entry.interface ?? "?"}, ` +
      `${isVendor ? "vendor collection" : "keyboard collection — macOS permission likely needed"}\n\n`,
  );

  reportFrame(options.frame, NO_OP_REQUEST);

  if (!options.send) {
    process.stdout.write(
      "\n  Nothing was written. Run again with --send to exercise the frame.\n" +
        "  The payload is a no-op: it changes no colour.\n",
    );
    return undefined;
  }

  const device = openDevice(HID, entry);
  try {
    const candidates = options.variants ? FRAME_VARIANTS : [options.frame];
    for (const [index, frame] of candidates.entries()) {
      if (index > 0) process.stdout.write(`\n  variant ${index}:\n`), reportFrame(frame, NO_OP_REQUEST);
      const result = exchange(device, NO_OP_REQUEST, frame);
      if (result.ok) {
        process.stdout.write(
          `\n  ✔ FRAME CONFIRMED\n` +
            `    interpretation: ${result.interpretation}\n` +
            `    answer:         ${result.raw}\n`,
        );
        if (options.map) await mapSlots(device, frame);
        return undefined;
      }
      process.stdout.write(`  ✘ ${result.error}\n`);
    }
    return fail(
      "\n  No frame answered. The header format needs revisiting:\n" +
        "  re-read the ChatGPT.app bundle locally to pin down the header and the\n" +
        "  continuation, then widen FRAME_VARIANTS in a bounded way.",
    );
  } finally {
    device.close();
  }
}

// Changes the lighting: reserved for `--map`, never done implicitly.
async function mapSlots(device, frame) {
  process.stdout.write(
    "\n  Sweeping the six slots. The lighting is modified;\n" +
      "  the ChatGPT app will restore it on its next push, within 35 to 40s.\n",
  );
  const restore = () => {
    try {
      const off = JSON.stringify({
        method: "v.oai.thstatus",
        params: Array.from({ length: 6 }, (_, id) => ({ id, b: 0 })),
        id: 999,
      });
      device.write([...encode(off, frame)]);
    } catch {
      // The device may already be closed: nothing better to try.
    }
  };
  process.on("SIGINT", () => (restore(), process.exit(130)));

  for (let id = 0; id < 6; id += 1) {
    const request = JSON.stringify({
      method: "v.oai.thstatus",
      params: [{ id, c: 0xd97757, b: 1, e: 1 }],
      id: 100 + id,
    });
    const result = exchange(device, request, frame);
    process.stdout.write(
      `    id ${id} → ${result.ok ? "acknowledged" : `failed: ${result.error}`}` +
        " — which key lit up?\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  restore();
  process.stdout.write(
    "\n  Record the id → key mapping in SLOT_THREAD_IDS,\n" +
      "  then freeze the \"reported, not re-verified\" rows of the research note.\n",
  );
}

// --- entry point --------------------------------------------------------------

function parseArguments(argv) {
  const numeric = (flag, fallback) => {
    const found = argv.find((argument) => argument.startsWith(`--${flag}=`));
    if (!found) return fallback;
    const parsed = Number(found.split("=")[1]);
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const map = argv.includes("--map");
  return {
    send: argv.includes("--send") || map,
    variants: argv.includes("--variants"),
    map,
    frame: {
      reportId: numeric("report-id", DEFAULT_FRAME.reportId),
      channel: numeric("channel", DEFAULT_FRAME.channel),
      size: numeric("size", DEFAULT_FRAME.size),
      headerLength: DEFAULT_FRAME.headerLength,
    },
  };
}

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  process.stdout.write(usage());
} else {
  probe(parseArguments(argv)).catch((error) => fail(error.message ?? String(error)));
}
