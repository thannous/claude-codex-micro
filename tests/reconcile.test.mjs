import assert from "node:assert/strict";
import os from "node:os";
import test from "node:test";
import { learnConfigDirs, reconcileSnapshot } from "../scripts/lib/reconcile.mjs";
import { STATES, emptySnapshot } from "../scripts/lib/thread-slots.mjs";

const row = (sessionId, status) => ({ sessionId, status });
const stateOf = (snapshot, sessionId) => snapshot.slots.find((entry) => entry?.sessionId === sessionId)?.state;

test("profiles are learnt from the hook journal, once each, and never the default one", () => {
  const events = [
    { event: "Stop", configDir: "/profiles/work" },
    { event: "Stop", configDir: null },
    { event: "Stop", configDir: `${os.homedir()}/.claude` },
    { event: "Stop", configDir: "/profiles/work" },
    { event: "Stop", configDir: "relative/path" },
    { event: "Stop" },
  ];
  assert.deepEqual(learnConfigDirs(["/profiles/home"], events), ["/profiles/home", "/profiles/work"]);
  assert.deepEqual(learnConfigDirs([], []), []);
});

// The order is the delicate part: the roster opens the slot, and only then can
// a hook act on it.
test("in one pass the roster opens the slot and the hooks of that pass apply to it", () => {
  const result = reconcileSnapshot({
    snapshot: emptySnapshot(),
    events: [{ event: "UserPromptSubmit", sessionId: "session-1", ts: 5 }],
    rosters: [{ configDir: null, rows: [row("session-1")] }],
    now: 10,
  });
  assert.equal(result.changed, true);
  assert.equal(stateOf(result.snapshot, "session-1"), STATES.running);
  assert.equal(result.snapshot.slots[0].updatedAt, 5, "a hook is dated by its own timestamp");
  assert.deepEqual(result.notes, []);
});

test("rows are enriched before they reach the slots, and tagged with their profile", () => {
  const result = reconcileSnapshot({
    snapshot: emptySnapshot(),
    events: [],
    rosters: [
      { configDir: null, rows: [row("session-1", "idle")] },
      { configDir: "/profiles/work", rows: [row("session-2", "busy")] },
    ],
    now: 1,
    enrich: (rows) => rows.map((entry) => ({ ...entry, tty: "/dev/ttys001" })),
  });
  assert.deepEqual(
    result.snapshot.slots.slice(0, 2).map((entry) => [entry.sessionId, entry.configDir, entry.tty, entry.state]),
    [
      ["session-1", null, "/dev/ttys001", STATES.idle],
      ["session-2", "/profiles/work", "/dev/ttys001", STATES.running],
    ],
  );
});

// Counter-example for treating a failed read as an empty roster: every session
// of that profile would be shown closed for as long as the read keeps failing.
test("a profile whose roster cannot be read keeps its sessions, and says so", () => {
  const first = reconcileSnapshot({
    snapshot: emptySnapshot(),
    events: [],
    rosters: [
      { configDir: null, rows: [row("session-1", "idle")] },
      { configDir: "/profiles/work", rows: [row("session-2", "busy")] },
    ],
    now: 1,
  });
  const second = reconcileSnapshot({
    snapshot: first.snapshot,
    events: [],
    rosters: [
      { configDir: null, rows: [row("session-1", "idle")] },
      { configDir: "/profiles/work", error: "timed out" },
    ],
    now: 2,
  });
  assert.equal(stateOf(second.snapshot, "session-2"), STATES.running);
  assert.equal(second.changed, false);
  assert.deepEqual(second.notes, ["Roster unavailable for /profiles/work: timed out"]);
});

test("with no roster at all, nothing is concluded", () => {
  assert.throws(
    () =>
      reconcileSnapshot({
        snapshot: emptySnapshot(),
        events: [],
        rosters: [
          { configDir: null, error: "spawn failed" },
          { configDir: "/profiles/work", error: "timed out" },
        ],
        now: 1,
      }),
    /No roster could be read\. default configuration: spawn failed · \/profiles\/work: timed out/,
  );
});
