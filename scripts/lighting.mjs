#!/usr/bin/env node

// Local control of the Codex Micro lighting: colour and effect of the six Agent
// keys, global zones, and listening to key and joystick events.
//
// Original reimplementation of the observed format, documented in
// docs/research/hid-lighting-protocol.md. Nothing persistent is written: only
// volatile HID reports are emitted; nothing is flashed, nothing goes into
// Input's storage.
//
// Contention: the ChatGPT app pushes its own configuration every 35 to 40s and
// the last write wins. Without --hold, a state set here can be overwritten;
// with --hold, any detected foreign push triggers an immediate reapply (plus a
// periodic safety net).

import { spawn } from "node:child_process";
import { promises as fs, watch } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DeviceError, DeviceSession, listInterfaces } from "./lib/hid-device.mjs";
import {
  EFFECTS,
  METHODS,
  SLOT_THREAD_IDS,
  allOffParams,
  colorToInt,
  rgbConfigParams,
  slotsToThreadEntries,
  threadEntry,
} from "./lib/hid-lighting.mjs";
import { SLOT_CONTROLS, SLOT_COUNT } from "./lib/thread-slots.mjs";

const stateDir =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const slotsPath = path.join(stateDir, "slots.json");

// Guard time against the firmware's key repeats.
const FOCUS_DEBOUNCE_MS = 300;
const HOLD_SAFETY_MS = 10000;

