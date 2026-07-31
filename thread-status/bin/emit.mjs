#!/usr/bin/env node

// Hook emitter. Reads the event on stdin, attaches the process identity taken
// from the environment, and appends one NDJSON line to the journal.
//
// Three constraints dictate the shape of this file:
//
//   1. It must write nothing to stdout. The output of a UserPromptSubmit hook is
//      injected into the conversation context: a chatty journal would end up in
//      the user's prompt.
//   2. It must always exit with code 0. A failing hook raises an error in the
//      session, over a status light that is not essential to anything.
//   3. It must depend on nothing. The plugin is distributable on its own,
//      without the repository: journal path resolution is therefore duplicated
//      here and in scripts/thread-status.mjs, its only other reader.

import { appendFileSync, mkdirSync, readFileSync, renameSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";

// The path contract, duplicated: see constraint 3.
const STATE_DIR =
  process.env.CLAUDE_THREAD_STATUS_DIR || path.join(os.homedir(), ".claude", "thread-status");
const JOURNAL = path.join(STATE_DIR, "events.ndjson");
const JOURNAL_MAX_BYTES = 4 * 1024 * 1024;

// CLAUDE_PLUGIN_DATA is not used as the state root: its value differs with how
// the plugin is loaded (`…/data/<name>-inline` under --plugin-dir,
// `…/data/<name>` once installed), which would lose the slots between
// development and real use.

function rotate() {
  try {
    if (statSync(JOURNAL).size > JOURNAL_MAX_BYTES) renameSync(JOURNAL, `${JOURNAL}.1`);
  } catch {
    // Journal missing, or rotation impossible: the append below recreates it.
  }
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return;
  }

  const record = {
    ts: Date.now(),
    event: payload.hook_event_name ?? null,
    sessionId: payload.session_id ?? process.env.CLAUDE_CODE_SESSION_ID ?? null,
    cwd: payload.cwd ?? null,
    pid: Number.parseInt(process.env.CLAUDE_PID ?? "", 10) || null,
    entrypoint: process.env.CLAUDE_CODE_ENTRYPOINT ?? null,
    hostSessionId: process.env.CLAUDE_CODE_HOST_SESSION_ID ?? null,
  };

  // Only the fields that carry a transition are kept. No message content, no
  // transcript path, no tool input: the journal has to stay publishable as is.
  if (payload.notification_type) record.notificationType = payload.notification_type;
  if (payload.stop_reason) record.stopReason = payload.stop_reason;
  if (payload.reason) record.reason = payload.reason;
  if (payload.source) record.source = payload.source;

  if (!record.event || !record.sessionId) return;

  rotate();
  mkdirSync(STATE_DIR, { recursive: true });
  appendFileSync(JOURNAL, `${JSON.stringify(record)}\n`);
}

try {
  main();
} catch {
  // Constraint 2: no error ever surfaces in the session.
}
process.exit(0);
