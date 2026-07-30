// Palette des états de session Claude Code, partagée entre l'outillage Node et le
// GUI. Elle vit dans `shared/` parce que c'est la seule chose que les deux côtés
// ont besoin de connaître en commun : le réducteur reste dans `scripts/lib/`, où
// le GUI n'a rien à aller chercher.
//
// Source unique de vérité. `scripts/lib/thread-slots.mjs` la réexporte pour ne
// pas casser ses importateurs, et le GUI l'importe pour afficher sa légende — les
// deux ne peuvent donc pas diverger.

export const STATES = Object.freeze({
  free: "free",
  idle: "idle",
  running: "running",
  blocked: "blocked",
  done: "done",
  ended: "ended",
});

// Teintes reprises de la palette du dépôt. `blocked` est la seule ajoutée :
// aucune couleur existante ne signifiait « une décision est attendue ».
// `free` vaut `null` : un emplacement libre est éteint, pas coloré.
export const STATE_COLORS = Object.freeze({
  free: null,
  idle: "#6D5A7D",
  running: "#D97757",
  blocked: "#C2483D",
  done: "#5B8C6F",
  ended: "#2F2927",
});

// Ordre de lecture pour une légende : du plus urgent au plus inerte. Ce n'est pas
// l'ordre de `STATES`, qui suit le cycle de vie d'une session.
export const LEGEND_ORDER = Object.freeze([
  STATES.blocked,
  STATES.running,
  STATES.done,
  STATES.idle,
  STATES.ended,
  STATES.free,
]);