function usage() {
  return `Usage: node scripts/lighting.mjs <command> [options]

Commands
  list [--json]               list the Codex Micro vendor HID interfaces
  probe [--delay=ms]          check the channel (sys.version), then light the six
                              keys one by one to confirm the mapping
  set slot <1-${SLOT_COUNT}> <#RRGGBB> [opts]   colour/effect of one Agent key
  set all <#RRGGBB> [opts]                    same setting on all six keys
  set zones --keys=#RRGGBB --ambient=#RRGGBB [opts]   the two global zones
  watch [--hold] [--focus]    push slots.json state colours continuously
                              --focus: pressing an Agent key goes to its session
  listen                      log key and joystick events (v.oai.hid / v.oai.rad)
  off                         turn the six Agent keys off

Options
  --effect=name               ${Object.keys(EFFECTS).join(", ")}
  --brightness=0..1           intensity (0 = off, 1 = full)
  --speed=0..1                effect speed
  --magic=n                   zone magic parameter (default 1)
  --hold                      reapply as soon as a foreign write is detected
  --path=path                 specific HID interface (default: first one found)

Contention: the ChatGPT app pushes its own configuration every 35 to 40s and the
last write wins. Without --hold, the state set here can be overwritten.
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (match) flags[match[1]] = match[2] ?? true;
    else positional.push(arg);
  }
  return { flags, positional };
}

function parseUnit(name, value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(`--${name} expected between 0 and 1: ${value}`);
  }
  return parsed;
}

function parseEffect(value) {
  if (value === undefined) return EFFECTS.solid;
  const effect = EFFECTS[value];
  if (effect === undefined) {
    throw new Error(`unknown --effect: ${value} (${Object.keys(EFFECTS).join(", ")})`);
  }
  return effect;
}

async function openSession(flags, options = {}) {
  try {
    return await DeviceSession.open({ path: flags.path === true ? undefined : flags.path, ...options });
  } catch (error) {
    if (error instanceof DeviceError) return fail(error.message);
    throw error;
  }
}

// --- list --------------------------------------------------------------------

async function commandList(flags) {
  const interfaces = await listInterfaces();
  if (flags.json) {
    process.stdout.write(`${JSON.stringify(interfaces, null, 2)}\n`);
    return;
  }
  if (interfaces.length === 0) {
    return fail("No vendor interface (VID 0x303a, usage 0xFF00). Is the keyboard plugged in?");
  }
  for (const device of interfaces) {
    process.stdout.write(
      `  ${device.product ?? "?"}  path=${device.path}\n    usagePage=0x${device.usagePage.toString(16)} usage=${device.usage} interface=${device.interface ?? "?"}\n`,
    );
  }
}

// --- probe -------------------------------------------------------------------

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function commandProbe(flags) {
  const delay = Number(flags.delay ?? 2000);
  const session = await openSession(flags, {
    onDebugLine: () => {},
  });
  if (!session) return;

  session.onNotification(METHODS.notifyHid, (params) => {
    process.stdout.write(`  [key] ${JSON.stringify(params)}\n`);
  });
  session.onNotification(METHODS.notifyJoystick, (params) => {
    process.stdout.write(`  [joystick] ${JSON.stringify(params)}\n`);
  });

  try {
    const version = await session.call("sys.version");
    process.stdout.write(`✔ RPC channel works — sys.version: ${JSON.stringify(version.result ?? version)}\n`);
  } catch (error) {
    await session.close();
    return fail(`✘ no answer to sys.version: ${error.message}`);
  }

  process.stdout.write(
    `\nLighting the six slots one by one (thread id → expected key).\n` +
      `Note any divergence: the SLOT_THREAD_IDS table in scripts/lib/hid-lighting.mjs is frozen from this observation.\n`,
  );
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const entries = SLOT_THREAD_IDS.map((id, other) =>
      threadEntry(
        other === index
          ? { id, color: "#D97757", brightness: 1, effect: EFFECTS.solid }
          : { id, brightness: 0 },
      ),
    );
    try {
      await session.call(METHODS.threadsLighting, entries);
    } catch (error) {
      await session.close();
      return fail(`✘ thstatus write failed: ${error.message}`);
    }
    process.stdout.write(
      `  thread ${SLOT_THREAD_IDS[index]} lit → slot ${index + 1} expected (${SLOT_CONTROLS[index]})\n`,
    );
    await wait(Number.isNaN(delay) ? 2000 : delay);
  }
  await session.call(METHODS.threadsLighting, allOffParams());
  process.stdout.write(`✔ probe finished, keys turned off.\n`);
  await session.close();
}

// --- set ---------------------------------------------------------------------

function holdNote(flags) {
  if (!flags.hold) {
    process.stdout.write(`  (without --hold, the ChatGPT app can overwrite this state every 35 to 40s)\n`);
  }
}

async function commandSet(flags, positional) {
  const [target, color] = positional;
  if (target === "zones") {
    const keys = flags.keys;
    const ambient = flags.ambient;
    if (keys === undefined || ambient === undefined || keys === true || ambient === true) {
      return fail("set zones requires --keys=#RRGGBB and --ambient=#RRGGBB (rgbcfg describes both zones at once).");
    }
    const side = {
      effect: parseEffect(flags.effect),
      brightness: parseUnit("brightness", flags.brightness, 1),
      speed: parseUnit("speed", flags.speed, 0.5),
      magic: Number(flags.magic ?? 1),
    };
    let params;
    try {
      params = rgbConfigParams({
        keys: { ...side, color: keys },
        ambient: { ...side, color: ambient },
      });
    } catch (error) {
      return fail(error.message);
    }
    return applyOnce(flags, METHODS.rgbConfig, params, `zones keys=${keys} ambient=${ambient}`);
  }

  let entries;
  try {
    if (target === "all") {
      if (!color) return fail("set all requires a #RRGGBB colour.");
      const base = {
        color,
        brightness: parseUnit("brightness", flags.brightness, 1),
        effect: parseEffect(flags.effect),
      };
      if (flags.speed !== undefined) base.speed = parseUnit("speed", flags.speed, 0.5);
      entries = SLOT_THREAD_IDS.map((id) => threadEntry({ id, ...base }));
    } else if (target === "slot") {
      const slot = Number.parseInt(positional[1] ?? "", 10);
      if (!Number.isInteger(slot) || slot < 1 || slot > SLOT_COUNT) {
        return fail(`Expected a slot between 1 and ${SLOT_COUNT}.`);
      }
      if (!positional[2]) return fail("set slot requires a #RRGGBB colour.");
      const base = {
        id: SLOT_THREAD_IDS[slot - 1],
        color: positional[2],
        brightness: parseUnit("brightness", flags.brightness, 1),
        effect: parseEffect(flags.effect),
      };
      if (flags.speed !== undefined) base.speed = parseUnit("speed", flags.speed, 0.5);
      entries = [threadEntry(base)];
    } else {
      return fail(`Unknown target: ${target ?? "(missing)"}\n\n${usage()}`);
    }
    colorToInt(entries[0].c); // validate before opening the device
  } catch (error) {
    return fail(error.message);
  }
  return applyOnce(flags, METHODS.threadsLighting, entries, `${target} ${positional.slice(1).join(" ")}`);
}

async function applyOnce(flags, method, params, label) {
  let current = params;
  const session = await openSession(flags, {
    onForeignWrite: flags.hold
      ? async (foreignMethod) => {
          process.stdout.write(`  ! foreign write (${foreignMethod}) — reapplying\n`);
          await session.call(method, current).catch(() => {});
        }
      : undefined,
  });
  if (!session) return;

  try {
    await session.call(method, current);
    process.stdout.write(`✔ ${label} applied.\n`);
    holdNote(flags);
  } catch (error) {
    await session.close();
    return fail(`✘ write failed: ${error.message}`);
  }

  if (!flags.hold) return session.close();
  const timer = setInterval(() => {
    session.call(method, current).catch(() => {});
  }, HOLD_SAFETY_MS);
  process.stdout.write(`  hold active (--hold), safety net every ${HOLD_SAFETY_MS / 1000}s. Ctrl-C to quit.\n`);
  process.on("SIGINT", async () => {
    clearInterval(timer);
    await session.close();
    process.exit(0);
  });
}

// --- watch -------------------------------------------------------------------

async function readSlots() {
  const raw = JSON.parse(await fs.readFile(slotsPath, "utf8"));
  if (!Array.isArray(raw.slots)) throw new Error("slots.json has no slots array");
  return raw.slots;
}

async function commandWatch(flags) {
  let rows;
  try {
    rows = await readSlots();
  } catch {
    return fail(
      `${slotsPath} is unreadable. Run \`npm run thread-status -- watch\` first to produce the state.`,
    );
  }

  let lastApplied = null;
  const apply = async (reason) => {
    if (!lastApplied) return;
    await session.call(METHODS.threadsLighting, lastApplied).catch((error) => {
      process.stderr.write(`  ! write failed (${reason}): ${error.message}\n`);
    });
  };

  const session = await openSession(flags, {
    onForeignWrite: flags.hold
      ? (foreignMethod) => {
          process.stdout.write(`  ! foreign write (${foreignMethod}) — reapplying\n`);
          void apply("hold");
        }
      : undefined,
  });
  if (!session) return;

  // The six Agent keys emit `v.oai.hid` with `k` set to `AG00` through `AG05`:
  // the keyboard itself names the slot that was pressed, over the HID channel
  // already open. No global shortcut, no native API, no macOS permission.
  // `act` is 1 on press and 0 on release.
  if (flags.focus) {
    let lastPress = 0;
    const focusScript = fileURLToPath(new URL("./thread-status.mjs", import.meta.url));
    session.onNotification(METHODS.notifyHid, (params) => {
      const match = /^AG0([0-5])$/.exec(params?.k ?? "");
      if (!match || params.act !== 1) return;
      const now = Date.now();
      if (now - lastPress < FOCUS_DEBOUNCE_MS) return;
      lastPress = now;
      const slot = Number(match[1]) + 1;
      const child = spawn(process.execPath, [focusScript, "focus", String(slot)], {
        stdio: ["ignore", "pipe", "pipe"],
      });
      let output = "";
      child.stdout.on("data", (chunk) => (output += chunk));
      child.stderr.on("data", (chunk) => (output += chunk));
      child.on("close", () => {
        // Every line, not only the first: for a closed session, `focus` answers
        // over two lines and the second one carries the resume command. Showing
        // only one hid the part that mattered.
        const lines = output.trim().split("\n").filter((line) => line.trim());
        const stamp = `${new Date().toISOString()}  [key ${slot}]  `;
        process.stdout.write(
          lines.length
            ? `${stamp}${lines[0]}\n${lines.slice(1).map((line) => `${" ".repeat(stamp.length)}${line.trim()}\n`).join("")}`
            : `${stamp}no output\n`,
        );
      });
    });
    process.stdout.write("Pressing an Agent key navigates to its session.\n");
  }

  const push = async (nextRows, reason) => {
    const entries = slotsToThreadEntries(nextRows);
    const signature = JSON.stringify(entries);
    if (signature === JSON.stringify(lastApplied)) return;
    lastApplied = entries;
    await apply(reason);
    const summary = nextRows.map((row) => `${row.slot}:${row.state}`).join("  ");
    process.stdout.write(`${new Date().toISOString()}  [${reason}]  ${summary}\n`);
  };

  await push(rows, "initial");
  holdNote(flags);

  let queued = false;
  const watcher = watch(slotsPath, () => {
    if (queued) return;
    queued = true;
    setTimeout(async () => {
      queued = false;
      try {
        await push(await readSlots(), "slots.json");
      } catch (error) {
        process.stderr.write(`  ! re-read: ${error.message}\n`);
      }
    }, 100);
  });

  // Safety net: under --hold, reapply periodically whatever happens.
  const timer = flags.hold ? setInterval(() => void apply("safety-net"), HOLD_SAFETY_MS) : null;

  process.stdout.write(`Watching ${slotsPath}. Ctrl-C to quit.\n`);
  process.on("SIGINT", async () => {
    watcher.close();
    if (timer) clearInterval(timer);
    await session.close();
    process.exit(0);
  });
}

