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

// --- roster status -----------------------------------------------------------
//
// Measured on Claude Code 2.1.322: `claude agents --json` rows carry
// `status: "busy" | "idle"`. Before that field was used, a session already
// mid-turn when the companion started was shown idle until its next hook.

function stateOf(snapshot, sessionId = "session-1") {
  return snapshot.slots.find((entry) => entry?.sessionId === sessionId)?.state;
}

test("a session first seen busy starts running, not idle", () => {
  const { snapshot } = withRoster([rosterRow(1, { status: "busy" }), rosterRow(2, { status: "idle" })]);
  assert.equal(stateOf(snapshot, "session-1"), STATES.running);
  assert.equal(stateOf(snapshot, "session-2"), STATES.idle);
});

test("a roster without status behaves as before: new sessions are idle and never move", () => {
  let { snapshot } = withRoster([rosterRow(1)]);
  assert.equal(stateOf(snapshot), STATES.idle);
  snapshot = withRoster([rosterRow(1)], snapshot, 20_000).snapshot;
  assert.equal(stateOf(snapshot), STATES.idle);
});

test("without hooks, busy then idle reads as a finished turn", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 1000);
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 2000).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
  snapshot = withRoster([rosterRow(1, { status: "idle" })], snapshot, 3000).snapshot;
  assert.equal(stateOf(snapshot), STATES.done);
});

// The old grace period knowingly allowed five contradictory samples in the
// real recording. Explicit status now wins; Stop is retained for the later idle.
test("hooks do not contradict explicit statuses, and an early Stop is retained", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 1000);
  // The prompt hook fires; the poll that follows still reads the old status.
  snapshot = applyHookEvent(snapshot, { event: "UserPromptSubmit", sessionId: "session-1" }, 10_000).snapshot;
  assert.equal(stateOf(snapshot), STATES.idle);
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 10_100).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);

  // Same on the way out: `Stop` lands, the poll still says busy.
  snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: "session-1" }, 20_000).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 20_100).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
  snapshot = withRoster([rosterRow(1, { status: "idle" })], snapshot, 20_200).snapshot;
  assert.equal(stateOf(snapshot), STATES.done);
});

test("an interrupted turn, which emits no Stop, returns to idle on the first idle poll", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 1000);
  snapshot = applyHookEvent(snapshot, { event: "UserPromptSubmit", sessionId: "session-1" }, 10_000).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 10_100).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "idle" })], snapshot, 10_200).snapshot;
  assert.equal(stateOf(snapshot), STATES.idle);
});

test("a turn whose prompt hook was missed is still shown running", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 1000);
  snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: "session-1" }, 10_000).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 10_100).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
});

// Recorded on 2.1.322, default permission mode: the roster said `waiting` 0.9 s
// after the prompt, the `permission_prompt` notification hook fired 6.8 s after
// it, and the roster went back to `busy` when the prompt was approved.
test("a permission prompt turns the key red from the roster, before the hook", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 0);
  snapshot = applyHookEvent(snapshot, { event: "UserPromptSubmit", sessionId: "session-1" }, 15_200).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 15_300).snapshot;
  // A recent prompt must not hide the explicit permission status.
  snapshot = withRoster([rosterRow(1, { status: "waiting" })], snapshot, 16_100).snapshot;
  assert.equal(stateOf(snapshot), STATES.blocked);
});

test("answering the prompt clears the red light, which no hook reports", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "waiting" })], emptySnapshot(), 0);
  assert.equal(stateOf(snapshot), STATES.blocked);
  snapshot = applyHookEvent(
    snapshot,
    { event: "Notification", notificationType: "permission_prompt", sessionId: "session-1" },
    6000,
  ).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "waiting" })], snapshot, 6100).snapshot;
  assert.equal(stateOf(snapshot), STATES.blocked);

  // Approved: the turn goes on. No grace applies: the end of a wait is a fact.
  const approved = withRoster([rosterRow(1, { status: "busy" })], snapshot, 6200).snapshot;
  assert.equal(stateOf(approved), STATES.running);

  // Refused or interrupted: back to the prompt.
  const refused = withRoster([rosterRow(1, { status: "idle" })], snapshot, 6200).snapshot;
  assert.equal(stateOf(refused), STATES.idle);
});

