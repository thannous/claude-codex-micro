#!/usr/bin/env node

// SPIKE — sonde de cadrage HID, côté Node.
//
// PÉRIMÉ POUR L'ÉCRITURE. Mesuré depuis : `node-hid` ne peut pas ouvrir ce
// périphérique sur macOS. Il embarque hidapi 0.15.0, qui ouvre en mode *seize*
// et n'expose pas `hid_darwin_set_open_exclusive` ; macOS refuse la saisie même
// avec « Surveillance des saisies » accordée. `--send` échouera donc toujours.
// Le cadre a été confirmé autrement, par scripts/lib/hid-probe.swift, en
// ouverture non exclusive via IOKit.
//
// Ce fichier reste utile pour une seule chose : l'énumération en lecture seule,
// qui montre les quatre collections là où IOKit n'expose qu'un périphérique.
//
// Ce fichier existe pour lever une seule incertitude, pas pour devenir le
// DeviceAdapter : il est destiné à être jeté une fois le vrai transport écrit.
//
// L'incertitude : le cadre rapporté — rapports de 64 octets, octet 0 = report ID
// `0x06`, octet 1 = canal `2`, octet 2 = longueur, charge utile UTF-8 ensuite —
// n'a jamais été vérifié à l'exécution. Tant qu'il ne l'est pas, écrire les
// bibliothèques d'encodage et leurs tests reviendrait à fabriquer de la
// confiance : les tests passeraient au vert en encodant du néant.
//
// Deux précautions dictent la forme de la sonde :
//
//   1. Elle ne fait rien par défaut. Sans `--send`, elle énumère et affiche la
//      trame qu'elle enverrait. Écrire sur un périphérique est un effet de bord,
//      il demande un geste explicite.
//   2. Sa charge utile est un no-op. Le SDK observé documente « Only the thread
//      id is required on each entry » et « omit optional fields to leave those
//      parameters unchanged on the device » : une entrée réduite à `{"id":0}`
//      prouve donc le cadre sans changer une seule couleur.
//
// Elle n'écrit aucun fichier, ne touche ni au stockage Input, ni au firmware,
// ni à l'app ChatGPT. Voir docs/research/thread-status-feasibility.md.

const VENDOR_ID = 0x303a;
const PRODUCT_ID = 0x8360;

// Le cadre à éprouver, surchargeable pour l'itération bornée de l'étape 2.
const DEFAULT_FRAME = { reportId: 0x06, channel: 0x02, size: 64, headerLength: 3 };

// Variantes plausibles si le cadre par défaut échoue. Bornées volontairement :
// une sonde qui balaie l'espace complet des octets écrit n'importe quoi sur un
// périphérique qui est aussi un clavier.
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
    // La continuation multi-rapports est hors périmètre de la sonde : toutes ses
    // charges utiles tiennent dans un rapport, par construction.
    throw new Error(
      `Charge utile de ${bytes.length} octets pour une capacité de ${capacity}. ` +
        "La sonde n'implémente pas la continuation.",
    );
  }
  const report = Buffer.alloc(frame.size, 0);
  report[0] = frame.reportId;
  report[1] = frame.channel;
  report[2] = bytes.length;
  bytes.copy(report, frame.headerLength);
  return report;
}

