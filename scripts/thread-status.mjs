#!/usr/bin/env node

// Local companion for the six Agent keys. Reconciles two official sources:
//
//   - `claude agents --json` for the roster of live sessions;
//   - the NDJSON journal written by the thread-status plugin for their states.
//
// It writes nothing to the device. Its output is `slots.json`, the seam the
// DeviceAdapter consumes: this companion stops at that file and at the display,
// and scripts/lighting.mjs is what pushes colours to the keyboard.
//
// See docs/research/thread-status-feasibility.md for what is measured and what
// is still open.

import { spawnSync } from "node:child_process";
import { existsSync, promises as fs, readdirSync, watch } from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactHome } from "./lib/input-export.mjs";
import {
  SLOT_COUNT,
  STATES,
  applyHookEvent,
  applyRoster,
  emptySnapshot,
  normalizeSnapshot,
  resolveNavigation,
  slotView,
  ttyDevice,
} from "./lib/thread-slots.mjs";

// Path contract shared with thread-status/bin/emit.mjs, which deliberately
// stays dependency-free.
const stateDir =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const journalPath = path.join(stateDir, "events.ndjson");
const snapshotPath = path.join(stateDir, "slots.json");

const DEFAULT_INTERVAL_MS = 2000;

// Host terminal detected from the executable name reported by `ps`. Only iTerm2
// and Terminal are scriptable here; the others are named so the error message is
// actionable instead of generic.
const TERMINAL_APPS = [
  { basename: "iTerm2", name: "iTerm2", driver: "iterm" },
  { basename: "Terminal", name: "Terminal", driver: "terminal" },
  { basename: "ghostty", name: "Ghostty", driver: null },
  { basename: "wezterm-gui", name: "WezTerm", driver: null },
  { basename: "alacritty", name: "Alacritty", driver: null },
  { basename: "kitty", name: "kitty", driver: null },
  { basename: "warp", name: "Warp", driver: null },
  { basename: "hyper", name: "Hyper", driver: null },
  { basename: "tmux", name: "tmux", driver: null },
];

