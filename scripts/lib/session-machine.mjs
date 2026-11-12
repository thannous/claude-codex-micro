// The life of one Claude Code session on an Agent key, as an explicit machine.
//
// Two sources report on a session and they are not interchangeable:
//
//   - the roster (`claude agents --json`) is polled. It says who is alive and,
//     since Claude Code 2.1.322, publishes a coarse `status`: `busy`, `idle` or
//     `waiting`;
//   - the plugin's hooks fire on events. They know things the roster does not —
//     that a turn finished rather than got interrupted, that an agent is asking
//     a question — and they are the only source on a Claude Code that publishes
//     no status.
//
// The phases below are therefore in two families.
//
//   Tracked: the roster publishes a status. It decides between working, waiting
//   and idle, and a hook never contradicts it: measured on real sessions, a hook
//   leads or trails the roster by up to 258 ms, and showing the hook's opinion
//   in that window made the key disagree with the roster. Hooks refine instead.
//   `idle.prompted` and `running.stopping` exist for exactly that: a prompt or
//   a `Stop` that the roster has not caught up with yet.
//
//   Hooks only (`hooks.*`): the roster lists the session without a status — an
//   older Claude Code, or a roster read that failed and was carried forward.
//   Hooks alone decide, and each one sets the phase on its own.
//
// What the end of a turn means depends on who saw it begin:
//
//   running           only the roster saw it: `idle` reads as a finished turn;
//   running.prompted  a hook vouches that hooks are installed, so an `idle`
//                     with no `Stop` is an interrupted turn — Esc emits none;
//   running.stopping  `Stop` arrived first: `idle` confirms the finished turn.
//
// A red key means a person is being waited for, and comes from two places:
// `waiting` is the roster's word, lit and cleared by the roster alone, since
// answering a permission prompt fires no hook; `asked.*` is a hook's word
// (`agent_needs_input`, `elicitation_dialog`) that the roster has not been
// measured to report, so the roster's `busy` and `idle` do not clear it.
//
// `ended` is the roster's alone to decide. Hooks are ignored there: a late
// `Stop` must not bring a closed session back to life.

import { STATES } from "../../shared/thread-status-palette.mjs";
import { defineMachine } from "./state-machine.mjs";

/** Roster statuses this code has measured; any other value is treated as absent. */
export const ROSTER_STATUSES = Object.freeze(["busy", "idle", "waiting"]);

/** Event for a session that is no longer listed by the roster. */
export const ROSTER_GONE = "roster.gone";

const ROSTER_EVENTS = new Map(ROSTER_STATUSES.map((status) => [status, `roster.${status}`]));

// The notification types that require a human. Any other type
// (`auth_success`, `elicitation_complete`…) is not an event at all: a red light
// has to mean "you are being waited for", and nothing else.
const NOTIFICATION_EVENTS = new Map([
  ["permission_prompt", "hook.permission"],
  ["agent_needs_input", "hook.ask"],
  ["elicitation_dialog", "hook.ask"],
  ["idle_prompt", "hook.idle"],
]);

const HOOK_EVENTS = new Map([
  ["SessionStart", "hook.start"],
  ["UserPromptSubmit", "hook.prompt"],
  ["Stop", "hook.stop"],
  ["SessionEnd", "hook.end"],
]);

// Shared by every live phase: the roster stopped listing the session.
const LEAVES = { [ROSTER_GONE]: "ended" };

// While a turn is running, any hook other than `Stop` and a question says the
// same thing: hooks are installed and this turn is theirs to close.
const VOUCHES = {
  "hook.start": "running.prompted",
  "hook.prompt": "running.prompted",
  "hook.permission": "running.prompted",
  "hook.idle": "running.prompted",
  "hook.end": "running.prompted",
};

// With no status to go by, a hook sets the phase whatever the phase was.
const HOOKS_DECIDE = {
  "hook.start": "hooks.idle",
  "hook.prompt": "hooks.running",
  "hook.stop": "hooks.done",
  "hook.permission": "hooks.waiting",
  "hook.ask": "hooks.asked",
  "hook.idle": "hooks.idle",
  "hook.end": "ended",
};