// La lecture est volontairement tolérante : savoir *quelle* interprétation
// fonctionne est précisément ce que la sonde doit rapporter.
function decode(buffer) {
  const bytes = Buffer.from(buffer);
  const attempts = [
    { label: "en-tête à 3 octets, longueur en [2]", start: 3, length: bytes[2] },
    { label: "report ID retiré par hidapi, longueur en [1]", start: 2, length: bytes[1] },
  ];
  for (const attempt of attempts) {
    if (!Number.isInteger(attempt.length) || attempt.length <= 0) continue;
    const slice = bytes.subarray(attempt.start, attempt.start + attempt.length).toString("utf8");
    try {
      return { json: JSON.parse(slice), interpretation: attempt.label, raw: slice };
    } catch {
      // Interprétation suivante.
    }
  }
  const text = bytes.toString("utf8");
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    try {
      return {
        json: JSON.parse(text.slice(first, last + 1)),
        interpretation: "JSON retrouvé par balayage, cadre non conforme",
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
      "node-hid est absent. Il est en optionalDependencies :\n" +
        "  npm install node-hid\n" +
        `Cause : ${error.message}`,
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

// La collection vendor est préférée si elle existe : sur macOS, l'accès à une
// collection d'usage clavier est soumis à l'autorisation « Surveillance des
// saisies », pas celui d'une collection vendor.
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
        "Ouverture refusée par macOS.\n" +
          "  Mesuré : le refus vise aussi la collection vendor. Le verrou porte donc\n" +
          "  sur le périphérique — qui expose un usage clavier — et non sur la\n" +
          "  collection visée. L'autorisation « Surveillance des saisies » est requise.\n" +
          "\n" +
          "  Attention au processus responsable : macOS attribue l'autorisation à\n" +
          "  l'application parente, pas à l'exécutable `node`. Lancée depuis un agent\n" +
          "  ou un IDE, la sonde demande l'autorisation pour cette application-là.\n" +
          "  Lancer depuis Terminal.app, et autoriser Terminal :\n" +
          "    Réglages Système > Confidentialité et sécurité > Surveillance des saisies\n" +
          "\n" +
          `  Message d'origine : ${message}`,
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
  return { ok: false, error: "aucune réponse exploitable" };
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
    `  cadre       report ID ${hex(frame.reportId)}, canal ${hex(frame.channel)}, ` +
      `${frame.size} octets, en-tête ${frame.headerLength}\n` +
      `  charge      ${payload}\n` +
      `              ${Buffer.byteLength(payload, "utf8")} octets sur ` +
      `${frame.size - frame.headerLength} disponibles\n` +
      `  trame       ${report.subarray(0, 16).toString("hex")}…\n`,
  );
}

async function probe(options) {
  const HID = await loadHid();
  const entries = HID.devices().filter(
    (entry) => entry.vendorId === VENDOR_ID && entry.productId === PRODUCT_ID,
  );

  process.stdout.write(`Périphérique ${hex(VENDOR_ID, 4)}:${hex(PRODUCT_ID, 4)}\n`);
  if (entries.length === 0) {
    return fail("  Introuvable. Le Codex Micro est-il connecté, en USB ou en Bluetooth ?");
  }
  for (const entry of entries) process.stdout.write(`${describe(entry)}\n`);

  const { entry, isVendor } = chooseInterface(entries);
  process.stdout.write(
    `  choisie     interface ${entry.interface ?? "?"}, ` +
      `${isVendor ? "collection vendor" : "collection clavier — autorisation macOS probable"}\n\n`,
  );

  reportFrame(options.frame, NO_OP_REQUEST);

  if (!options.send) {
    process.stdout.write(
      "\n  Rien n'a été écrit. Relancer avec --send pour éprouver le cadre.\n" +
        "  La charge est un no-op : elle ne change aucune couleur.\n",
    );
    return undefined;
  }

  const device = openDevice(HID, entry);
  try {
    const candidates = options.variants ? FRAME_VARIANTS : [options.frame];
    for (const [index, frame] of candidates.entries()) {
      if (index > 0) process.stdout.write(`\n  variante ${index} :\n`), reportFrame(frame, NO_OP_REQUEST);
      const result = exchange(device, NO_OP_REQUEST, frame);
      if (result.ok) {
        process.stdout.write(
          `\n  ✔ CADRE CONFIRMÉ\n` +
            `    interprétation : ${result.interpretation}\n` +
            `    réponse        : ${result.raw}\n`,
        );
        if (options.map) await mapSlots(device, frame);
        return undefined;
      }
      process.stdout.write(`  ✘ ${result.error}\n`);
    }
    return fail(
      "\n  Aucun cadre n'a répondu. Le format d'en-tête est à revoir :\n" +
        "  relire localement le bundle ChatGPT.app pour fixer l'en-tête et la\n" +
        "  continuation, puis élargir FRAME_VARIANTS de façon bornée.",
    );
  } finally {
    device.close();
  }
}

// Modifie l'éclairage : réservé à `--map`, jamais fait implicitement.
async function mapSlots(device, frame) {
  process.stdout.write(
    "\n  Balayage des six emplacements. L'éclairage est modifié ;\n" +
      "  l'app ChatGPT le rétablira à sa prochaine poussée, sous 35 à 40 s.\n",
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
      // Le périphérique est peut-être déjà fermé : rien de mieux à tenter.
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
      `    id ${id} → ${result.ok ? "accusé reçu" : `échec : ${result.error}`}` +
        " — quelle touche s'est allumée ?\n",
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  restore();
  process.stdout.write(
    "\n  Reporter la correspondance id → touche dans SLOT_THREAD_IDS,\n" +
      "  puis figer les lignes « rapporté, non revérifié » de la note de recherche.\n",
  );
}

// --- entrée ------------------------------------------------------------------

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