function usage() {
  return `Usage: node scripts/thread-status.mjs <command>

Commands
  watch [--interval=ms]   reconcile continuously and write slots.json
  status [--json]         show the current state of the six slots
  focus <1-${SLOT_COUNT}>            go to the session on that slot
  doctor                  check prerequisites and sources

Environment
  CLAUDE_THREAD_STATUS_DIR  state directory (default ~/.claude/thread-status)
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

// --- sources -----------------------------------------------------------------

function resolveClaudeBinary() {
  const candidates = [];
  if (process.env.CLAUDE_CODE_EXECPATH) candidates.push(process.env.CLAUDE_CODE_EXECPATH);

  const onPath = spawnSync("/bin/sh", ["-c", "command -v claude"], { encoding: "utf8" });
  if (onPath.status === 0) {
    const resolved = onPath.stdout.trim().split("\n")[0];
    if (resolved) candidates.push(resolved);
  }

  const bundled = path.join(os.homedir(), "Library", "Application Support", "Claude", "claude-code");
  try {
    for (const version of readdirSync(bundled).sort().reverse()) {
      candidates.push(path.join(bundled, version, "claude.app", "Contents", "MacOS", "claude"));
    }
  } catch {
    // Not bundled with Claude Desktop: the other candidates are enough.
  }

  return candidates.find((candidate) => candidate && existsSync(candidate)) ?? null;
}

function readRoster(binary) {
  const result = spawnSync(binary, ["agents", "--json"], { encoding: "utf8", timeout: 15000 });
  if (result.status !== 0) {
    throw new Error(`\`claude agents --json\` failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed)) throw new Error("`claude agents --json` did not return an array.");
  return parsed;
}

// One single read of the process table: the session's tty and, by walking up
// the parents, the terminal hosting it.
function processTable() {
  const result = spawnSync("ps", ["-Ao", "pid=,ppid=,tty=,comm="], { encoding: "utf8" });
  const table = new Map();
  if (result.status !== 0) return table;
  for (const line of result.stdout.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;
    table.set(Number(match[1]), { ppid: Number(match[2]), tty: match[3], comm: match[4].trim() });
  }
  return table;
}

function terminalFor(table, pid) {
  let current = table.get(pid);
  for (let depth = 0; current && depth < 10; depth += 1) {
    const basename = path.basename(current.comm).toLowerCase();
    const known = TERMINAL_APPS.find((app) => basename === app.basename.toLowerCase());
    if (known) return known;
    current = table.get(current.ppid);
  }
  return null;
}

function enrichRoster(roster) {
  const table = processTable();
  return roster.map((row) => {
    const own = table.get(row.pid);
    const terminal = terminalFor(table, row.pid);
    return {
      ...row,
      tty: ttyDevice(own?.tty) ?? null,
      terminalApp: terminal?.name ?? null,
    };
  });
}

// --- persistent state --------------------------------------------------------

// Fingerprint of what a consumer actually observes. `slots.json` is the
// DeviceAdapter's seam: rewritten on every tick, a `watch` following it would
// push HID reports continuously while nothing moved. So the six entries are
// compared before writing.
//
// `pending`, `dropped`, `overflow`, `journalOffset` and the timestamp are left
// out of the fingerprint: they move without the display changing. The journal
// cursor is therefore only persisted on a real change, and a restart replays at
// worst the tail of events from that point — events which, by construction, had
// changed nothing.
function publishedFingerprint(snapshot) {
  return JSON.stringify(snapshot.slots);
}

let lastPublished = null;

async function loadState() {
  try {
    const raw = JSON.parse(await fs.readFile(snapshotPath, "utf8"));
    const snapshot = normalizeSnapshot(raw.snapshot);
    lastPublished = publishedFingerprint(snapshot);
    return {
      snapshot,
      journalOffset: Number.isInteger(raw.journalOffset) ? raw.journalOffset : 0,
    };
  } catch {
    return { snapshot: emptySnapshot(), journalOffset: 0 };
  }
}

async function saveState(snapshot, journalOffset) {
  const fingerprint = publishedFingerprint(snapshot);
  if (fingerprint === lastPublished) return false;

  await fs.mkdir(stateDir, { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    journalOffset,
    slots: slotView(snapshot).map(({ slot, control, state, color, entry }) => ({
      slot,
      control,
      state,
      color,
      sessionId: entry?.sessionId ?? null,
      name: entry?.name ?? null,
      cwd: entry?.cwd ? redactHome(entry.cwd) : null,
    })),
    snapshot,
  };
  await fs.writeFile(snapshotPath, `${JSON.stringify(payload, null, 2)}\n`);
  lastPublished = fingerprint;
  return true;
}

// Reads the lines appended since the last pass. A size below the offset signals
// a journal rotation: start over from zero rather than read from the middle of
// a record.
async function readJournalSince(offset) {
  let size = 0;
  try {
    size = (await fs.stat(journalPath)).size;
  } catch {
    return { events: [], offset: 0 };
  }
  if (size < offset) offset = 0;
  if (size === offset) return { events: [], offset };

  const handle = await fs.open(journalPath, "r");
  try {
    const length = size - offset;
    const buffer = Buffer.alloc(length);
    await handle.read(buffer, 0, length, offset);
    const text = buffer.toString("utf8");
    // A trailing incomplete line is left for the next pass.
    const complete = text.endsWith("\n") ? text : text.slice(0, text.lastIndexOf("\n") + 1);
    const events = [];
    for (const line of complete.split("\n")) {
      if (!line.trim()) continue;
      try {
        events.push(JSON.parse(line));
      } catch {
        // Line truncated by a concurrent rotation: ignored.
      }
    }
    return { events, offset: offset + Buffer.byteLength(complete, "utf8") };
  } finally {
    await handle.close();
  }
}

async function reconcile(binary, state) {
  const now = Date.now();
  let snapshot = state.snapshot;

  const journal = await readJournalSince(state.journalOffset);
  const roster = applyRoster(snapshot, enrichRoster(readRoster(binary)), now);
  snapshot = roster.snapshot;
  let changed = roster.changed;

  // Hooks after the roster: the roster opens the slot, the hooks set the state
  // on it, including the one held pending before the session appeared.
  for (const event of journal.events) {
    const applied = applyHookEvent(snapshot, event, event.ts ?? now);
    snapshot = applied.snapshot;
    changed = changed || applied.changed;
  }

  return { snapshot, journalOffset: journal.offset, changed, notes: roster.notes };
}

// --- display -----------------------------------------------------------------

const STATE_LABELS = {
  [STATES.free]: "free",
  [STATES.idle]: "idle",
  [STATES.running]: "running",
  [STATES.blocked]: "needs you",
  [STATES.done]: "done",
  [STATES.ended]: "closed",
};

function dot(color) {
  if (!color || !process.stdout.isTTY) return "•";
  const [r, g, b] = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  return `[38;2;${r};${g};${b}m●[0m`;
}

function renderTable(snapshot) {
  const lines = [];
  for (const row of slotView(snapshot)) {
    const label = (STATE_LABELS[row.state] ?? row.state).padEnd(12);
    const target = row.entry ? resolveNavigation(row.entry).kind : "empty";
    lines.push(
      [
        ` ${row.slot}`,
        row.control.padEnd(7),
        dot(row.color),
        label,
        (row.color ?? "—").padEnd(8),
        `[${target}]`.padEnd(14),
        (row.entry?.name ?? "").padEnd(24),
        row.entry?.cwd ? redactHome(row.entry.cwd) : "",
      ].join(" ").trimEnd(),
    );
  }
  return lines.join("\n");
}

// --- navigation --------------------------------------------------------------

function runAppleScript(script) {
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8", timeout: 15000 });
  const output = (result.stdout || result.stderr || "").trim();
  // An AppleEvent that times out — `-1712`, or `osascript` killed by the
  // timeout — almost always means Automation consent was not granted to the
  // calling shell: macOS does not always show the prompt and simply lets the
  // event expire. Confusing it with "window not found" sends you looking at the
  // terminal, which is not where the problem is.
  if (result.error?.code === "ETIMEDOUT" || result.signal || output.includes("-1712")) {
    return { ok: false, reason: "automation-consent", output };
  }
  return { ok: result.status === 0, output };
}

// The tty comes from `ps`: revalidate it before interpolation rather than trust
// where it came from.
function focusTerminal(target) {
  if (!/^\/dev\/tty[a-z0-9.]+$/i.test(target.tty)) {
    return { ok: false, output: `unexpected terminal path: ${target.tty}` };
  }
  const app = TERMINAL_APPS.find((candidate) => candidate.name === target.app);
  if (!app?.driver) {
    return {
      ok: false,
      output: `terminal not scriptable${target.app ? `: ${target.app}` : ""}. Slot is on ${target.tty}.`,
    };
  }

  // The order of operations decides the outcome when windows overlap.
  // `activate` first raises the window that is already frontmost, and
  // reordering afterwards does not hold: the target stays under the stack. So
  // select the tab, bring its window to the front of the z-order, and only
  // activate the app last. Side benefit: a `tty` that cannot be found no longer
  // steals focus for nothing, since we return without ever activating.
  if (app.driver === "iterm") {
    return runAppleScript(`tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${target.tty}" then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "not-found"`);
  }

  return runAppleScript(`tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "${target.tty}" then
        set selected tab of w to t
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "not-found"`);
}

async function focus(slotNumber) {
  const state = await loadState();
  const index = slotNumber - 1;
  const entry = state.snapshot.slots[index];
  const target = resolveNavigation(entry);

  switch (target.kind) {
    case "empty":
      return fail(`Slot ${slotNumber}: free.`);
    case "terminal": {
      const result = focusTerminal(target);
      if (result.reason === "automation-consent") {
        return fail(
          `Slot ${slotNumber}: ${target.app} did not answer the AppleEvent.\n` +
            "  This is Automation consent, not the terminal. Grant\n" +
            `  System Settings > Privacy & Security > Automation > ${target.app},\n` +
            "  for the terminal this command runs from.",
        );
      }
      if (!result.ok || result.output === "not-found") {
        return fail(`Slot ${slotNumber}: ${result.output || "window not found"}.`);
      }
      process.stdout.write(`Slot ${slotNumber}: ${target.app} focused on ${target.tty}.\n`);
      return undefined;
    }
    case "resume": {
      // The session is closed: we do not resume it on the user's behalf, we hand
      // them the exact command. Resuming a live session from a second terminal
      // would interleave the two transcripts.
      const where = target.cwd ? redactHome(target.cwd) : ".";
      process.stdout.write(
        `Slot ${slotNumber}: session closed. Resume it with:\n  cd ${where} && claude --resume ${target.sessionId}\n`,
      );
      return undefined;
    }
    case "desktop": {
      // `claude://resume?session=<uuid>` opens the session by its id. Like
      // `open -b`, going through the URL handler avoids AppleScript and
      // therefore needs no Automation consent.
      //
      // The handler reports nothing back: `open` exits 0 as soon as the URL is
      // delivered. A session whose transcript has left the disk fails on the
      // application side, with nothing surfacing here.
      const opened = spawnSync("open", [target.url], { encoding: "utf8", timeout: 10000 });
      if (opened.status !== 0) {
        return fail(
          `Slot ${slotNumber}: could not open ${target.url}: ${(opened.stderr || "").trim()}`,
        );
      }
      process.stdout.write(
        `Slot ${slotNumber}: session ${target.sessionId.slice(0, 8)} requested from Claude Desktop.\n`,
      );
      return undefined;
    }
    default: {
      // Hosted session whose id is not a UUID: `claude://resume` would reject
      // it. Unable to select the right session, at least bring the application
      // to the front.
      //
      // `open -b` avoids AppleScript, so it needs no Automation consent.
      const activated = spawnSync("open", ["-b", "com.anthropic.claudefordesktop"], {
        encoding: "utf8",
        timeout: 10000,
      });
      if (activated.status !== 0) {
        return fail(
          `Slot ${slotNumber}: ${target.reason}\n` +
            `  session ${target.sessionId}\n` +
            `  Claude Desktop could not be activated: ${(activated.stderr || "").trim()}`,
        );
      }
      process.stdout.write(
        `Slot ${slotNumber}: Claude Desktop activated. Session ${target.sessionId.slice(0, 8)} ` +
          "cannot be selected: no route addresses it.\n",
      );
      return undefined;
    }
  }
}

// --- commands ----------------------------------------------------------------

async function commandStatus(binary, asJson) {
  const state = await loadState();
  const result = await reconcile(binary, state);
  await saveState(result.snapshot, result.journalOffset);

  if (asJson) {
    process.stdout.write(`${JSON.stringify(slotView(result.snapshot), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderTable(result.snapshot)}\n`);
  for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
  if (result.snapshot.overflow > 0) {
    process.stdout.write(
      `  ! ${result.snapshot.overflow} session(s) left without a slot since startup: ${SLOT_COUNT} Agent keys, no more.\n`,
    );
  }
}

async function commandWatch(binary, intervalMs) {
  let state = await loadState();
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await reconcile(binary, state);
      state = { snapshot: result.snapshot, journalOffset: result.journalOffset };
      // The render follows the write, not `result.changed`: only a change that
      // was actually published deserves a line on screen, or an HID push.
      if (await saveState(result.snapshot, result.journalOffset)) {
        process.stdout.write(`\n${new Date().toISOString()}\n${renderTable(result.snapshot)}\n`);
        for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
      }
    } catch (error) {
      process.stderr.write(`  ! ${error.message}\n`);
    } finally {
      running = false;
    }
  };

  await fs.mkdir(stateDir, { recursive: true });
  await fs.appendFile(journalPath, "");
  // The poll catches missed hooks, the watch gives the latency.
  const timer = setInterval(tick, intervalMs);
  const watcher = watch(journalPath, () => void tick());
  process.on("SIGINT", () => {
    clearInterval(timer);
    watcher.close();
    process.exit(0);
  });

  process.stdout.write(`Journal: ${redactHome(journalPath)}\nOutput:  ${redactHome(snapshotPath)}\n`);
  await tick();
}