// --- listen ------------------------------------------------------------------

async function commandListen(flags) {
  const session = await openSession(flags);
  if (!session) return;
  session.onNotification(METHODS.notifyHid, (params) => {
    process.stdout.write(`${new Date().toISOString()}  key       ${JSON.stringify(params)}\n`);
  });
  session.onNotification(METHODS.notifyJoystick, (params) => {
    process.stdout.write(`${new Date().toISOString()}  joystick  ${JSON.stringify(params)}\n`);
  });
  process.stdout.write(`Listening for device notifications. Ctrl-C to quit.\n`);
  process.on("SIGINT", async () => {
    await session.close();
    process.exit(0);
  });
}

// --- off ---------------------------------------------------------------------

async function commandOff(flags) {
  const session = await openSession(flags);
  if (!session) return;
  try {
    await session.call(METHODS.threadsLighting, allOffParams());
    process.stdout.write(`✔ six slots turned off.\n`);
  } catch (error) {
    await session.close();
    return fail(`✘ write failed: ${error.message}`);
  }
  return session.close();
}

// --- entry point --------------------------------------------------------------

async function main(argv) {
  const [command, ...rest] = argv;
  const { flags, positional } = parseFlags(rest);

  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }
  try {
    if (command === "list") return await commandList(flags);
    if (command === "probe") return await commandProbe(flags);
    if (command === "set") return await commandSet(flags, positional);
    if (command === "watch") return await commandWatch(flags);
    if (command === "listen") return await commandListen(flags);
    if (command === "off") return await commandOff(flags);
    return fail(`Unknown command: ${command}\n\n${usage()}`);
  } catch (error) {
    if (error instanceof DeviceError) return fail(error.message);
    throw error;
  }
}

main(process.argv.slice(2)).catch((error) => {
  fail(error.stack ?? String(error));
});
