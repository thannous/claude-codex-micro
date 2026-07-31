import assert from "node:assert/strict";
import test from "node:test";
import {
  SLOT_COUNT,
  STATES,
  applyHookEvent,
  applyRoster,
  emptySnapshot,
  normalizeSnapshot,
  resolveNavigation,
  slotView,
  stateFromHookEvent,
  ttyDevice,
} from "../scripts/lib/thread-slots.mjs";

function rosterRow(index, overrides = {}) {
  return {
    sessionId: `session-${index}`,
    pid: 1000 + index,
    cwd: "/tmp/projet",
    kind: "interactive",
    name: `projet-${index}`,
    startedAt: index,
    ...overrides,
  };
}

function withRoster(rows, snapshot = emptySnapshot(), now = 1) {
  return applyRoster(snapshot, rows, now);
}

function fullRunningRoster() {
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1));
  let snapshot = withRoster(rows).snapshot;
  for (const row of rows) {
    snapshot = applyHookEvent(
      snapshot,
      { event: "UserPromptSubmit", sessionId: row.sessionId },
      2,
    ).snapshot;
  }
  return { rows, snapshot };
}

test("hook events translate into states", () => {
  assert.equal(stateFromHookEvent({ event: "SessionStart" }), STATES.idle);
  assert.equal(stateFromHookEvent({ event: "UserPromptSubmit" }), STATES.running);
  assert.equal(stateFromHookEvent({ event: "Stop" }), STATES.done);
  assert.equal(stateFromHookEvent({ event: "SessionEnd" }), STATES.ended);
});

test("only notifications that wait on a person block", () => {
  for (const notificationType of ["permission_prompt", "agent_needs_input", "elicitation_dialog"]) {
    assert.equal(stateFromHookEvent({ event: "Notification", notificationType }), STATES.blocked);
  }
  assert.equal(
    stateFromHookEvent({ event: "Notification", notificationType: "idle_prompt" }),
    STATES.idle,
  );
  // A red light must mean "you are being waited for": these types change nothing.
  for (const notificationType of ["auth_success", "elicitation_complete", "agent_completed"]) {
    assert.equal(stateFromHookEvent({ event: "Notification", notificationType }), null);
  }
});

test("the roster opens slots in order and refreshes the metadata", () => {
  const first = withRoster([rosterRow(1), rosterRow(2)]);
  const view = slotView(first.snapshot);

  assert.equal(first.changed, true);
  assert.equal(view[0].entry.sessionId, "session-1");
  assert.equal(view[1].entry.sessionId, "session-2");
  assert.equal(view[2].state, STATES.free);
  assert.equal(view[0].state, STATES.idle);

  const renamed = withRoster([rosterRow(1, { name: "renommé" }), rosterRow(2)], first.snapshot, 2);
  assert.equal(renamed.snapshot.slots[0].name, "renommé");
  assert.equal(renamed.snapshot.slots[0].sessionId, "session-1", "l'emplacement reste collant");
});

test("a state received before the roster is held pending, then promoted", () => {
  const early = applyHookEvent(emptySnapshot(), { event: "UserPromptSubmit", sessionId: "session-1" }, 1);
  assert.equal(early.changed, false, "aucun emplacement n'est ouvert par un hook seul");
  assert.equal(early.snapshot.pending["session-1"], STATES.running);
  assert.equal(slotView(early.snapshot)[0].state, STATES.free);

  const confirmed = withRoster([rosterRow(1)], early.snapshot, 2);
  assert.equal(confirmed.snapshot.slots[0].state, STATES.running);
  assert.equal("session-1" in confirmed.snapshot.pending, false);
});

test("a session missing from the roster never takes a slot", () => {
  // Measured: `claude -p` sessions and subagents emit hooks without ever showing
  // up in `claude agents --json`.
  let snapshot = emptySnapshot();
  for (let index = 0; index < 50; index += 1) {
    snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: `fantome-${index}` }, index).snapshot;
  }
  assert.equal(slotView(snapshot).every((row) => row.state === STATES.free), true);
  assert.ok(Object.keys(snapshot.pending).length <= 32, "la file d'attente est bornée");
  assert.ok(snapshot.dropped > 0, "les abandons sont comptés, pas silencieux");
});