/**
 * Lifecycle of one session. `shows` is the display state of each phase, one of
 * the shared `STATES`; an event a phase does not list leaves it unchanged.
 *
 * A session starts in `hooks.idle`: nothing is known about it but what hooks
 * say, until the roster lists it.
 */
export const SESSION_MACHINE = defineMachine({
  id: "session",
  initial: "hooks.idle",
  events: [
    "roster.busy",
    "roster.idle",
    "roster.waiting",
    "roster.silent",
    ROSTER_GONE,
    "hook.start",
    "hook.prompt",
    "hook.stop",
    "hook.permission",
    "hook.ask",
    "hook.idle",
    "hook.end",
  ],
  states: {
    // --- tracked: the roster publishes a status ------------------------------
    idle: {
      shows: STATES.idle,
      on: {
        ...LEAVES,
        "roster.busy": "running",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.idle",
        "hook.prompt": "idle.prompted",
        "hook.stop": "done",
        "hook.ask": "asked.idle",
      },
    },
    // A prompt was submitted and the roster says idle: it is one poll behind,
    // the turn was too short to be seen, or it was interrupted. The key stays
    // idle.
    "idle.prompted": {
      shows: STATES.idle,
      on: {
        ...LEAVES,
        "roster.busy": "running.prompted",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.idle",
        "hook.start": "idle",
        "hook.stop": "done",
        "hook.permission": "idle",
        "hook.ask": "asked.idle",
        "hook.idle": "idle",
        "hook.end": "idle",
      },
    },
    running: {
      shows: STATES.running,
      on: {
        ...LEAVES,
        ...VOUCHES,
        "roster.idle": "done",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.observed",
        "hook.stop": "running.stopping",
        "hook.ask": "asked.busy",
      },
    },
    // `idle` with no `Stop`: the turn was interrupted. The phase stays vouched
    // for, so a turn that resumes without a new prompt is still closed by hooks.
    "running.prompted": {
      shows: STATES.running,
      on: {
        ...LEAVES,
        "roster.idle": "idle.prompted",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.running",
        "hook.stop": "running.stopping",
        "hook.ask": "asked.busy",
      },
    },
    // `Stop` landed while the roster still says busy. Any later hook means the
    // session moved on and that `Stop` belongs to a turn already over.
    "running.stopping": {
      shows: STATES.running,
      on: {
        ...LEAVES,
        ...VOUCHES,
        "roster.idle": "done",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.observed",
        "hook.ask": "asked.busy",
      },
    },
    // Lit and cleared by the roster alone. `busy` means the person approved and
    // the turn goes on; `idle` means it was refused or interrupted.
    waiting: {
      shows: STATES.blocked,
      on: {
        ...LEAVES,
        "roster.busy": "running",
        "roster.idle": "idle",
        "roster.silent": "hooks.waiting",
      },
    },
    "asked.busy": {
      shows: STATES.blocked,
      on: {
        ...LEAVES,
        ...VOUCHES,
        "roster.idle": "asked.idle",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.asked",
        "hook.stop": "running.stopping",
      },
    },
    "asked.idle": {
      shows: STATES.blocked,
      on: {
        ...LEAVES,
        "roster.busy": "asked.busy",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.asked",
        "hook.start": "idle",
        "hook.prompt": "idle.prompted",
        "hook.stop": "done",
        "hook.permission": "idle",
        "hook.idle": "idle",
        "hook.end": "idle",
      },
    },
    // `hook.end` is left out on purpose: the roster drops the session within a
    // poll, and showing `idle` for that long would only make the key flicker.
    done: {
      shows: STATES.done,
      on: {
        ...LEAVES,
        "roster.busy": "running",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.done",
        "hook.start": "idle",
        "hook.prompt": "idle.prompted",
        "hook.permission": "idle",
        "hook.ask": "asked.idle",
        "hook.idle": "idle",
      },
    },

    // --- hooks only: the roster lists the session without a status -----------
    "hooks.idle": {
      shows: STATES.idle,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "running",
        "roster.idle": "idle",
        "roster.waiting": "waiting",
      },
    },
    "hooks.running": {
      shows: STATES.running,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "running.prompted",
        "roster.idle": "idle.prompted",
        "roster.waiting": "waiting",
      },
    },
    // The roster saw a turn running, then went silent mid-turn. No hook vouched
    // for that turn, so when the status comes back it reads as it would have.
    "hooks.observed": {
      shows: STATES.running,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "running",
        "roster.idle": "done",
        "roster.waiting": "waiting",
      },
    },
    "hooks.waiting": {
      shows: STATES.blocked,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "running",
        "roster.idle": "idle",
        "roster.waiting": "waiting",
      },
    },
    "hooks.asked": {
      shows: STATES.blocked,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "asked.busy",
        "roster.idle": "asked.idle",
        "roster.waiting": "waiting",
      },
    },
    "hooks.done": {
      shows: STATES.done,
      on: {
        ...LEAVES,
        ...HOOKS_DECIDE,
        "roster.busy": "running",
        "roster.idle": "done",
        "roster.waiting": "waiting",
      },
    },

    // --- closed ---------------------------------------------------------------
    // Only the roster brings a session back, and it does: the process list is
    // the authority on who is alive.
    ended: {
      shows: STATES.ended,
      on: {
        "roster.busy": "running",
        "roster.idle": "idle",
        "roster.waiting": "waiting",
        "roster.silent": "hooks.idle",
      },
    },
  },
});

