// Reduces the live Claude Code sessions to six physical slots, one per Agent key
// on the Codex Micro.
//
// The module is deliberately pure: it spawns no process, writes no file and
// reads no transcript. All the assignment and transition logic is therefore
// testable without a running Claude.
//
// The roster (`claude agents --json`) is the authority on membership: it alone
// decides which session occupies a slot. What a session shows on its key is not
// decided here but by the session machine (scripts/lib/session-machine.mjs),
// which this reducer feeds with roster rows and hook events. Each slot carries
// its `phase` in that machine, and `state` is the display state of that phase.
//
// This separation is not cosmetic. A missed hook (crash, `kill -9`) would pin
// the state to `running` forever; the roster catches that.

/**
 * @typedef {object} SessionSlot
 * @property {string} sessionId Claude Code session identifier.
 * @property {string} phase Phase in the session machine.
 * @property {string} state Display state of `phase`, one of the shared `STATES` values.
 * @property {number} [updatedAt] Timestamp of the last display change or hook.
 * @property {string} [name] Display name from the official roster.
 * @property {string} [cwd] Session working directory.
 * @property {number} [pid] Session process identifier.
 * @property {string} [tty] Terminal identifier reported by `ps`.
 * @property {string} [terminalApp] Supported terminal application name.
 * @property {string} [entrypoint] Claude Code host entrypoint.
 * @property {string} [hostSessionId] Host grouping id, not a navigation target.
 * @property {string|null} [configDir] `CLAUDE_CONFIG_DIR` the session runs under; null for the default.
 */

/**
 * @typedef {object} SlotSnapshot
 * @property {2} version Snapshot schema version. Version 1 slots had no `phase`.
 * @property {Array<SessionSlot|null>} slots Six physical Agent-key assignments.
 * @property {Record<string, string>} pending Display state last set by a hook, for sessions
 * the roster does not list yet.
 * @property {number} dropped Pending states evicted from the bounded map.
 * @property {number} overflow Live sessions currently without a slot.
 */

/**
 * @typedef {object} NavigationTarget
 * @property {"empty"|"terminal"|"resume"|"desktop"|"unsupported"} kind Route decision.
 * @property {string} [sessionId] Claude Code session identifier.
 * @property {string} [tty] Terminal identifier for AppleScript focus.
 * @property {string|null} [app] Terminal application to focus.
 * @property {string} [url] Undocumented Claude Desktop resume URL.
 * @property {string|null} [cwd] Working directory for a closed-session resume command.
 * @property {string|null} [name] Session display name.
 * @property {string|null} [entrypoint] Host entrypoint when no route is available.
 * @property {string|null} [hostSessionId] Non-addressable host grouping id.
 * @property {string} [reason] Evidence-backed explanation for an unsupported route.
 */

/** Number of physical Agent keys available for session assignment. */
export const SLOT_COUNT = 6;

/**
 * Six Agent controls in physical reading order: two top-row keys followed by
 * four on the next row. Ids originate in `KEY_CONTROL_LOCATIONS`.
 */
export const SLOT_CONTROLS = Object.freeze(["key-9", "key-10", "key-5", "key-6", "key-7", "key-8"]);

