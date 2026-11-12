// Properties of the session machine, checked over the whole table rather than
// on hand-picked paths: with 16 phases and 12 events, the cases nobody thought
// of are the ones that matter.

import assert from "node:assert/strict";
import test from "node:test";
import {
  ROSTER_GONE,
  ROSTER_STATUSES,
  SESSION_MACHINE,
  displayState,
  hookEvent,
  nextPhase,
  phaseFromDisplay,
  rosterEvent,
} from "../scripts/lib/session-machine.mjs";
import { STATES } from "../shared/thread-status-palette.mjs";

const PHASES = SESSION_MACHINE.states;
const HOOKS = SESSION_MACHINE.events.filter((event) => event.startsWith("hook."));
const HOOKS_ONLY = PHASES.filter((phase) => phase.startsWith("hooks."));
const ASKED = PHASES.filter((phase) => phase.startsWith("asked."));
const TRACKED = PHASES.filter((phase) => !phase.startsWith("hooks.") && phase !== "ended");

// Every phase the machine can be in right after the roster said `status`.
function phasesAfter(status) {
  const reached = new Set(PHASES.map((phase) => nextPhase(phase, rosterEvent(status))));
  // …and after any run of hooks from there, since hooks fire between two polls.
  const queue = [...reached];
  while (queue.length > 0) {
    const phase = queue.shift();
    for (const hook of HOOKS) {
      const next = nextPhase(phase, hook);
      if (!reached.has(next)) {
        reached.add(next);
        queue.push(next);
      }
    }
  }
  return [...reached];
}

test("every phase is reachable and shows one of the shared states", () => {
  assert.deepEqual(SESSION_MACHINE.unreachable(), []);
  for (const phase of PHASES) {
    assert.ok(Object.values(STATES).includes(displayState(phase)), phase);
    assert.notEqual(displayState(phase), STATES.free, "a slot with a session is never free");
  }
});

// The property the real recordings were captured to defend: a hook leads or
// trails the roster by up to 258 ms, and the key must not disagree with the
// roster in that window. The one exception is a question asked by an agent,
// which the roster has not been measured to report.
test("after an explicit status, no run of hooks makes the key contradict it", () => {
  const allowed = {
    busy: [STATES.running],
    idle: [STATES.idle, STATES.done],
    waiting: [STATES.blocked],
  };
  for (const status of ROSTER_STATUSES) {
    for (const phase of phasesAfter(status)) {
      if (ASKED.includes(phase)) continue;
      assert.ok(
        allowed[status].includes(displayState(phase)),
        `roster ${status}, then hooks, reached ${phase} showing ${displayState(phase)}`,
      );
    }
  }
});

test("a session the roster stops listing is closed, whatever it was doing", () => {
  for (const phase of PHASES) assert.equal(nextPhase(phase, ROSTER_GONE), "ended", phase);
});

// Counter-example for letting hooks through: a `Stop` written to the journal
// just before the process exits is read after the roster has already dropped
// the session, and used to turn its key green again until the next poll.
test("a closed session ignores every hook and is reopened by the roster alone", () => {
  for (const hook of HOOKS) assert.equal(nextPhase("ended", hook), "ended", hook);
  assert.equal(nextPhase("ended", "roster.busy"), "running");
  assert.equal(nextPhase("ended", "roster.idle"), "idle");
  assert.equal(nextPhase("ended", "roster.waiting"), "waiting");
  assert.equal(nextPhase("ended", "roster.silent"), "hooks.idle");
});

test("with no status to go by, a hook sets the phase whatever the phase was", () => {
  for (const hook of HOOKS) {
    const targets = new Set(HOOKS_ONLY.map((phase) => nextPhase(phase, hook)));
    assert.equal(targets.size, 1, `${hook} leads to ${[...targets].join(", ")}`);
  }
  assert.equal(nextPhase("hooks.idle", "hook.prompt"), "hooks.running");
  assert.equal(nextPhase("hooks.running", "hook.stop"), "hooks.done");
  assert.equal(nextPhase("hooks.done", "hook.end"), "ended");
});

test("a status that goes missing hands over to hooks without moving the key", () => {
  for (const phase of TRACKED) {
    const silent = nextPhase(phase, "roster.silent");
    assert.ok(silent.startsWith("hooks."), `${phase} → ${silent}`);
    assert.equal(displayState(silent), displayState(phase), phase);
    assert.equal(nextPhase(silent, "roster.silent"), silent, "silence repeated changes nothing");
  }
});

