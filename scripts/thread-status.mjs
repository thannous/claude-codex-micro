#!/usr/bin/env node

// Local companion for the six Agent keys. Reconciles two official sources:
//
//   - `claude agents --json` for the roster of live sessions, asked once per
//     Claude configuration directory, since each only lists its own;
//   - the NDJSON journal written by the thread-status plugin for their states.
//
// It writes nothing to the device. Its output is `slots.json`, the seam the
// DeviceAdapter consumes: this companion stops at that file and at the display,
// and scripts/lighting.mjs is what pushes colours to the keyboard.
//
// See docs/research/thread-status-feasibility.md for what is measured and what
// is still open.

import { spawnSync } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { resolveClaudeBinary } from "./lib/claude-binary.mjs";
import { collectConfigDirs, mergeRosters } from "./lib/config-dirs.mjs";
import { redactHome } from "./lib/input-export.mjs";
import { learnConfigDirs, reconcileSnapshot } from "./lib/reconcile.mjs";
import { enrichRoster, readRosters } from "./lib/roster-source.mjs";
import { createRunLoop } from "./lib/run-loop.mjs";
import { ROSTER_STATUSES } from "./lib/session-machine.mjs";
import { createSlotStore } from "./lib/slot-store.mjs";
import { focusTerminal } from "./lib/terminals.mjs";
import { SLOT_COUNT, STATES, resolveNavigation, slotView } from "./lib/thread-slots.mjs";

const store = createSlotStore();
const { stateDir, journalPath, slotsPath } = store.paths;

const DEFAULT_INTERVAL_MS = 2000;

