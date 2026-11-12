// Replays a recorded session through the slot reducer the way
// scripts/thread-status.mjs `reconcile` does on every poll: the roster first,
// then the hook events that arrived since the previous poll.

import { readFileSync } from "node:fs";
import { applyHookEvent, applyRoster, emptySnapshot, STATES } from "../../scripts/lib/thread-slots.mjs";

const SESSION_ID = "00000000-0000-4000-8000-00000000e2e0";

function ndjson(url) {
  return readFileSync(url, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
}

/**
 * Loads one recording from tests/fixtures/thread-status.
 *
 * @param {string} name Recording base name.
 * @returns {{samples: Array<{t: number, status: string|null}>, events: object[]}}
 * Roster samples and hook events, both on the same clock, in milliseconds.
 */
export function loadRecording(name) {
  const base = new URL(`../fixtures/thread-status/${name}`, import.meta.url);
  return {
    samples: ndjson(new URL(`${base}.roster.ndjson`)),
    events: ndjson(new URL(`${base}.journal.ndjson`)).sort((a, b) => a.ts - b.ts),
  };
}

// What the key should show for a roster status, hooks aside.
function agrees(status, state) {
  if (status === "waiting") return state === STATES.blocked;
  if (status === "busy") return state === STATES.running;
  return state === STATES.idle || state === STATES.done;
}

/**
 * Replays a recording and reports what the key showed.
 *
 * @param {{samples: Array<{t: number, status: string|null}>, events: object[]}} recording
 * @param {{hooks?: boolean}} [options] `hooks: false` replays as if the plugin were not loaded.
 * @returns {{timeline: Array<{t: number, state: string}>, disagreements: Array<{start: number, ms: number, status: string, state: string}>, stateAt: (t: number) => string}}
 * State changes, sampled disagreement intervals (bounded by the next sample), and a lookup.
 */
export function replay({ samples, events }, { hooks = true } = {}) {
  const journal = hooks ? events : [];
  let snapshot = emptySnapshot();
  let cursor = 0;
  let run = null;
  const timeline = [];
  const disagreements = [];
  const close = () => {
    if (run) disagreements.push({ start: run.start, ms: run.end - run.start, status: run.status, state: run.state });
    run = null;
  };

  for (let index = 0; index < samples.length; index += 1) {
    const { t, status } = samples[index];
    const rows = status === null ? [] : [{ sessionId: SESSION_ID, status }];
    snapshot = applyRoster(snapshot, rows, t).snapshot;
    while (cursor < journal.length && journal[cursor].ts <= t) {
      snapshot = applyHookEvent(snapshot, journal[cursor], journal[cursor].ts).snapshot;
      cursor += 1;
    }
    const state = snapshot.slots.find((entry) => entry)?.state ?? STATES.free;
    if (timeline.at(-1)?.state !== state) timeline.push({ t, state });
    if (status === null || agrees(status, state)) close();
    else {
      const end = samples[index + 1]?.t ?? t;
      run = run ? { ...run, end } : { start: t, end, status, state };
    }
  }
  close();

  return {
    timeline,
    disagreements,
    stateAt: (t) => timeline.filter((entry) => entry.t <= t).at(-1)?.state ?? STATES.free,
  };
}
