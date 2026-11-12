// Where the companion keeps its state. One place for the two scripts that read
// and write it; thread-status/bin/emit.mjs repeats the rule on purpose, since
// the hook must stay dependency-free.

import os from "node:os";
import path from "node:path";

/**
 * Resolves the state directory and the two files in it.
 *
 * @param {Record<string, string|undefined>} [env] Process environment; `CLAUDE_THREAD_STATUS_DIR` overrides the default.
 * @param {string} [home] Home directory.
 * @returns {{stateDir: string, journalPath: string, slotsPath: string}}
 * The directory, the hook journal the plugin appends to, and the slot state the
 * lighting bridge consumes.
 */
export function statePaths(env = process.env, home = os.homedir()) {
  const stateDir = env.CLAUDE_THREAD_STATUS_DIR || path.join(home, ".claude", "thread-status");
  return {
    stateDir,
    journalPath: path.join(stateDir, "events.ndjson"),
    slotsPath: path.join(stateDir, "slots.json"),
  };
}