// The red light means a person is being waited for. A hook that says so, and
// that the roster never confirmed with `waiting`, is not second-guessed: the
// roster status of `agent_needs_input` and `elicitation_dialog` is unmeasured.
test("a red light the roster never confirmed is not cleared by the roster", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "busy" })], emptySnapshot(), 1000);
  snapshot = applyHookEvent(
    snapshot,
    { event: "Notification", notificationType: "agent_needs_input", sessionId: "session-1" },
    2000,
  ).snapshot;
  for (const status of ["busy", "idle", "blocked", "requires_action", undefined]) {
    snapshot = withRoster([rosterRow(1, { status })], snapshot, 200_000).snapshot;
    assert.equal(stateOf(snapshot), STATES.blocked, `status ${status}`);
  }
});

test("a status this code has never seen moves nothing and lights nothing red", () => {
  let fresh = withRoster([rosterRow(2, { status: "requires_action" })]).snapshot;
  assert.equal(stateOf(fresh, "session-2"), STATES.idle);
  fresh = withRoster([rosterRow(2, { status: "blocked" })], fresh, 200_000).snapshot;
  assert.equal(stateOf(fresh, "session-2"), STATES.idle);
});

test("hooks take over if a previously published status field disappears", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "busy" })], emptySnapshot(), 1);
  snapshot = withRoster([rosterRow(1)], snapshot, 2).snapshot;
  snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: "session-1" }, 3).snapshot;
  assert.equal(stateOf(snapshot), STATES.done);
});

test("an observed wait clears an unmeasured notification without relighting red on the next idle poll", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "busy" })], emptySnapshot(), 1);
  snapshot = applyHookEvent(snapshot, {
    event: "Notification", notificationType: "elicitation_dialog", sessionId: "session-1",
  }, 2).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "waiting" })], snapshot, 3).snapshot;
  for (const time of [4, 5]) {
    snapshot = withRoster([rosterRow(1, { status: "idle" })], snapshot, time).snapshot;
    assert.equal(stateOf(snapshot), STATES.idle);
  }
});

test("an unchanged roster status reports no change, so nothing is re-published", () => {
  const first = withRoster([rosterRow(1, { status: "busy" })], emptySnapshot(), 1000);
  const second = withRoster([rosterRow(1, { status: "busy" })], first.snapshot, 60_000);
  assert.equal(second.changed, false);
  assert.deepEqual(second.snapshot.slots, first.snapshot.slots);
});

test("the configuration directory a session runs under is kept on its slot", () => {
  const { snapshot } = withRoster([rosterRow(1, { configDir: "/profiles/work" }), rosterRow(2, { configDir: null })]);
  assert.equal(snapshot.slots[0].configDir, "/profiles/work");
  assert.equal(snapshot.slots[1].configDir, null);
});

// Measured on a real machine: eight live sessions for six keys, five of them
// idle Claude Desktop chats. Before idle sessions could be evicted, the one
// session actually working had no key at all.
test("a working newcomer takes the key of the oldest idle session", () => {
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1, { status: "idle" }));
  let snapshot = emptySnapshot();
  rows.forEach((row, index) => {
    snapshot = withRoster(rows.slice(0, index + 1), snapshot, 100 + index).snapshot;
  });

  const busy = rosterRow(7, { status: "busy" });
  const result = withRoster([...rows, busy], snapshot, 1000);
  assert.equal(stateOf(result.snapshot, "session-7"), STATES.running);
  assert.equal(stateOf(result.snapshot, "session-1"), undefined, "the oldest idle session gave up its key");
  // The evicted session had already been seen in this pass: it is counted as
  // waiting from the next one, and stays out without taking the key back.
  const next = withRoster([...rows, busy], result.snapshot, 2000);
  assert.equal(next.snapshot.overflow, 1);
  assert.equal(next.changed, false);
  assert.equal(stateOf(next.snapshot, "session-7"), STATES.running);
});

// Counter-example for evicting idle sessions unconditionally: two idle sessions
// competing for the last key would swap it on every poll, and the keyboard
// would flicker with nothing happening.
test("an idle newcomer never evicts an idle session, so keys do not trade places", () => {
  const rows = Array.from({ length: SLOT_COUNT + 1 }, (_, index) => rosterRow(index + 1, { status: "idle" }));
  const first = withRoster(rows, emptySnapshot(), 1);
  assert.equal(stateOf(first.snapshot, "session-7"), undefined);
  assert.equal(first.snapshot.overflow, 1);

  const second = withRoster(rows, first.snapshot, 2);
  assert.equal(second.changed, false);
  assert.deepEqual(second.snapshot.slots, first.snapshot.slots);
  assert.equal(second.snapshot.overflow, 1, "overflow is a current count, not a tally of polls");
});

