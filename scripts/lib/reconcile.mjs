// One pass of the companion, without its inputs and outputs: given what the
// journal and the rosters said, what do the six keys show now?
//
// Pure, so the order of operations — which is the delicate part — is tested
// without a running Claude.

import { mergeRosters, normalizeConfigDir } from "./config-dirs.mjs";
import { redactHome } from "./input-export.mjs";
import { applyHookEvent, applyRoster } from "./thread-slots.mjs";

/**
 * Adds the configuration directories named by hook records to those already
 * known. The hooks record the directory they ran under: that is how a profile
 * the companion was not started in gets discovered.
 *
 * @param {string[]} known Directories learnt on earlier passes.
 * @param {object[]} events Hook records read from the journal.
 * @returns {string[]} Known directories first, then the newly learnt ones. The
 * default directory is never listed: it is always queried.
 */
export function learnConfigDirs(known, events) {
  const learnt = new Set(known);
  for (const event of events) {
    const dir = normalizeConfigDir(event.configDir);
    if (typeof dir === "string") learnt.add(dir);
  }
  return [...learnt];
}

/**
 * Applies one pass of rosters and hook records to a snapshot.
 *
 * The roster goes first and the hooks after: the roster opens the slot, the
 * hooks then act on it — including the one held pending before the session
 * appeared.
 *
 * @param {object} input What this pass read.
 * @param {object} input.snapshot Current slot snapshot.
 * @param {object[]} input.events Hook records since the previous pass, oldest first.
 * @param {Array<{configDir: string|null, rows?: object[], error?: string}>} input.rosters One result per queried directory.
 * @param {number} input.now Timestamp of the pass.
 * @param {(rows: object[]) => object[]} [input.enrich] Adds `tty` and `terminalApp` to roster rows.
 * @returns {{snapshot: object, changed: boolean, notes: string[]}} Next
 * snapshot, whether a key changed, and messages worth showing.
 * @throws {Error} When no directory at all could be read: with nothing to go
 * by, declaring every session closed would be a guess.
 */
export function reconcileSnapshot({ snapshot, events, rosters, now, enrich = (rows) => rows }) {
  const merged = mergeRosters(rosters, snapshot.slots);
  if (rosters.length > 0 && merged.errors.length === rosters.length) {
    throw new Error(`No roster could be read. ${merged.errors.join(" · ")}`);
  }

  const roster = applyRoster(snapshot, enrich(merged.rows), now);
  let next = roster.snapshot;
  let changed = roster.changed;
  for (const event of events) {
    const applied = applyHookEvent(next, event, event.ts ?? now);
    next = applied.snapshot;
    changed = changed || applied.changed;
  }

  return {
    snapshot: next,
    changed,
    notes: [...roster.notes, ...merged.errors.map((message) => `Roster unavailable for ${redactHome(message)}`)],
  };
}
