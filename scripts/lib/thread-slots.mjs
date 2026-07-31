// Reduces the live Claude Code sessions to six physical slots, one per Agent key
// on the Codex Micro.
//
// The module is deliberately pure: it spawns no process, writes no file and
// reads no transcript. All the assignment and transition logic is therefore
// testable without a running Claude.
//
// Two sources feed the reducer, and they are not interchangeable:
//
//   - the roster (`claude agents --json`) is the authority on membership: it
//     alone decides which session occupies a slot;
//   - the hooks are the authority on state: they alone know whether a turn is
//     running, finished, or blocked on a decision.
//
// This separation is not cosmetic. A missed hook (crash, `kill -9`) would pin
// the state to `running` forever; the roster catches that. Conversely the roster
// publishes no state at all; the hooks deliver it instantly.

export const SLOT_COUNT = 6;

// The six Agent keys, in physical reading order: top row (two keys) then the
// next row (four keys). The ids come from KEY_CONTROL_LOCATIONS in
// shared/input-profile.mjs.
export const SLOT_CONTROLS = Object.freeze(["key-9", "key-10", "key-5", "key-6", "key-7", "key-8"]);

// Re-exported from shared/, where they are the single source of truth: the GUI
// shows the same legend, and a duplicated palette would end up diverging.
export { LEGEND_ORDER, STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";
import { STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";

// The notification types that require a human. Any other type
// (`auth_success`, `elicitation_complete`…) leaves the state alone: a red light
// has to mean "you are being waited for", and nothing else.
const BLOCKING_NOTIFICATIONS = new Set([
  "permission_prompt",
  "agent_needs_input",
  "elicitation_dialog",
]);

// Hook events can arrive before the session shows up in the roster, and some
// sessions never show up at all (`claude -p`, subagents). Their last state is
// held in a bounded pending map rather than given a slot.
const MAX_PENDING = 32;

export function stateFromHookEvent(event) {
  switch (event?.event) {
    case "SessionStart":
      return STATES.idle;
    case "UserPromptSubmit":
      return STATES.running;
    case "Notification":
      if (BLOCKING_NOTIFICATIONS.has(event.notificationType)) return STATES.blocked;
      if (event.notificationType === "idle_prompt") return STATES.idle;
      return null;
    case "Stop":
      return STATES.done;
    case "SessionEnd":
      return STATES.ended;
    default:
      return null;
  }
}

export function emptySnapshot() {
  return {
    version: 1,
    slots: Array.from({ length: SLOT_COUNT }, () => null),
    pending: {},
    dropped: 0,
    overflow: 0,
  };
}

// A defensive shallow copy is enough: the entries are flat objects.
function cloneSnapshot(snapshot) {
  return {
    version: 1,
    slots: snapshot.slots.map((entry) => (entry ? { ...entry } : null)),
    pending: { ...snapshot.pending },
    dropped: snapshot.dropped ?? 0,
    overflow: snapshot.overflow ?? 0,
  };
}

export function normalizeSnapshot(value) {
  const base = emptySnapshot();
  if (!value || typeof value !== "object" || !Array.isArray(value.slots)) return base;
  for (let index = 0; index < SLOT_COUNT; index += 1) {
    const entry = value.slots[index];
    if (entry && typeof entry === "object" && typeof entry.sessionId === "string") {
      base.slots[index] = { ...entry };
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
const EVICTABLE = [STATES.ended, STATES.done];

function claimSlot(snapshot) {
  const free = snapshot.slots.indexOf(null);
  if (free !== -1) return free;

  for (const state of EVICTABLE) {
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

/**
 * Applies a hook event. A session missing from the roster gets no slot: its
 * state is held pending, and gets promoted if the roster later confirms it.
 */
export function applyHookEvent(snapshot, event, now = 0) {
  const next = cloneSnapshot(snapshot);
  const sessionId = event?.sessionId;
  const state = stateFromHookEvent(event);
  if (typeof sessionId !== "string" || !state) return { snapshot: next, changed: false };

  const index = slotOf(next, sessionId);
  if (index === -1) {
    rememberPending(next, sessionId, state);
    return { snapshot: next, changed: false };
  }

  const entry = next.slots[index];
  // A `Stop` following a `blocked` is legitimate: the decision was made and the
  // turn ended. No transition is forbidden here, then — only the moment of the
  // change is recorded.
  const changed = entry.state !== state;
  entry.state = state;
  entry.updatedAt = now;
  if (event.hostSessionId) entry.hostSessionId = event.hostSessionId;
  if (event.entrypoint) entry.entrypoint = event.entrypoint;
  if (Number.isInteger(event.pid)) entry.pid = event.pid;
  return { snapshot: next, changed };
}

/**
 * Reconciles the official roster. Creates the missing entries, refreshes the
 * metadata, and marks `ended` any session whose process has disappeared.
 *
 * @param roster array from `claude agents --json`, optionally enriched with
 *   `tty` and `terminalApp` fields by the caller.
 */
export function applyRoster(snapshot, roster, now = 0) {
  const next = cloneSnapshot(snapshot);
  const rows = Array.isArray(roster) ? roster.filter((row) => typeof row?.sessionId === "string") : [];
  const live = new Set(rows.map((row) => row.sessionId));
  const notes = [];
  let changed = false;

  for (const row of rows) {
    let index = slotOf(next, row.sessionId);
    if (index === -1) {
      index = claimSlot(next);
      if (index === -1) {
        next.overflow += 1;
        notes.push(`No free slot for session ${row.sessionId}.`);
        continue;
      }
      const promoted = next.pending[row.sessionId];
      delete next.pending[row.sessionId];
      next.slots[index] = {
        sessionId: row.sessionId,
        state: promoted ?? STATES.idle,
        updatedAt: now,
      };
      changed = true;
    }

    const entry = next.slots[index];
    for (const field of ["name", "cwd", "pid", "kind", "startedAt", "tty", "terminalApp"]) {
      if (row[field] !== undefined && entry[field] !== row[field]) {
        entry[field] = row[field];
        changed = true;
      }
    }
    // The process came back into the roster after we had declared it dead: this
    // is not supposed to happen, but the roster remains the authority.
    if (entry.state === STATES.ended) {
      entry.state = STATES.idle;
      entry.updatedAt = now;
      changed = true;
    }
  }

  next.slots.forEach((entry) => {
    if (!entry || live.has(entry.sessionId) || entry.state === STATES.ended) return;
    entry.state = STATES.ended;
    entry.updatedAt = now;
    changed = true;
  });

  return { snapshot: next, changed, notes };
}

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
