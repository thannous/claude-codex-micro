// Persistence of the companion: the hook journal it reads and the slot state
// it publishes.
//
// `slots.json` is the seam between the two watchers. scripts/thread-status.mjs
// writes it, scripts/lighting.mjs follows it and pushes colours to the keyboard.

import { promises as fs } from "node:fs";
import { redactHome } from "./input-export.mjs";
import { statePaths } from "./state-paths.mjs";
import { emptySnapshot, normalizeSnapshot, slotView } from "./thread-slots.mjs";

// Fingerprint of what a consumer actually observes. Rewritten on every tick,
// `slots.json` would make the lighting bridge push HID reports continuously
// while nothing moved. So the slots are compared before writing.
//
// `pending`, `dropped`, `overflow`, the journal cursor and the timestamp are
// left out: they move without the display changing. The cursor is therefore
// only persisted on a real change, and a restart replays at worst the tail of
// events from that point — events which, by construction, had changed nothing.
function fingerprint(snapshot, configDirs) {
  return JSON.stringify([snapshot.slots, configDirs]);
}

/**
 * Opens the state directory.
 *
 * @param {{stateDir: string, journalPath: string, slotsPath: string}} [paths] Locations, from `statePaths`.
 * @returns {{
 *   paths: {stateDir: string, journalPath: string, slotsPath: string},
 *   prepare: () => Promise<void>,
 *   load: () => Promise<{snapshot: object, journalOffset: number, configDirs: string[]}>,
 *   save: (snapshot: object, journalOffset: number, configDirs?: string[]) => Promise<boolean>,
 *   readJournalSince: (offset: number) => Promise<{events: object[], offset: number}>,
 * }} Store bound to those paths. `save` resolves to false when nothing a
 * consumer observes has changed since the last `load` or `save`, and then
 * writes nothing.
 */
export function createSlotStore(paths = statePaths()) {
  let lastPublished = null;

  // Creates the directory and an empty journal, so the journal can be watched
  // before the first hook fires.
  const prepare = async () => {
    await fs.mkdir(paths.stateDir, { recursive: true });
    await fs.appendFile(paths.journalPath, "");
  };

  // An unreadable or missing file is a first start, not an error.
  const load = async () => {
    try {
      const raw = JSON.parse(await fs.readFile(paths.slotsPath, "utf8"));
      const snapshot = normalizeSnapshot(raw.snapshot);
      const configDirs = Array.isArray(raw.configDirs)
        ? raw.configDirs.filter((dir) => typeof dir === "string")
        : [];
      lastPublished = fingerprint(snapshot, configDirs);
      return {
        snapshot,
        journalOffset: Number.isInteger(raw.journalOffset) ? raw.journalOffset : 0,
        configDirs,
      };
    } catch {
      return { snapshot: emptySnapshot(), journalOffset: 0, configDirs: [] };
    }
  };

  const save = async (snapshot, journalOffset, configDirs = []) => {
    const next = fingerprint(snapshot, configDirs);
    if (next === lastPublished) return false;

    await fs.mkdir(paths.stateDir, { recursive: true });
    const payload = {
      updatedAt: new Date().toISOString(),
      journalOffset,
      // The six rows the lighting bridge reads. Paths are redacted: this file
      // is the one people paste into bug reports.
      slots: slotView(snapshot).map(({ slot, control, state, color, entry }) => ({
        slot,
        control,
        state,
        color,
        sessionId: entry?.sessionId ?? null,
        name: entry?.name ?? null,
        cwd: entry?.cwd ? redactHome(entry.cwd) : null,
      })),
      // Configuration directories learnt from the hook journal. Persisted
      // because the journal is read once: without this, a restart would forget
      // a profile until one of its sessions emits again.
      configDirs,
      snapshot,
    };
    await fs.writeFile(paths.slotsPath, `${JSON.stringify(payload, null, 2)}\n`);
    lastPublished = next;
    return true;
  };

  // Reads the lines appended since the last pass. A size below the offset
  // signals a journal rotation: start over from zero rather than read from the
  // middle of a record.
  const readJournalSince = async (offset) => {
    let size = 0;
    try {
      size = (await fs.stat(paths.journalPath)).size;
    } catch {
      return { events: [], offset: 0 };
    }
    if (size < offset) offset = 0;
    if (size === offset) return { events: [], offset };

    const handle = await fs.open(paths.journalPath, "r");
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
  };

  return { paths, prepare, load, save, readJournalSince };
}