async function commandDoctor(binary) {
  const checks = [];
  checks.push([Boolean(binary), `claude binary: ${binary ? redactHome(binary) : "not found"}`]);

  let roster = [];
  if (binary) {
    try {
      roster = readRoster(binary);
      checks.push([true, `claude agents --json: ${roster.length} live session(s)`]);
    } catch (error) {
      checks.push([false, `claude agents --json: ${error.message}`]);
    }
  }

  try {
    await fs.mkdir(stateDir, { recursive: true });
    await fs.access(stateDir);
    checks.push([true, `state directory reachable: ${redactHome(stateDir)}`]);
  } catch (error) {
    checks.push([false, `state directory: ${error.message}`]);
  }

  const journal = await readJournalSince(0);
  const last = journal.events.at(-1);
  checks.push([
    journal.events.length > 0,
    journal.events.length > 0
      ? `journal: ${journal.events.length} event(s), last ${last.event} ${Math.round((Date.now() - last.ts) / 1000)}s ago`
      : "journal empty: the plugin has never emitted. Load thread-status/ then run a turn.",
  ]);

  const withTty = enrichRoster(roster).filter((row) => row.tty);
  checks.push([
    true,
    `navigation: ${withTty.length}/${roster.length} session(s) in an identifiable terminal` +
      (withTty.length < roster.length
        ? " — the others are hosted by Claude Desktop or an IDE, reached through claude://resume"
        : ""),
  ]);

  for (const [ok, message] of checks) process.stdout.write(`  ${ok ? "✔" : "✘"} ${message}\n`);
  if (checks.some(([ok]) => !ok)) process.exitCode = 1;
}

// --- entry point --------------------------------------------------------------

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return;
  }

  if (command === "focus") {
    const slotNumber = Number.parseInt(rest[0] ?? "", 10);
    if (!Number.isInteger(slotNumber) || slotNumber < 1 || slotNumber > SLOT_COUNT) {
      return fail(`Expected a slot between 1 and ${SLOT_COUNT}.`);
    }
    return focus(slotNumber);
  }

  const binary = resolveClaudeBinary();
  if (command === "doctor") return commandDoctor(binary);
  if (!binary) return fail("`claude` binary not found. See `doctor`.");

  if (command === "status") return commandStatus(binary, rest.includes("--json"));
  if (command === "watch") {
    const flag = rest.find((argument) => argument.startsWith("--interval="));
    const parsed = flag ? Number.parseInt(flag.split("=")[1], 10) : DEFAULT_INTERVAL_MS;
    return commandWatch(binary, Number.isInteger(parsed) && parsed >= 250 ? parsed : DEFAULT_INTERVAL_MS);
  }

  return fail(`Unknown command: ${command}\n\n${usage()}`);
}

main(process.argv.slice(2)).catch((error) => {
  fail(error.stack ?? String(error));
});