test("a missed hook is caught by the session leaving the roster", () => {
  const live = withRoster([rosterRow(1)]);
  const busy = applyHookEvent(live.snapshot, { event: "UserPromptSubmit", sessionId: "session-1" }, 2);
  assert.equal(busy.snapshot.slots[0].state, STATES.running);

  // The process dies without emitting Stop or SessionEnd.
  const gone = withRoster([], busy.snapshot, 3);
  assert.equal(gone.changed, true);
  assert.equal(gone.snapshot.slots[0].state, STATES.ended);
  assert.equal(gone.snapshot.slots[0].sessionId, "session-1", "the slot remains inspectable");
});

test("a closed session is evicted before any live one", () => {
  const { rows, snapshot: fullSnapshot } = fullRunningRoster();

  // The third one dies and a seventh arrives: it must take that slot.
  const survivors = rows.filter((row) => row.sessionId !== "session-3");
  let snapshot = withRoster(survivors, fullSnapshot, 3).snapshot;
  assert.equal(snapshot.slots[2].state, STATES.ended);

  const crowded = withRoster([...survivors, rosterRow(7)], snapshot, 4);
  assert.equal(crowded.snapshot.slots[2].sessionId, "session-7");
  assert.equal(crowded.notes.length, 0);
  assert.equal(
    crowded.snapshot.slots.filter((entry) => entry?.state === STATES.running).length,
    SLOT_COUNT - 1,
    "aucune session au travail n'a été évincée",
  );
});

test("overflow is reported instead of being silently truncated", () => {
  const { rows, snapshot } = fullRunningRoster();

  const overflow = withRoster([...rows, rosterRow(7)], snapshot, 3);
  assert.equal(overflow.snapshot.overflow, 1);
  assert.match(overflow.notes[0], /session-7/);
  assert.equal(overflow.snapshot.slots.some((entry) => entry?.sessionId === "session-7"), false);
});

test("navigation assumes no route", () => {
  assert.equal(resolveNavigation(null).kind, "empty");

  const terminal = resolveNavigation({
    sessionId: "session-1",
    state: STATES.running,
    tty: "/dev/ttys004",
    terminalApp: "iTerm2",
  });
  assert.deepEqual({ kind: terminal.kind, app: terminal.app }, { kind: "terminal", app: "iTerm2" });

  const closed = resolveNavigation({ sessionId: "session-1", state: STATES.ended, cwd: "/tmp/projet" });
  assert.equal(closed.kind, "resume");
  assert.equal(closed.sessionId, "session-1");

  // Session hosted by Claude Desktop: no tty. `claude://resume` addresses it by
  // the roster's `sessionId` — never by the `hostSessionId`, which groups
  // several sessions together.
  const hosted = resolveNavigation({
    sessionId: "6f2d3f4a-8c11-4b2e-9a77-0d5e1c8b4a30",
    state: STATES.running,
    entrypoint: "claude-desktop",
    hostSessionId: "local_f92b6e6a",
  });
  assert.equal(hosted.kind, "desktop");
  assert.equal(hosted.url, "claude://resume?session=6f2d3f4a-8c11-4b2e-9a77-0d5e1c8b4a30");
  assert.equal(hosted.hostSessionId, "local_f92b6e6a");

  // The application validates the target against a strict UUID regex. An id of
  // any other shape yields no URL that the handler would reject.
  const opaque = resolveNavigation({
    sessionId: "session-1",
    state: STATES.running,
    entrypoint: "claude-desktop",
  });
  assert.equal(opaque.kind, "unsupported");
  assert.equal(opaque.url, undefined);
});

test("the tty from `ps` becomes a device path that exists", () => {
  // The form macOS returns. An unconditional `/dev/tty` prefix produced
  // `/dev/ttyttys001`, and the AppleScript focus never found the window.
  assert.equal(ttyDevice("ttys001"), "/dev/ttys001");
  // The short form of other BSDs, which does need the full prefix.
  assert.equal(ttyDevice("s001"), "/dev/ttys001");
  // Already absolute: kept as is, with no double prefix.
  assert.equal(ttyDevice("/dev/ttys006"), "/dev/ttys006");
  // Sessions with no terminal: Claude Desktop, an IDE, a `claude -p`.
  for (const absent of ["??", "-", "", null, undefined]) {
    assert.equal(ttyDevice(absent), null);
  }
});

test("a corrupted snapshot falls back to six free slots", () => {
  assert.equal(normalizeSnapshot(null).slots.length, SLOT_COUNT);
  assert.equal(normalizeSnapshot({ slots: "nope" }).slots.length, SLOT_COUNT);
  const partial = normalizeSnapshot({ slots: [{ sessionId: "session-1", state: STATES.done }, 42] });
  assert.equal(partial.slots[0].sessionId, "session-1");
  assert.equal(partial.slots[1], null);
});
