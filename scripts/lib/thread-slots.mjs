// Réduction des sessions Claude Code vivantes à six emplacements physiques, un
// par touche Agent du Codex Micro.
//
// Le module est volontairement pur : il ne lance aucun processus, n'écrit aucun
// fichier et ne lit aucun transcript. Toute la logique d'attribution et de
// transition est donc testable sans Claude en cours d'exécution.
//
// Deux sources alimentent le réducteur, et elles ne sont pas interchangeables :
//
//   - le roster (`claude agents --json`) est l'autorité sur l'appartenance :
//     lui seul décide quelle session occupe un emplacement ;
//   - les hooks sont l'autorité sur l'état : eux seuls savent si un tour est en
//     cours, terminé ou bloqué sur une décision.
//
// Cette séparation n'est pas esthétique. Un hook manqué (crash, `kill -9`) fige
// l'état à `running` pour toujours ; le roster le rattrape. Inversement le
// roster ne publie aucun état ; les hooks le fournissent instantanément.

export const SLOT_COUNT = 6;

// Les six touches Agent, dans l'ordre de lecture physique : rangée du haut
// (deux touches) puis rangée suivante (quatre touches). Les identifiants
// proviennent de KEY_CONTROL_LOCATIONS dans shared/input-profile.mjs.
export const SLOT_CONTROLS = Object.freeze(["key-9", "key-10", "key-5", "key-6", "key-7", "key-8"]);

// Réexportées depuis shared/, où elles sont la source unique de vérité : le GUI
// affiche la même légende, et une palette dupliquée finirait par diverger.
export { LEGEND_ORDER, STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";
import { STATE_COLORS, STATES } from "../../shared/thread-status-palette.mjs";

// Les types de notification qui exigent une action humaine. Tout autre type
// (`auth_success`, `elicitation_complete`…) ne change pas l'état : un témoin
// rouge doit signifier « on t'attend », rien d'autre.
const BLOCKING_NOTIFICATIONS = new Set([
  "permission_prompt",
  "agent_needs_input",
  "elicitation_dialog",
]);

// Les événements de hook peuvent précéder l'apparition de la session dans le
// roster, et certaines sessions n'y apparaissent jamais (`claude -p`, sous-agents).
// On garde leur dernier état en attente, borné, plutôt que de leur ouvrir un
// emplacement.
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

// Une copie défensive suffit : les entrées sont des objets plats.
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

// Ordre d'éviction : un emplacement libre, puis la session terminée la plus
// ancienne, puis la session au repos la plus ancienne. Une session vivante qui
// travaille ou qui attend une décision n'est jamais évincée.
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
 * Applique un événement de hook. Une session absente du roster ne reçoit pas
 * d'emplacement : son état est mis en attente et sera promu si le roster la
 * confirme.
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
  // Un `Stop` qui suit un `blocked` est légitime : la décision a été prise et le
  // tour s'est terminé. Aucune transition n'est donc interdite ici, on garde
  // seulement la trace du moment du changement.
  const changed = entry.state !== state;
  entry.state = state;
  entry.updatedAt = now;
  if (event.hostSessionId) entry.hostSessionId = event.hostSessionId;
  if (event.entrypoint) entry.entrypoint = event.entrypoint;
  if (Number.isInteger(event.pid)) entry.pid = event.pid;
  return { snapshot: next, changed };
}

/**
 * Réconcilie le roster officiel. Crée les entrées manquantes, rafraîchit les
 * métadonnées, et marque `ended` toute session dont le processus a disparu.
 *
 * @param roster tableau de `claude agents --json`, éventuellement enrichi d'un
 *   champ `tty` et `terminalApp` par l'appelant.
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
        notes.push(`Aucun emplacement libre pour la session ${row.sessionId}.`);
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
    // Le processus est revenu dans le roster alors qu'on l'avait déclaré mort :
    // le cas n'est pas censé arriver, mais le roster reste l'autorité.
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
 * Normalise le terminal rapporté par `ps -o tty=` en chemin de périphérique.
 *
 * macOS renvoie déjà la forme préfixée (`ttys001`), là où d'autres BSD renvoient
 * la forme courte (`s001`). Préfixer `/dev/tty` sans distinguer les deux
 * fabriquait `/dev/ttyttys001` : un chemin inexistant, que l'AppleScript de
 * focus comparait au `tty` réel de chaque fenêtre sans jamais pouvoir
 * correspondre. Les seules sessions pourtant navigables échouaient donc toutes
 * en « fenêtre introuvable ».
 */
export function ttyDevice(tty) {
  if (!tty || tty === "??" || tty === "-") return null;
  if (tty.startsWith("/dev/")) return tty;
  return tty.startsWith("tty") ? `/dev/${tty}` : `/dev/tty${tty}`;
}

/**
 * Le `session` de `claude://resume` est validé par une regex UUID stricte avant
 * d'être repris. Un identifiant d'une autre forme est refusé par l'application :
 * on ne fabrique donc l'URL que pour ce que le handler acceptera.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Traduit un emplacement en action de navigation. Ne décide rien d'irréversible
 * et n'invente aucune route : une session que l'on ne sait pas atteindre renvoie
 * `unsupported` plutôt qu'une URL supposée.
 *
 * Une session sans `tty` est hébergée par Claude Desktop. `claude://resume` la
 * désigne par son `sessionId` — celui du roster, pas le `hostSessionId`, qui
 * regroupe plusieurs sessions et n'en adresse aucune.
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
    reason: "Session sans terminal et sans identifiant UUID : `claude://resume` refuserait cette cible.",
  };
}