test("a pending permission hook claims an idle key but waits for explicit waiting before turning red", () => {
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1, { status: "idle" }));
  let snapshot = withRoster(rows, emptySnapshot(), 1).snapshot;
  snapshot = applyHookEvent(
    snapshot,
    { event: "Notification", notificationType: "permission_prompt", sessionId: "session-7" },
    2,
  ).snapshot;
  snapshot = withRoster([...rows, rosterRow(7, { status: "busy" })], snapshot, 3).snapshot;
  assert.equal(stateOf(snapshot, "session-7"), STATES.running);
  snapshot = withRoster([...rows, rosterRow(7, { status: "waiting" })], snapshot, 4000).snapshot;
  assert.equal(stateOf(snapshot, "session-7"), STATES.blocked);
});

test("a missed prompt hook starts a new turn without reusing the preceding Stop", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "busy" })], emptySnapshot(), 1);
  snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: "session-1" }, 2).snapshot;
  snapshot = withRoster([rosterRow(1, { status: "idle" })], snapshot, 3).snapshot;
  assert.equal(stateOf(snapshot), STATES.done);
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 4).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
  // Not `running.stopping`: the Stop belonged to the turn that is over.
  assert.equal(snapshot.slots[0].phase, "running");
});

// Counter-example for applying hooks to a closed slot: the journal is read
// after the roster, so a `Stop` emitted just before the process exits used to
// turn the key of a dead session green until the next poll.
test("a late hook cannot revive a session missing from the roster", () => {
  let { snapshot } = withRoster([rosterRow(1, { status: "idle" })], emptySnapshot(), 1);
  snapshot = withRoster([], snapshot, 2).snapshot;
  for (const event of ["SessionEnd", "Stop", "UserPromptSubmit"]) {
    const late = applyHookEvent(snapshot, { event, sessionId: "session-1" }, 4);
    assert.equal(late.changed, false, event);
    assert.equal(stateOf(late.snapshot), STATES.ended, event);
    assert.equal(late.snapshot.slots[0].updatedAt, 2, "its eviction age is not refreshed either");
  }
  // The roster remains the authority: it alone reopens the slot.
  snapshot = withRoster([rosterRow(1, { status: "busy" })], snapshot, 5).snapshot;
  assert.equal(stateOf(snapshot), STATES.running);
});

// slots.json written by the reducer that kept `lastHookState`, `rosterStatus`
// and friends on each slot, before the session machine held that in `phase`.
test("a slot persisted before phases existed is read by its display state", () => {
  const legacy = normalizeSnapshot({
    version: 1,
    slots: [
      { sessionId: "session-1", state: STATES.running, lastHookState: "running", rosterStatus: "busy", stateSource: "hook", updatedAt: 5 },
      { sessionId: "session-2", state: STATES.ended, rosterStatus: "idle", lastHookState: "done", updatedAt: 3 },
      { sessionId: "session-3", state: "nope", phase: "nope" },
    ],
  });
  assert.equal(legacy.version, 2);
  assert.deepEqual(legacy.slots[0], { sessionId: "session-1", phase: "hooks.running", state: STATES.running, updatedAt: 5 });
  assert.equal(legacy.slots[1].phase, "ended");
  assert.deepEqual(legacy.slots[2], { sessionId: "session-3", phase: "hooks.idle", state: STATES.idle });

  // The next roster row takes over, and a turn already running is not re-dated.
  const next = withRoster([rosterRow(1, { status: "busy" })], legacy, 6).snapshot;
  assert.equal(next.slots[0].phase, "running.prompted");
  assert.equal(next.slots[0].updatedAt, 5);
  assert.equal(stateOf(next, "session-2"), STATES.ended);
});

test("six working sessions keep their keys: a seventh waits", () => {
  const { snapshot } = fullRunningRoster();
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1, { status: "busy" }));
  const result = withRoster([...rows, rosterRow(7, { status: "busy" })], snapshot, 10);
  assert.equal(stateOf(result.snapshot, "session-7"), undefined);
  assert.equal(result.snapshot.overflow, 1);
});