// Counter-example for folding `hooks.observed` into `hooks.running`: one failed
// roster read in the middle of a turn that no hook vouched for made that turn
// read as interrupted instead of finished.
test("a roster read that fails mid-turn does not change how the turn ends", () => {
  let phase = nextPhase("idle", "roster.busy");
  phase = nextPhase(phase, "roster.silent");
  assert.equal(phase, "hooks.observed");
  assert.equal(displayState(nextPhase(nextPhase(phase, "roster.busy"), "roster.idle")), STATES.done);
  assert.equal(displayState(nextPhase(phase, "roster.idle")), STATES.done);
});

test("the end of a turn reads by who saw it begin", () => {
  // Only the roster saw it: finished.
  assert.equal(nextPhase("running", "roster.idle"), "done");
  // A hook vouched for it and no Stop came: interrupted — Esc emits none.
  assert.equal(displayState(nextPhase("running.prompted", "roster.idle")), STATES.idle);
  // Stop arrived first: the roster confirms.
  assert.equal(nextPhase("running.stopping", "roster.idle"), "done");
  // Any hook while a turn runs is proof that hooks are installed.
  for (const hook of ["hook.start", "hook.prompt", "hook.permission", "hook.idle", "hook.end"]) {
    assert.equal(nextPhase("running", hook), "running.prompted", hook);
  }
});

test("a Stop is not carried into the next turn", () => {
  assert.equal(nextPhase("running.stopping", "hook.prompt"), "running.prompted");
  assert.equal(nextPhase(nextPhase("running.stopping", "roster.idle"), "roster.busy"), "running");
});

test("the red of a permission prompt is the roster's to light and to clear", () => {
  for (const hook of HOOKS) assert.equal(nextPhase("waiting", hook), "waiting", hook);
  assert.equal(nextPhase("waiting", "roster.busy"), "running", "approved: the turn goes on");
  assert.equal(nextPhase("waiting", "roster.idle"), "idle", "refused or interrupted");
  // The notification hook alone, about six seconds late, lights nothing.
  for (const phase of ["idle", "running", "done"]) {
    assert.notEqual(displayState(nextPhase(phase, "hook.permission")), STATES.blocked, phase);
  }
});

test("a question from an agent stays red until a hook or an observed wait answers it", () => {
  for (const phase of ASKED) {
    assert.equal(displayState(nextPhase(phase, "roster.busy")), STATES.blocked, phase);
    assert.equal(displayState(nextPhase(phase, "roster.idle")), STATES.blocked, phase);
    assert.equal(nextPhase(phase, "roster.waiting"), "waiting", phase);
    assert.notEqual(displayState(nextPhase(phase, "hook.stop")), STATES.blocked, phase);
    assert.notEqual(displayState(nextPhase(phase, "hook.prompt")), STATES.blocked, phase);
  }
  assert.equal(nextPhase(nextPhase("asked.busy", "roster.waiting"), "roster.idle"), "idle");
});

test("roster rows and hook records map onto the machine's events", () => {
  assert.equal(rosterEvent("busy"), "roster.busy");
  assert.equal(rosterEvent("waiting"), "roster.waiting");
  for (const unmeasured of [undefined, null, "requires_action", "constructor", 3]) {
    assert.equal(rosterEvent(unmeasured), "roster.silent", String(unmeasured));
  }

  assert.equal(hookEvent({ event: "UserPromptSubmit" }), "hook.prompt");
  assert.equal(hookEvent({ event: "Notification", notificationType: "elicitation_dialog" }), "hook.ask");
  assert.equal(hookEvent({ event: "Notification", notificationType: "auth_success" }), null);
  assert.equal(hookEvent({ event: "PreToolUse" }), null);
  assert.equal(hookEvent(null), null);
  for (const event of SESSION_MACHINE.events) {
    assert.ok(event.startsWith("roster.") || event.startsWith("hook."), event);
  }
});

test("a display state alone maps to the hooks-only phase that shows it", () => {
  for (const state of [STATES.idle, STATES.running, STATES.blocked, STATES.done, STATES.ended]) {
    assert.equal(displayState(phaseFromDisplay(state)), state);
  }
  assert.equal(phaseFromDisplay(undefined), SESSION_MACHINE.initial);
  assert.equal(phaseFromDisplay("nope"), SESSION_MACHINE.initial);
});
