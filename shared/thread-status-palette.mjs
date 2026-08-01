// Claude Code session state palette, shared between the Node tooling and the
// GUI. It lives in `shared/` because it is the only thing both sides need to
// know in common: the reducer stays in `scripts/lib/`, where the GUI has nothing
// to look for.
//
// Single source of truth. `scripts/lib/thread-slots.mjs` re-exports it so its
// importers keep working, and the GUI imports it to draw its legend — so the two
// cannot diverge.

/** Canonical session states shared by the reducer, lighting bridge, and GUI. */
export const STATES = Object.freeze({
  free: "free",
  idle: "idle",
  running: "running",
  blocked: "blocked",
  done: "done",
  ended: "ended",
});

/**
 * Repository palette by session state. `free` is null because an unused slot
 * is unlit; `blocked` is reserved exclusively for a decision awaiting a person.
 */
export const STATE_COLORS = Object.freeze({
  free: null,
  idle: "#6D5A7D",
  running: "#D97757",
  blocked: "#C2483D",
  done: "#5B8C6F",
  ended: "#2F2927",
});

/** Legend order from the most urgent state to the most inert. */
export const LEGEND_ORDER = Object.freeze([
  STATES.blocked,
  STATES.running,
  STATES.done,
  STATES.idle,
  STATES.ended,
  STATES.free,
]);
