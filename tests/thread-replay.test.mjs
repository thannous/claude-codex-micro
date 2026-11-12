// Recordings of real Claude Code 2.1.322 sessions, replayed through the reducer.
//
// Each recording pairs what `claude agents --json` said, sampled every ~275 ms,
// with what the plugin's hooks emitted, on one clock. They are the ground truth
// the reducer is checked against: see tests/fixtures/thread-status/README.md
// for how they were captured and how to capture new ones.

import assert from "node:assert/strict";
import test from "node:test";
import { STATES } from "../scripts/lib/thread-slots.mjs";
import { loadRecording, replay } from "./helpers/thread-replay.mjs";

const turns = loadRecording("turns-and-interrupt");
const permission = loadRecording("permission-prompt");
const installed = loadRecording("installed-plugin-20261112");

test("every recorded sample agrees with the official roster, including hooks that arrive first", () => {
  for (const recording of [turns, permission, installed]) {
    assert.deepEqual(replay(recording).disagreements, []);
  }
});

test("eleven real turns: at least 20 transitions without contradicting any roster sample", () => {
  const { timeline, disagreements } = replay(turns);
  const running = timeline.filter((entry) => entry.state === STATES.running).length;
  const done = timeline.filter((entry) => entry.state === STATES.done).length;
  assert.equal(running, 12, "eleven answered turns and one interrupted");
  assert.equal(done, 11);
  assert.ok(timeline.length - 1 >= 20, `expected at least 20 transitions, saw ${timeline.length - 1}`);
  assert.equal(timeline.at(-1).state, STATES.ended);
  assert.deepEqual(disagreements, []);
});

test("the installed plugin recording covers at least 20 transitions and one interrupted turn", () => {
  const { timeline, disagreements } = replay(installed);
  assert.equal(installed.events.filter((event) => event.event === "UserPromptSubmit").length, 12);
  assert.equal(installed.events.filter((event) => event.event === "Stop").length, 11);
  assert.equal(timeline.filter((entry) => entry.state === STATES.running).length, 12);
  assert.ok(timeline.length - 1 >= 20);
  assert.equal(timeline.at(-1).state, STATES.ended);
  assert.deepEqual(disagreements, []);
});

// The regression this whole file exists for: Esc emits no `Stop`, so with hooks
// alone the key stayed on `running` until the next prompt — or forever.
test("an interrupted turn returns to idle instead of staying lit as running", () => {
  const prompts = turns.events.filter((event) => event.event === "UserPromptSubmit");
  const stops = turns.events.filter((event) => event.event === "Stop");
  const interrupted = prompts.find(
    (prompt, index) => !stops.some((stop) => stop.ts > prompt.ts && stop.ts < (prompts[index + 1]?.ts ?? Infinity)),
  );
  assert.ok(interrupted, "the recording contains a prompt with no Stop");

  const { stateAt } = replay(turns);
  const rosterIdle = turns.samples.find((sample) => sample.t > interrupted.ts && sample.status === "idle");
  assert.equal(stateAt(rosterIdle.t - 1), STATES.running);
  assert.equal(stateAt(rosterIdle.t), STATES.idle);
});

test("without the plugin, the roster alone tracks every turn with no disagreement", () => {
  const { timeline, disagreements } = replay(turns, { hooks: false });
  assert.deepEqual(disagreements, []);
  assert.equal(timeline.filter((entry) => entry.state === STATES.running).length, 12);
});

test("a permission prompt lights red before the notification hook, and clears when answered", () => {
  const { timeline, stateAt, disagreements } = replay(permission);
  const hook = permission.events.find((event) => event.notificationType === "permission_prompt");
  const red = timeline.find((entry) => entry.state === STATES.blocked);
  assert.ok(red, "the key turned red");
  assert.ok(red.t < hook.ts, `red at ${red.t} ms, hook at ${hook.ts} ms`);

  const waiting = permission.samples.filter((sample) => sample.status === "waiting");
  const answered = permission.samples.find((sample) => sample.t > waiting.at(-1).t);
  assert.equal(answered.status, "busy");
  assert.equal(stateAt(waiting.at(-1).t), STATES.blocked);
  assert.equal(stateAt(answered.t), STATES.running, "red cleared on the poll that saw the answer");

  assert.deepEqual(disagreements, []);
});

test("without the plugin, a permission prompt still lights red and clears", () => {
  const { timeline, disagreements } = replay(permission, { hooks: false });
  assert.deepEqual(timeline.map((entry) => entry.state), [
    STATES.free, STATES.idle, STATES.running, STATES.done,
    STATES.running, STATES.blocked, STATES.running, STATES.done, STATES.ended,
  ]);
  assert.deepEqual(disagreements, []);
});
