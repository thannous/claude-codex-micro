import assert from "node:assert/strict";
import test from "node:test";
import { RUN_LOOP_MACHINE, createRunLoop } from "../scripts/lib/run-loop.mjs";

// A pass that the test finishes by hand, to place requests exactly where the
// two watchers get them: in the middle of a pass.
function manualTask() {
  const pending = [];
  let started = 0;
  return {
    task: () => new Promise((resolve, reject) => {
      started += 1;
      pending.push({ resolve, reject });
    }),
    started: () => started,
    finish: () => pending.shift().resolve(),
    fail: (error) => pending.shift().reject(error),
  };
}

test("the loop has three states and no dead one", () => {
  assert.deepEqual(RUN_LOOP_MACHINE.states, ["idle", "running", "rerun"]);
  assert.deepEqual(RUN_LOOP_MACHINE.unreachable(), []);
  assert.equal(RUN_LOOP_MACHINE.transition("rerun", "request"), "rerun", "asked twice is asked once");
  assert.equal(RUN_LOOP_MACHINE.transition("idle", "settled"), "idle");
});

test("passes never overlap", async () => {
  const manual = manualTask();
  const loop = createRunLoop(manual.task);
  loop.request();
  loop.request();
  loop.request();
  assert.equal(manual.started(), 1);
  assert.equal(loop.state(), "rerun");
  manual.finish();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(manual.started(), 2);
  manual.finish();
  await loop.settled();
  assert.equal(loop.state(), "idle");
});

// Counter-example for the boolean guard this replaces: `if (running) return`
// dropped the request made during a pass, so a hook written while the roster
// was being read waited for the next poll, up to two seconds later.
test("a request made during a pass is not lost: exactly one more pass follows", async () => {
  const manual = manualTask();
  const loop = createRunLoop(manual.task);
  loop.request();
  for (let index = 0; index < 5; index += 1) loop.request();
  manual.finish();
  await new Promise((resolve) => setImmediate(resolve));
  manual.finish();
  await loop.settled();
  assert.equal(manual.started(), 2, "five requests during one pass make one more pass, not five");
});

test("a pass that fails is reported and does not stop the loop", async () => {
  const manual = manualTask();
  const errors = [];
  const loop = createRunLoop(manual.task, { onError: (error) => errors.push(error.message) });
  loop.request();
  manual.fail(new Error("roster unreadable"));
  await loop.settled();
  assert.deepEqual(errors, ["roster unreadable"]);

  loop.request();
  assert.equal(manual.started(), 2);
  manual.finish();
  await loop.settled();
});

test("a synchronous task and a delay are both accepted", async () => {
  let runs = 0;
  const loop = createRunLoop(() => { runs += 1; }, { delayMs: 5 });
  const before = Date.now();
  loop.request();
  loop.request();
  await loop.settled();
  assert.equal(runs, 2);
  assert.ok(Date.now() - before >= 8, "each pass waits for the burst to settle");
  await loop.settled();
});
