// Modèle d'éclairage du Codex Micro, réimplémenté d'après le format observé
// et documenté dans docs/research/hid-lighting-protocol.md. Code original.
//
// Deux méthodes JSON-RPC vendeur couvrent l'éclairage :
//
//   v.oai.thstatus  éclairage par emplacement (« thread ») : les six touches
//                   Agent, adressées par `id`, mises à jour partielles
//                   possibles — un champ omis reste inchangé sur le
//                   périphérique ;
//   v.oai.rgbcfg    deux zones globales : `ambient` (anneau extérieur) et
//                   `keys` (sous les keycaps).
//
// Le module est pur : il ne produit que des objets de paramètres, sans I/O.

import { SLOT_CONTROLS, STATE_COLORS, STATES } from "./thread-slots.mjs";

export const METHODS = Object.freeze({
  threadsLighting: "v.oai.thstatus",
  rgbConfig: "v.oai.rgbcfg",
  notifyHid: "v.oai.hid",
  notifyJoystick: "v.oai.rad",
});

// Effets d'animation du firmware. `solid` est le seul utile pour un témoin
// d'état stable ; les autres sont exposés pour les usages libres.
export const EFFECTS = Object.freeze({
  off: 0,
  solid: 1,
  snake: 2,
  rainbow: 3,
  breath: 4,
  gradient: 5,
  shallowBreath: 6,
});

// Correspondance emplacement → identifiant de thread sur le canal. CONFIRMÉE sur
// matériel par `node scripts/lighting.mjs probe --delay=3000`, qui allume les
// touches une par une : la séquence des identifiants 0 à 5 suit exactement
// l'ordre physique de SLOT_CONTROLS — les deux touches de la rangée du haut, de
// gauche à droite, puis les quatre de la rangée suivante.
export const SLOT_THREAD_IDS = Object.freeze(SLOT_CONTROLS.map((_, index) => index));

// « #D97757 » → 0xD97757. Le canal attend un entier RGB compacté.
export function colorToInt(color) {
  if (typeof color === "number" && Number.isInteger(color) && color >= 0 && color <= 0xffffff) {
    return color;
  }
  const match = typeof color === "string" && color.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) throw new Error(`Couleur attendue au format #RRGGBB : ${color}`);
  return Number.parseInt(match[1], 16);
}

function clampUnit(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`${name} attendu entre 0 et 1 : ${value}`);
  }
  return value;
}

// Une entrée d'éclairage par emplacement. Seul `id` est obligatoire ; chaque
// champ optionnel omis laisse le paramètre correspondant inchangé. Les clés
// minimisées (`c`, `b`, `e`, `s`, `sk`, `sa`) sont le format du canal.
export function threadEntry({ id, color, brightness, effect, speed, syncKeysLighting, syncAmbientLighting }) {
  if (!Number.isInteger(id) || id < 0) throw new Error(`Identifiant de thread attendu entier ≥ 0 : ${id}`);
  const entry = { id };
  if (color !== undefined && color !== null) entry.c = colorToInt(color);
  if (brightness !== undefined) entry.b = clampUnit("brightness", brightness);
  if (effect !== undefined) {
    if (!Object.values(EFFECTS).includes(effect)) throw new Error(`Effet inconnu : ${effect}`);
    entry.e = effect;
  }
  if (speed !== undefined) entry.s = clampUnit("speed", speed);
  if (syncKeysLighting !== undefined) entry.sk = syncKeysLighting ? 1 : 0;
  if (syncAmbientLighting !== undefined) entry.sa = syncAmbientLighting ? 1 : 0;
  return entry;
}

// Paramètres de v.oai.thstatus : un tableau d'entrées, une par emplacement.
export function threadsLightingParams(entries) {
  return entries.map(threadEntry);
}

// Une zone de v.oai.rgbcfg. Les cinq champs sont obligatoires : la méthode
// décrit une configuration complète de zone, pas une mise à jour partielle.
export function zoneSide({ effect, brightness, speed, magic, color }) {
  return {
    e: effect,
    b: clampUnit("brightness", brightness),
    s: clampUnit("speed", speed),
    m: magic,
    c: colorToInt(color),
  };
}

export function rgbConfigParams({ ambient, keys }) {
  return { ambient: zoneSide(ambient), keys: zoneSide(keys) };
}

// Traduction des six emplacements de thread-status en entrées thstatus.
// Un emplacement libre est éteint (brightness 0) ; les autres portent la
// couleur d'état de la palette du dépôt en effet fixe.
export function slotsToThreadEntries(rows, { brightness = 1 } = {}) {
  if (!Array.isArray(rows) || rows.length !== SLOT_CONTROLS.length) {
    throw new Error(`${SLOT_CONTROLS.length} emplacements attendus.`);
  }
  return rows.map((row, index) => {
    const state = row?.state ?? STATES.free;
    const color = STATE_COLORS[state] ?? null;
    if (color === null) return threadEntry({ id: SLOT_THREAD_IDS[index], brightness: 0 });
    return threadEntry({ id: SLOT_THREAD_IDS[index], color, brightness, effect: EFFECTS.solid });
  });
}

// Éteint les six emplacements sans toucher aux autres paramètres.
export function allOffParams() {
  return SLOT_THREAD_IDS.map((id) => threadEntry({ id, brightness: 0 }));
}