function usage() {
  return `Usage: node scripts/thread-status.mjs <command>

Commands
  watch [--interval=ms]   reconcile continuously and write slots.json
  status [--json]         show the current state of the six slots
  focus <1-${SLOT_COUNT}>            go to the session on that slot
  doctor                  check prerequisites and sources

Environment
  CLAUDE_THREAD_STATUS_DIR          state directory (default ~/.claude/thread-status)
  CLAUDE_THREAD_STATUS_CONFIG_DIRS  extra Claude configuration directories to
                                    list sessions from, separated by "${path.delimiter}". The
                                    default one, CLAUDE_CONFIG_DIR and those seen
                                    in the hook journal are always included.
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

// --- one pass -----------------------------------------------------------------

// Reads the journal and the rosters, and hands them to the pure reconciliation.
// Only what the journal taught is persisted as `configDirs`: directories named
// through the environment are read again from the environment on every start.
async function reconcile(binary, state) {
  const journal = await store.readJournalSince(state.journalOffset);
  const configDirs = learnConfigDirs(state.configDirs ?? [], journal.events);
  const result = reconcileSnapshot({
    snapshot: state.snapshot,
    events: journal.events,
    rosters: readRosters(binary, collectConfigDirs({ known: configDirs })),
    now: Date.now(),
    enrich: enrichRoster,
  });
  return { ...result, journalOffset: journal.offset, configDirs };
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

async function focus(slotNumber) {
  const state = await store.load();
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
      // A session only resumes under the configuration directory it ran in.
      const where = target.cwd ? redactHome(target.cwd) : ".";
      const profile = entry.configDir ? `CLAUDE_CONFIG_DIR=${redactHome(entry.configDir)} ` : "";
      process.stdout.write(
        `Slot ${slotNumber}: session closed. Resume it with:\n  cd ${where} && ${profile}claude --resume ${target.sessionId}\n`,
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
  const state = await store.load();
  const result = await reconcile(binary, state);
  await store.save(result.snapshot, result.journalOffset, result.configDirs);

  if (asJson) {
    process.stdout.write(`${JSON.stringify(slotView(result.snapshot), null, 2)}\n`);
    return;
  }
  process.stdout.write(`${renderTable(result.snapshot)}\n`);
  for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
  if (result.snapshot.overflow > 0) {
    process.stdout.write(
      `  ! ${result.snapshot.overflow} live session(s) without a key: ${SLOT_COUNT} Agent keys, no more. ` +
        "A working session takes the key of the oldest idle one.\n",
    );
  }
}

async function commandWatch(binary, intervalMs) {
  let state = await store.load();

  // The poll catches missed hooks, the journal watch gives the latency. Both
  // ask the same loop for a pass: one runs at a time, and a hook written while
  // a pass is under way gets its own pass right after instead of waiting for
  // the next poll.
  const loop = createRunLoop(
    async () => {
      const result = await reconcile(binary, state);
      state = {
        snapshot: result.snapshot,
        journalOffset: result.journalOffset,
        configDirs: result.configDirs,
      };
      // The render follows the write, not `result.changed`: only a change that
      // was actually published deserves a line on screen, or an HID push.
      if (await store.save(result.snapshot, result.journalOffset, result.configDirs)) {
        process.stdout.write(`\n${new Date().toISOString()}\n${renderTable(result.snapshot)}\n`);
        for (const note of result.notes) process.stdout.write(`  ! ${note}\n`);
      }
    },
    { onError: (error) => process.stderr.write(`  ! ${error.message}\n`) },
  );

  await store.prepare();
  const timer = setInterval(loop.request, intervalMs);
  const watcher = watch(journalPath, loop.request);
  process.on("SIGINT", () => {
    clearInterval(timer);
    watcher.close();
    process.exit(0);
  });

  process.stdout.write(`Journal: ${redactHome(journalPath)}\nOutput:  ${redactHome(slotsPath)}\n`);
  loop.request();
}

// The roster's `status` is what keeps a key truthful when a hook is missing.
// Three outcomes are worth telling apart: nothing to read it from, a Claude Code
// that does not publish it, and a value this code has never seen.
function rosterStatusCheck(roster) {
  if (roster.length === 0) return [true, "roster status: no live session to read it from"];
  const statuses = [...new Set(roster.map((row) => row.status).filter(Boolean))];
  if (statuses.length === 0) {
    return [false, "roster status: absent — this Claude Code does not publish it; states come from the hooks alone"];
  }
  const unknown = statuses.filter((status) => !ROSTER_STATUSES.includes(status));
  if (unknown.length > 0) {
    return [false, `roster status: unrecognised value(s) ${unknown.join(", ")} — ignored, please report them`];
  }
  return [true, `roster status: ${statuses.join(", ")}`];
}

async function commandDoctor(binary) {
  const checks = [];
  checks.push([Boolean(binary), `claude binary: ${binary ? redactHome(binary) : "not found"}`]);

  // Each configuration directory lists only its own sessions: report them one
  // by one, so a profile that is silently missing is visible here.
  let roster = [];
  if (binary) {
    const saved = await store.load();
    const queried = collectConfigDirs({ known: saved.configDirs });
    const results = readRosters(binary, queried);
    roster = mergeRosters(results).rows;
    for (const result of results) {
      const label = result.configDir ? redactHome(result.configDir) : "default configuration";
      checks.push(
        result.rows
          ? [true, `claude agents --json (${label}): ${result.rows.length} live session(s)`]
          : [false, `claude agents --json (${label}): ${result.error}`],
      );
    }
    checks.push(rosterStatusCheck(roster));
  }

  try {
    await store.prepare();
    checks.push([true, `state directory reachable: ${redactHome(stateDir)}`]);
  } catch (error) {
    checks.push([false, `state directory: ${error.message}`]);
  }

  const journal = await store.readJournalSince(0);
  const last = journal.events.at(-1);
  checks.push([
    journal.events.length > 0,
    journal.events.length > 0
      ? `journal: ${journal.events.length} event(s), last ${last.event} ${Math.round((Date.now() - last.ts) / 1000)}s ago`
      : "journal empty: no hook event recorded. Explicit roster statuses still show running and permission waits; " +
        "the plugin adds the done/idle distinction. Start a new interactive session after installing it.",
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
