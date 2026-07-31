// Claude Code session state palette, shared between the Node tooling and the
// GUI. It lives in `shared/` because it is the only thing both sides need to
// know in common: the reducer stays in `scripts/lib/`, where the GUI has nothing
// to look for.
//
// Single source of truth. `scripts/lib/thread-slots.mjs` re-exports it so its
// importers keep working, and the GUI imports it to draw its legend — so the two
// cannot diverge.

export const STATES = Object.freeze({
  free: "free",
  idle: "idle",
  running: "running",
  blocked: "blocked",
  done: "done",
  ended: "ended",
});

// Hues taken from the repository palette. `blocked` is the only one added: no
// existing colour meant "a decision is waiting".
// `free` is `null`: a free slot is unlit, not coloured.
export const STATE_COLORS = Object.freeze({
  free: null,
  idle: "#6D5A7D",
  running: "#D97757",
  blocked: "#C2483D",
  done: "#5B8C6F",
  ended: "#2F2927",
});

// Reading order for a legend: from the most urgent to the most inert. This is
// not the order of `STATES`, which follows a session's life cycle.
export const LEGEND_ORDER = Object.freeze([
  STATES.blocked,
  STATES.running,
  STATES.done,
  STATES.idle,
  STATES.ended,
  STATES.free,
]);