// Re-exported from shared/, where they are the single source of truth: the GUI
// shows the same legend, and a duplicated palette would end up diverging.
export { LEGEND_ORDER, STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";
import { STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";
import {
  ROSTER_GONE,
  SESSION_MACHINE,
  displayState,
  hookEvent,
  nextPhase,
  phaseFromDisplay,
  rosterEvent,
} from "./session-machine.mjs";

// Hook events can arrive before the session shows up in the roster, and some
// sessions never show up at all (`claude -p`, subagents). Their last state is
// held in a bounded pending map rather than given a slot.
const MAX_PENDING = 32;

/**
 * Converts one Claude hook payload into the display state it stands for when
 * hooks are the only source. Non-blocking notifications and unrecognized events
 * deliberately return null.
 *
 * @param {object|null|undefined} event Normalized hook event.
 * @returns {string|null} A shared `STATES` value, or null for no transition.
 */
export function stateFromHookEvent(event) {
  const name = hookEvent(event);
  return name ? displayState(nextPhase(SESSION_MACHINE.initial, name)) : null;
}

/**
 * Creates the canonical empty, versioned six-slot snapshot.
 *
 * @returns {SlotSnapshot} Fresh mutable snapshot with no shared nested state.
 */
export function emptySnapshot() {
  return {
    version: 2,
    slots: Array.from({ length: SLOT_COUNT }, () => null),
    pending: {},
    dropped: 0,
    overflow: 0,
  };
}

// Fields the reducer kept on a slot before the session machine held that
// knowledge in `phase`.
const LEGACY_FIELDS = ["stateSource", "rosterStatus", "lastHookState", "blockingNotification"];

// A slot written before phases existed, or by hand, is known by its display
// state only: it enters the machine as the hooks-only phase showing that state,
// and the next roster row takes over from there.
function withPhase(entry) {
  const copy = { ...entry };
  for (const field of LEGACY_FIELDS) delete copy[field];
  if (!SESSION_MACHINE.states.includes(copy.phase)) copy.phase = phaseFromDisplay(copy.state);
  copy.state = displayState(copy.phase);
  return copy;
}

// A defensive shallow copy is enough: the entries are flat objects. Slots go
// through `withPhase`, so a snapshot built by hand cannot reach the machine
// without a phase.
function cloneSnapshot(snapshot) {
  return {
    version: 2,
    slots: snapshot.slots.map((entry) => (entry ? withPhase(entry) : null)),
    pending: { ...snapshot.pending },
    dropped: snapshot.dropped ?? 0,
    overflow: snapshot.overflow ?? 0,
  };
}

/**
 * Sanitizes persisted data into the current snapshot shape and slot count.
 * Invalid snapshots fail closed to {@link emptySnapshot}; extra slots vanish.
 * A slot with no valid `phase` is given the one matching its display state.
 *
 * @param {unknown} value Deserialized snapshot candidate.
 * @returns {SlotSnapshot} Defensive copy safe for reducer operations.
 */
export function normalizeSnapshot(value) {
  const base = emptySnapshot();
  if (!value || typeof value !== "object" || !Array.isArray(value.slots)) return base;
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const entry = value.slots[index];
    if (entry && typeof entry === "object" && typeof entry.sessionId === "string") {
      base.slots[index] = withPhase(entry);
    }
  }
  if (value.pending && typeof value.pending === "object") base.pending = { ...value.pending };
  base.dropped = Number.isInteger(value.dropped) ? value.dropped : 0;
  base.overflow = Number.isInteger(value.overflow) ? value.overflow : 0;
  return base;
}

function slotOf(snapshot, sessionId) {
  return snapshot.slots.findIndex((entry) => entry?.sessionId === sessionId);
}

// Eviction order: a free slot, then the oldest closed session, then the oldest
// finished one. A live session that is working, or waiting on a decision, is
// never evicted.
//
// An idle session is evicted last, and only for a newcomer that has something
// to show (`urgent`: working, or waiting on a decision). Six open-but-idle
// sessions must not hide the one that is actually running; and an idle newcomer
// must not evict another idle session, or the two would trade the key on every
// poll.
const EVICTABLE = [STATES.ended, STATES.done];

function claimSlot(snapshot, { urgent = false } = {}) {
  const free = snapshot.slots.indexOf(null);
  if (free !== -1) return free;

  for (const state of urgent ? [...EVICTABLE, STATES.idle] : EVICTABLE) {
    let candidate = -1;
    let oldest = Infinity;
    snapshot.slots.forEach((entry, index) => {
      if (entry?.state === state && entry.updatedAt < oldest) {
        oldest = entry.updatedAt;
        candidate = index;
      }
    });
    if (candidate !== -1) return candidate;
  }
  return -1;
}

function rememberPending(snapshot, sessionId, state) {
  const keys = Object.keys(snapshot.pending);
  if (!(sessionId in snapshot.pending) && keys.length >= MAX_PENDING) {
    delete snapshot.pending[keys[0]];
    snapshot.dropped += 1;
  }
  snapshot.pending[sessionId] = state;
}

// Sends one event to a slot's machine. Returns whether the display changed,
// which is also when `updatedAt` moves: a phase can change without the key
// changing, and that must neither republish nor reorder evictions.
function move(entry, event, now) {
  entry.phase = nextPhase(entry.phase, event);
  const shown = displayState(entry.phase);
  if (shown === entry.state) return false;
  entry.state = shown;
  entry.updatedAt = now;
  return true;
}

/**
 * Applies a hook transition without mutating the input snapshot. A session
 * missing from the roster gets no slot: its state remains pending until roster
 * membership is confirmed.
 *
 * @param {SlotSnapshot} snapshot Current reducer state.
 * @param {object} event Normalized hook event with a `sessionId` when addressable.
 * @param {number} [now=0] Timestamp recorded on an applied transition.
 * @returns {{snapshot: SlotSnapshot, changed: boolean}} Next state and render hint.
 */
export function applyHookEvent(snapshot, event, now = 0) {
  const next = cloneSnapshot(snapshot);
  const sessionId = event?.sessionId;
  const name = hookEvent(event);
  if (typeof sessionId !== "string" || !name) return { snapshot: next, changed: false };

  const index = slotOf(next, sessionId);
  if (index === -1) {
    rememberPending(next, sessionId, stateFromHookEvent(event));
    return { snapshot: next, changed: false };
  }

  const entry = next.slots[index];
  // A closed session is the roster's to reopen: a late hook changes nothing,
  // not even the age its slot is evicted by.
  if (entry.phase === "ended") return { snapshot: next, changed: false };

  const changed = move(entry, name, now);
  // A hook is a sign of life: it keeps an idle session's key from being the
  // first one given up, whether or not the display moved.
  entry.updatedAt = now;
  if (event.hostSessionId) entry.hostSessionId = event.hostSessionId;
  if (event.entrypoint) entry.entrypoint = event.entrypoint;
  if (Number.isInteger(event.pid)) entry.pid = event.pid;
  return { snapshot: next, changed };
}

/**
 * Reconciles the authoritative roster without mutating the input snapshot.
 * Missing sessions are assigned or promoted; disappeared processes become
 * `ended`, while active and blocked sessions are never evicted.
 *
 * @param {SlotSnapshot} snapshot Current reducer state.
 * @param {object[]} roster Rows from `claude agents --json`, optionally enriched
 * with `tty`, `terminalApp` and `configDir` by the caller. A row's `status`
 * (`busy` / `idle` / `waiting`) is sent to the session machine as a roster
 * event; a row without one, or with a status never measured, as `roster.silent`.
 * @param {number} [now=0] Timestamp recorded on membership changes.
 * @returns {{snapshot: SlotSnapshot, changed: boolean, notes: string[]}}
 * Next state, render hint, and explicit overflow diagnostics.
 */
export function applyRoster(snapshot, roster, now = 0) {
  const next = cloneSnapshot(snapshot);
  const rows = Array.isArray(roster) ? roster.filter((row) => typeof row?.sessionId === "string") : [];
  const live = new Set(rows.map((row) => row.sessionId));
  const notes = [];
  let changed = false;
  // Recounted on every pass: it is the number of live sessions without a key
  // right now, not a tally of polls.
  next.overflow = 0;

  for (const row of rows) {
    let index = slotOf(next, row.sessionId);
    if (index === -1) {
      const promoted = next.pending[row.sessionId];
      const urgent = promoted
        ? promoted === STATES.running || promoted === STATES.blocked
        : row.status === "busy" || row.status === "waiting";
      index = claimSlot(next, { urgent });
      if (index === -1) {
        next.overflow += 1;
        notes.push(`No free slot for session ${row.sessionId}.`);
        continue;
      }
      delete next.pending[row.sessionId];
      // A hook that fired before the roster listed the session is where its
      // machine starts; the row's status is applied below like any other.
      const phase = phaseFromDisplay(promoted);
      next.slots[index] = { sessionId: row.sessionId, phase, state: displayState(phase), updatedAt: now };
      changed = true;
    }

    const entry = next.slots[index];
    for (const field of ["name", "cwd", "pid", "kind", "startedAt", "tty", "terminalApp", "configDir"]) {
      if (row[field] !== undefined && entry[field] !== row[field]) {
        entry[field] = row[field];
        changed = true;
      }
    }
    if (move(entry, rosterEvent(row.status), now)) changed = true;
  }

  next.slots.forEach((entry) => {
    if (!entry || live.has(entry.sessionId)) return;
    if (move(entry, ROSTER_GONE, now)) changed = true;
  });

  return { snapshot: next, changed, notes };
}

/**
 * Projects reducer state into the six rows consumed by CLI rendering and HID
 * lighting, preserving the underlying slot entry for navigation.
 *
 * @param {SlotSnapshot} snapshot Current reducer state.
 * @returns {Array<{slot: number, control: string, state: string, color: string|null, entry: SessionSlot|null}>}
 * Rows in physical Agent-key order.
 */
export function slotView(snapshot) {
  return snapshot.slots.map((entry, index) => ({
    slot: index + 1,
    control: SLOT_CONTROLS[index],
    state: entry?.state ?? STATES.free,
    color: STATE_COLORS[entry?.state ?? STATES.free],
    entry,
  }));
}

/**
 * Normalises the terminal reported by `ps -o tty=` into a device path.
 *
 * macOS already returns the prefixed form (`ttys001`), where other BSDs return
 * the short form (`s001`). Prefixing `/dev/tty` without telling the two apart
 * produced `/dev/ttyttys001`: a path that does not exist, which the focus
 * AppleScript compared against each window's real `tty` and could never match.
 * The only navigable sessions were therefore all failing with "window not
 * found".
 *
 * @param {string|null|undefined} tty Terminal name from `ps -o tty=`.
 * @returns {string|null} Absolute device path, or null for non-terminal hosts.
 */
export function ttyDevice(tty) {
  if (!tty || tty === "??" || tty === "-") return null;
  if (tty.startsWith("/dev/")) return tty;
  return tty.startsWith("tty") ? `/dev/${tty}` : `/dev/tty${tty}`;
}

/**
 * The `session` of `claude://resume` is validated against a strict UUID regex
 * before being resumed. An id of any other shape is rejected by the
 * application, so the URL is only built for what the handler will accept.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Turns a slot into a navigation action. Decides nothing irreversible and
 * invents no route: a session we do not know how to reach returns `unsupported`
 * rather than a guessed URL.
 *
 * A session with no `tty` is hosted by Claude Desktop. `claude://resume`
 * addresses it by its `sessionId` — the roster's, not the `hostSessionId`,
 * which groups several sessions and addresses none of them.
 *
 * @param {SessionSlot|null|undefined} entry Slot entry to route.
 * @returns {NavigationTarget} Evidence-backed route decision with no side effect.
 */
export function resolveNavigation(entry) {
  if (!entry) return { kind: "empty" };
  if (entry.state === STATES.ended) {
    return { kind: "resume", sessionId: entry.sessionId, cwd: entry.cwd ?? null, name: entry.name ?? null };
  }
  if (entry.tty) {
    return { kind: "terminal", tty: entry.tty, app: entry.terminalApp ?? null, sessionId: entry.sessionId };
  }
  if (UUID.test(entry.sessionId ?? "")) {
    return {
      kind: "desktop",
      sessionId: entry.sessionId,
      url: `claude://resume?session=${entry.sessionId}`,
      entrypoint: entry.entrypoint ?? null,
      hostSessionId: entry.hostSessionId ?? null,
    };
  }
  return {
    kind: "unsupported",
    sessionId: entry.sessionId,
    entrypoint: entry.entrypoint ?? null,
    hostSessionId: entry.hostSessionId ?? null,
    reason: "Session with no terminal and no UUID id: `claude://resume` would reject this target.",
  };
}