/**
 * Display state of a phase: what the key shows.
 *
 * @param {string} phase A phase of {@link SESSION_MACHINE}.
 * @returns {string} One of the shared `STATES`.
 * @throws {Error} When the phase is not one the machine declares.
 */
export function displayState(phase) {
  return SESSION_MACHINE.describe(phase).shows;
}

/**
 * Applies one event to a phase.
 *
 * @param {string} phase Current phase.
 * @param {string} event A roster or hook event of {@link SESSION_MACHINE}.
 * @returns {string} Next phase; the same one when the event changes nothing.
 * @throws {Error} When the phase or the event is not one the machine declares.
 */
export function nextPhase(phase, event) {
  return SESSION_MACHINE.transition(phase, event);
}

/**
 * Event for a roster row that lists the session. A status this code has never
 * measured is treated like no status at all: ignored rather than guessed at.
 *
 * @param {unknown} status `status` of the row from `claude agents --json`.
 * @returns {string} `roster.busy`, `roster.idle`, `roster.waiting` or `roster.silent`.
 */
export function rosterEvent(status) {
  return ROSTER_EVENTS.get(status) ?? "roster.silent";
}

/**
 * Event for one hook payload recorded by the plugin. Hooks that carry no
 * lifecycle information — and notification types that do not wait on a person
 * — are not events.
 *
 * @param {object|null|undefined} event Normalized hook record.
 * @returns {string|null} A `hook.*` event, or null when the record changes nothing.
 */
export function hookEvent(event) {
  if (event?.event === "Notification") return NOTIFICATION_EVENTS.get(event.notificationType) ?? null;
  return HOOK_EVENTS.get(event?.event) ?? null;
}

const PHASE_OF_DISPLAY = new Map([
  [STATES.idle, "hooks.idle"],
  [STATES.running, "hooks.running"],
  [STATES.blocked, "hooks.waiting"],
  [STATES.done, "hooks.done"],
  [STATES.ended, "ended"],
]);

/**
 * Phase for a session of which only the display state is known: a hook that
 * fired before the roster listed the session, or a slot persisted before
 * phases existed. It is the hooks-only phase showing that state, from which the
 * next roster row takes over.
 *
 * @param {unknown} state One of the shared `STATES`.
 * @returns {string} A phase of {@link SESSION_MACHINE}; `hooks.idle` when the state is unknown.
 */
export function phaseFromDisplay(state) {
  return PHASE_OF_DISPLAY.get(state) ?? SESSION_MACHINE.initial;
}
