// Runs one task at a time, however often it is asked for.
//
// Both watchers are woken by two things at once — a timer and a file change —
// while a pass is asynchronous. A boolean guard that drops the request made
// during a pass loses the very event that arrived last; no guard at all runs
// two passes over the same state. The answer is three states:
//
//   idle     nothing to do;
//   running  a pass is under way;
//   rerun    a pass is under way and another was asked for meanwhile: exactly
//            one more runs when this one settles, however many times it was
//            asked.

import { defineMachine } from "./state-machine.mjs";

/** The three states of a coalescing run loop. */
export const RUN_LOOP_MACHINE = defineMachine({
  id: "run-loop",
  initial: "idle",
  events: ["request", "settled"],
  states: {
    idle: { on: { request: "running" } },
    running: { on: { request: "rerun", settled: "idle" } },
    rerun: { on: { settled: "running" } },
  },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps a task so that concurrent requests never overlap and never get lost.
 *
 * @param {() => unknown|Promise<unknown>} task One pass. May throw or reject.
 * @param {object} [options] Behaviour around a pass.
 * @param {(error: Error) => void} [options.onError] Receives a failed pass; the loop goes on.
 * @param {number} [options.delayMs] Wait before each pass, to let a burst of
 * requests — a file written in several chunks — settle into one.
 * @returns {{request: () => void, state: () => string, settled: () => Promise<void>}}
 * `request` asks for a pass, `state` names the current state, and `settled`
 * resolves the next time the loop is idle.
 */
export function createRunLoop(task, { onError = () => {}, delayMs = 0 } = {}) {
  let state = RUN_LOOP_MACHINE.initial;
  const waiters = [];

  const send = (event) => {
    const previous = state;
    state = RUN_LOOP_MACHINE.transition(state, event);
    return previous;
  };

  const run = async () => {
    try {
      if (delayMs > 0) await sleep(delayMs);
      await task();
    } catch (error) {
      onError(error);
    }
    send("settled");
    if (state === "running") {
      void run();
      return;
    }
    for (const resolve of waiters.splice(0)) resolve();
  };

  return {
    request() {
      if (send("request") === "idle") void run();
    },
    state: () => state,
    settled: () => (state === "idle" ? Promise.resolve() : new Promise((resolve) => waiters.push(resolve))),
  };
}
