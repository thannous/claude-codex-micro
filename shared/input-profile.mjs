const DEVICE_TYPE = "codex_micro";
const TARGET_LAYER_NAME = "Claude";

/** Supported shortcut modifier names mapped to Work Louder keycodes. */
const MODIFIER_KEYCODES = {
  Command: "KC_LGUI",
  Shift: "KC_LSFT",
  Option: "KC_LALT",
  Control: "KC_LCTL",
};

/**
 * Allowlisted final shortcut keys mapped to Work Louder keycodes. Send,
 * deletion, and approval keys are deliberately absent from this public API.
 */
const FINAL_KEYCODES = {
  ...Object.fromEntries(
    Array.from({ length: 26 }, (_, index) => {
      const letter = String.fromCharCode(65 + index);
      return [letter, `KC_${letter}`];
    }),
  ),
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, digit) => [String(digit), `KC_${digit}`]),
  ),
  ...Object.fromEntries(
    Array.from({ length: 12 }, (_, index) => [`F${index + 1}`, `KC_F${index + 1}`]),
  ),
  ArrowUp: "KC_UP",
  ArrowDown: "KC_DOWN",
  ArrowLeft: "KC_LEFT",
  ArrowRight: "KC_RGHT",
  PageUp: "KC_PGUP",
  PageDown: "KC_PGDN",
  Home: "KC_HOME",
  End: "KC_END",
  Escape: "KC_ESC",
  Space: "KC_SPC",
  Tab: "KC_TAB",
  Comma: "KC_COMM",
  BracketLeft: "KC_LBRC",
  BracketRight: "KC_RBRC",
  Equal: "KC_EQL",
  Minus: "KC_MINS",
};

const FINAL_KEY_BY_KEYCODE = Object.fromEntries(
  Object.entries(FINAL_KEYCODES).map(([key, keycode]) => [keycode, key]),
);

const MODIFIER_KEY_BY_KEYCODE = Object.fromEntries(
  Object.entries(MODIFIER_KEYCODES).map(([key, keycode]) => [keycode, key]),
);

/** Final keys rejected even if a caller attempts to bypass the GUI catalogue. */
const FORBIDDEN_KEYS = Object.freeze(["Enter", "Return", "Delete", "Backspace"]);

/** Printable final keys that require at least one modifier for safe assignment. */
const PRINTABLE_KEYS = new Set([
  ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(65 + index)),
  ...Array.from({ length: 10 }, (_, digit) => String(digit)),
  "Space",
  "Comma",
  "BracketLeft",
  "BracketRight",
  "Equal",
  "Minus",
]);

/**
 * Public control ids mapped to physical profile cells. The layer-change sensor
 * is intentionally absent so transformations cannot overwrite it.
 */
const KEY_CONTROL_LOCATIONS = Object.freeze({
  "key-9": { row: 0, column: 0 },
  "key-10": { row: 0, column: 1 },
  "key-5": { row: 1, column: 0 },
  "key-6": { row: 1, column: 1 },
  "key-7": { row: 1, column: 2 },
  "key-8": { row: 1, column: 3 },
  "key-1": { row: 2, column: 0 },
  "key-2": { row: 2, column: 1 },
  "key-3": { row: 2, column: 2 },
  "key-4": { row: 2, column: 3 },
  "key-11": { row: 3, column: 1 },
  "key-12": { row: 3, column: 2 },
});
/** Physical key controls in deterministic transformation and reporting order. */
const KEY_CONTROL_ORDER = Object.keys(KEY_CONTROL_LOCATIONS);

/** Control id for the press cell of the top-left rotary encoder. */
const ENCODER_PRESS_CONTROL = "key-13";

/** Safe Claude mapping applied when callers do not provide an override. */
const DEFAULT_MAPPING = {
  joystick: "navigation",
  // The wheel is in Effort mode by default: that is this board's distinctive
  // gesture for Claude, and it is calibrated and documented (see
  // docs/research/effort-wheel-calibration.md). The other modes stay available
  // in the GUI, scrolling included.
  wheel: "effort",
  "key-9": "none",
  "key-10": "none",
  "key-5": "none",
  "key-6": "none",
  "key-7": "none",
  "key-8": "none",
  "key-1": "newSession",
  "key-2": "voice",
  "key-3": "diff",
  "key-4": "stop",
  "key-11": "none",
  "key-12": "none",
  "key-13": "none",
};

/** Canonical catalogue actions understood by the profile transformer. */
const ACTION_DEFINITIONS = {
  newSession: {
    name: "Claude New",
    type: "shortcut",
    keys: ["Command", "N"],
  },
  // Sending stays forbidden in the custom editor. These two definitions are
  // deliberate, named catalogue actions that mirror Claude Desktop exactly.
  send: {
    name: "Claude Send",
    type: "directKeycode",
    keycode: "KC_ENT",
  },
  sendInDuplicateSession: {
    name: "Claude Send in Duplicate Session",
    type: "sequence",
    keyInputs: [
      { keycode: "KC_LALT", delay: 0, actionType: 1 },
      { keycode: "KC_LGUI", delay: 0, actionType: 1 },
      { keycode: "KC_ENT", delay: 0, actionType: 2 },
      { keycode: "KC_LGUI", delay: 0, actionType: 0 },
      { keycode: "KC_LALT", delay: 0, actionType: 0 },
    ],
  },
  voice: {
    name: "Claude Voice",
    type: "shortcut",
    keys: ["Command", "D"],
  },
  diff: {
    name: "Claude Diff",
    type: "shortcut",
    keys: ["Command", "Shift", "D"],
  },
  stop: {
    name: "Claude Stop",
    type: "direct",
    key: "Escape",
  },
  // Cycles through the sessions of Claude Desktop's Code tab. The documentation
  // states that this shortcut uses Control on every platform, unlike the
  // others. There is no shortcut to pick a session by its rank: only cycling is
  // addressable.
  nextSession: {
    name: "Claude Next Session",
    type: "shortcut",
    keys: ["Control", "Tab"],
  },
  previousSession: {
    name: "Claude Previous Session",
    type: "shortcut",
    keys: ["Control", "Shift", "Tab"],
  },
  // Opens the effort menu, where the digits 1 to 9 select an entry.
  effortMenu: {
    name: "Claude Effort Menu",
    type: "shortcut",
    keys: ["Command", "Shift", "E"],
  },
  settings: {
    name: "Claude Settings",
    type: "shortcut",
    keys: ["Command", "Comma"],
  },
  find: {
    name: "Claude Find",
    type: "shortcut",
    keys: ["Command", "F"],
  },
  findNext: {
    name: "Claude Find Next",
    type: "shortcut",
    keys: ["Command", "G"],
  },
  findPrevious: {
    name: "Claude Find Previous",
    type: "shortcut",
    keys: ["Command", "Shift", "G"],
  },
  back: {
    name: "Claude Back",
    type: "shortcut",
    keys: ["Command", "BracketLeft"],
  },
  forward: {
    name: "Claude Forward",
    type: "shortcut",
    keys: ["Command", "BracketRight"],
  },
  reload: {
    name: "Claude Reload",
    type: "shortcut",
    keys: ["Command", "R"],
  },
  closeWindow: {
    name: "Claude Close Window",
    type: "shortcut",
    keys: ["Command", "W"],
  },
  zoomIn: {
    name: "Claude Zoom In",
    type: "shortcut",
    keys: ["Command", "Shift", "Equal"],
  },
  zoomOut: {
    name: "Claude Zoom Out",
    type: "shortcut",
    keys: ["Command", "Minus"],
  },
  resetZoom: {
    name: "Claude Reset Zoom",
    type: "shortcut",
    keys: ["Command", "0"],
  },
  none: {
    name: "None",
    type: "none",
  },
};

// Time given to the effort picker to appear, in milliseconds.
//
// Input does not document whether `delay` applies before or after its step, and
// no source settles it: the field is passed verbatim to the firmware, which
// alone interprets it. The macro sidesteps the question by its shape rather
// than by a measurement. All of the wait is placed on the ⌘ release and the
// arrow gets 0, which makes both readings equivalent:
//
//   - "after" reading:  ⌘ released, wait, arrow  -> picker gets this delay
//   - "before" reading: wait, ⌘ released, arrow  -> picker gets this delay
//
// Same margin and same total duration either way. Do not split this wait across
// both steps: that doubles the opening delay and guarantees nothing more.
//
// Hardware calibration, descending scale tested on the Codex Micro: 40ms holds,
// 20ms fails. The chosen value doubles that measured floor. The opening delay is
// therefore 80ms, plus the 10ms of visual feedback below, against 900ms for the
// first version of the macro.
//
// Going lower fails quietly: the arrow leaves before the picker has focus and
// the level change is lost without a trace. Any further reduction must be
// validated over several repetitions AND on a cold first open, coming back from
// another application.
const EFFORT_PICKER_DELAY_MS = 80;

// Wait carried by the Escape step, in milliseconds. It serves visual feedback,
// not reliability, and must not be dropped to 0.
//
// Without it, the arrow and Escape are emitted with no gap and Claude handles
// them in the same loop turn: the picker opens and closes without ever painting
// a frame showing the slider at its new level. Effort then changes blind, and
// the visible effect is a mere flicker. 10ms is enough to let one frame through,
// and the level reached becomes readable.
//
// This wait is paid AFTER the level has changed: it lengthens the macro without
// delaying its effect. That is also what indicates `delay` applies before its
// step and not after — under the "after" reading these 10ms would be dead time
// at the end of the macro and would change nothing on screen.
const EFFORT_FEEDBACK_DELAY_MS = 10;

/**
 * Supported wheel modes and their physical clockwise/counterclockwise outputs.
 * Experimental modes are marked in their value rather than silently enabled.
 */
const WHEEL_MODES = {
  scroll: { counterClockwise: "KC_PGUP", clockwise: "KC_PGDN" },
  effort: {
    counterClockwise: {
      name: "Claude Effort Down",
      keyInputs: buildEffortWheelKeyInputs("KC_LEFT"),
    },
    clockwise: {
      name: "Claude Effort Up",
      keyInputs: buildEffortWheelKeyInputs("KC_RGHT"),
    },
  },
  lines: { counterClockwise: "KC_UP", clockwise: "KC_DOWN" },
  volume: { counterClockwise: "KC_VOLD", clockwise: "KC_VOLU", experimental: true },
  none: null,
};

// These indices are deliberately the opposite of what the vendor names suggest.
// DO NOT "fix" them from the keycode names alone — the mapping below is the one
// confirmed by hardware, twice.
//
// The Codex Micro factory template names the three cells
// ["KV_OAI_ENC_CC", "KV_OAI_ENC_CW", "KV_OAI_ENC_CLK"], so cell 0 reads as
// counterclockwise. On the tested firmware it is not: rotating clockwise fires
// cell 0. Reading the names and swapping these indices reverses the wheel.
//
// Two independent inversions sit between the names and the user, which is why
// this is easy to get wrong:
//   - the firmware delivers the two rotation events swapped relative to the
//     vendor's own cell names;
//   - Input 0.17.3 additionally swaps the "CW" and "CCW" labels in its editor
//     for any three-cell encoder, so its UI disagrees with the keycode names of
//     its own default template. Writing this JSON directly bypasses that bug,
//     which is why the generator must not mirror what the editor displays.
//
// Keep the public wheel semantics physical and intuitive despite all that.
const PHYSICAL_ENCODER_SLOTS = Object.freeze({
  clockwise: 0,
  counterClockwise: 1,
  press: 2,
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message, code) {
  if (!condition) {
    const error = new Error(message);
    if (code) error.code = code;
    throw error;
  }
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function validateCustomKeys(keys) {
  assert(
    Array.isArray(keys) && keys.length > 0,
    "Un raccourci personnalisé doit contenir au moins une touche.",
    "CUSTOM_EMPTY",
  );

  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);

  assert(
    !FORBIDDEN_KEYS.includes(finalKey) && !modifiers.some((key) => FORBIDDEN_KEYS.includes(key)),
    "Retour, Entrée, Suppression et Retour arrière sont interdits par sécurité.",
    "FORBIDDEN_KEY",
  );
  assert(
    FINAL_KEYCODES[finalKey],
    `Touche non prise en charge : ${finalKey}`,
    "UNSUPPORTED_KEY",
  );
  for (const modifier of modifiers) {
    assert(
      MODIFIER_KEYCODES[modifier],
      `Modificateur non pris en charge : ${modifier}`,
      "UNSUPPORTED_MODIFIER",
    );
  }
  assert(
    modifiers.length > 0 || !PRINTABLE_KEYS.has(finalKey),
    "Une touche imprimable seule doit être combinée à un modificateur.",
    "PRINTABLE_NEEDS_MODIFIER",
  );

  return { modifiers, finalKey };
}

function buildKeyInputs(keys) {
  const { modifiers, finalKey } = validateCustomKeys(keys);

  return [
    ...modifiers.map((key) => ({
      keycode: MODIFIER_KEYCODES[key],
      delay: 0,
      actionType: 1,
    })),
    {
      keycode: FINAL_KEYCODES[finalKey],
      delay: 0,
      actionType: 2,
    },
    ...modifiers
      .slice()
      .reverse()
      .map((key) => ({
        keycode: MODIFIER_KEYCODES[key],
        delay: 0,
        actionType: 0,
      })),
  ];
}

// Claude Desktop opens the effort picker with ⌘⇧E. Its ARIA slider then takes
// left/right to move to the previous or next available level. ⌘⇧E is a toggle,
// verified on Claude Desktop: every notch must therefore close the picker with
// Escape, otherwise the next notch closes it instead of opening it and the level
// is skipped.
//
// The picker renders asynchronously, so it has to be waited for before sending
// the arrow: EFFORT_PICKER_DELAY_MS, carried by the ⌘ release alone. Then it has
// to be allowed to paint the level reached before closing:
// EFFORT_FEEDBACK_DELAY_MS, carried by Escape. The arrow step stays at 0, and
// that is what makes both possible readings of `delay` equivalent.
function buildEffortWheelKeyInputs(directionKeycode) {
  return [
    { keycode: "KC_LGUI", delay: 0, actionType: 1 },
    { keycode: "KC_LSFT", delay: 0, actionType: 1 },
    { keycode: "KC_E", delay: 0, actionType: 2 },
    { keycode: "KC_LSFT", delay: 0, actionType: 0 },
    { keycode: "KC_LGUI", delay: EFFORT_PICKER_DELAY_MS, actionType: 0 },
    { keycode: directionKeycode, delay: 0, actionType: 2 },
    { keycode: "KC_ESC", delay: EFFORT_FEEDBACK_DELAY_MS, actionType: 2 },
  ];
}

function decodeKeyInputs(keyInputs) {
  if (!Array.isArray(keyInputs) || keyInputs.length % 2 !== 1) return null;

  const modifierCount = (keyInputs.length - 1) / 2;
  const keys = [];

  for (let index = 0; index < modifierCount; index += 1) {
    const press = keyInputs[index];
    const release = keyInputs[keyInputs.length - 1 - index];
    const key = MODIFIER_KEY_BY_KEYCODE[press?.keycode];
    if (!key || press.actionType !== 1) return null;
    if (release?.keycode !== press.keycode || release.actionType !== 0) return null;
    keys.push(key);
  }

  const finalInput = keyInputs[modifierCount];
  const finalKey = FINAL_KEY_BY_KEYCODE[finalInput?.keycode];
  if (!finalKey || finalInput.actionType !== 2) return null;

  keys.push(finalKey);
  return keys;
}

let actionDecodingIndexes;

function getActionDecodingIndexes() {
  if (actionDecodingIndexes) return actionDecodingIndexes;

  const directActionByKeycode = new Map();
  const sequencedActionByInputs = new Map();
  for (const [id, definition] of Object.entries(ACTION_DEFINITIONS)) {
    if (definition.type === "direct") {
      directActionByKeycode.set(FINAL_KEYCODES[definition.key], id);
    } else if (definition.type === "directKeycode") {
      directActionByKeycode.set(definition.keycode, id);
    } else if (definition.type === "shortcut") {
      sequencedActionByInputs.set(JSON.stringify(buildKeyInputs(definition.keys)), id);
    } else if (definition.type === "sequence") {
      sequencedActionByInputs.set(JSON.stringify(definition.keyInputs), id);
    }
  }

  actionDecodingIndexes = { directActionByKeycode, sequencedActionByInputs };
  return actionDecodingIndexes;
}

function nextId(items) {
  return items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), -1) + 1;
}

function findOrCreateAction(profile, name, keyInputs, createdActionIds) {
  const existing = profile.actions.find((action) => sameJson(action.keyInputs, keyInputs));
  if (existing) return existing.id;

  const id = nextId(profile.actions);
  profile.actions.push({ id, name, color: null, keyInputs });
  createdActionIds.push(id);
  return id;
}

function resolveKeyAssignment(profile, assignment, createdActionIds) {
  if (assignment && typeof assignment === "object") {
    assert(
      assignment.type === "custom",
      `Affectation inconnue : ${JSON.stringify(assignment)}`,
      "UNKNOWN_ASSIGNMENT",
    );
    const { modifiers, finalKey } = validateCustomKeys(assignment.keys);
    if (modifiers.length === 0) return FINAL_KEYCODES[finalKey];
    const keyInputs = buildKeyInputs(assignment.keys);
    const name = `Custom ${assignment.keys.join("+")}`;
    const id = findOrCreateAction(profile, name, keyInputs, createdActionIds);
    return `KA_${id}`;
  }

  const definition = ACTION_DEFINITIONS[assignment];
  assert(definition, `Action inconnue : ${assignment}`, "UNKNOWN_ASSIGNMENT");

  if (definition.type === "shortcut") {
    const keyInputs = buildKeyInputs(definition.keys);
    const id = findOrCreateAction(profile, definition.name, keyInputs, createdActionIds);
    return `KA_${id}`;
  }
  if (definition.type === "sequence") {
    const keyInputs = clone(definition.keyInputs);
    const id = findOrCreateAction(profile, definition.name, keyInputs, createdActionIds);
    return `KA_${id}`;
  }
  if (definition.type === "direct") {
    return FINAL_KEYCODES[definition.key];
  }
  if (definition.type === "directKeycode") {
    return definition.keycode;
  }
  return "KC_NONE";
}

function resolveWheelDirection(profile, direction, createdActionIds) {
  if (typeof direction === "string") return direction;

  assert(
    direction &&
      typeof direction.name === "string" &&
      Array.isArray(direction.keyInputs),
    "Séquence de molette invalide.",
    "UNKNOWN_ASSIGNMENT",
  );
  const id = findOrCreateAction(
    profile,
    direction.name,
    direction.keyInputs,
    createdActionIds,
  );
  return `KA_${id}`;
}

function addActionsToGroup(profile, actionIds) {
  if (actionIds.length === 0) return;

  if (!Array.isArray(profile.actionGroups)) profile.actionGroups = [];
  let group = profile.actionGroups.find((candidate) => candidate.name === "Claude Codex Micro");
  if (!group) {
    group = {
      id: nextId(profile.actionGroups),
      name: "Claude Codex Micro",
      actionIds: [],
    };
    profile.actionGroups.push(group);
  }
  if (!Array.isArray(group.actionIds)) group.actionIds = [];

  group.actionIds = [...new Set([...group.actionIds, ...actionIds])];
}

/**
 * Ergonomically supported custom joystick sector counts. Each sector accepts
 * the same catalogue/custom value as a key; 45° remain reserved for `KI_X`.
 */
const JOYSTICK_DIRECTION_COUNTS = Object.freeze([4, 8]);
const JOYSTICK_CLOSE_ANGLE = 45 / 360;
const JOYSTICK_START_ANGLE = (90 - 45 / 2) / 360;

function isCustomJoystick(value) {
  return Boolean(value) && typeof value === "object" && Array.isArray(value.sectors);
}

function validateCustomJoystick(joystick) {
  assert(
    JOYSTICK_DIRECTION_COUNTS.includes(joystick.directions),
    `Le joystick accepte ${JOYSTICK_DIRECTION_COUNTS.join(" ou ")} directions, reçu : ${JSON.stringify(joystick.directions)}`,
    "UNSUPPORTED_JOYSTICK_DIRECTIONS",
  );
  assert(
    joystick.sectors.length === joystick.directions,
    `Le joystick déclare ${joystick.directions} directions mais porte ${joystick.sectors.length} secteurs.`,
    "JOYSTICK_SECTOR_COUNT",
  );
}

/**
 * Computes the normalized radial geometry shared by profile serialization and
 * GUI rendering, including the fixed 45° `KI_X` close zone.
 *
 * @param {number} directionCount Positive number of assignable sectors.
 * @returns {{close: {a1: number, a2: number}, sectors: Array<{index: number, a1: number, a2: number}>}}
 * Normalized turn fractions in clockwise order.
 * @throws {Error} With `JOYSTICK_SECTOR_COUNT` for a non-positive count.
 */
function radialSectorGeometry(directionCount) {
  assert(
    Number.isInteger(directionCount) && directionCount > 0,
    `Le joystick doit contenir au moins une direction, reçu : ${JSON.stringify(directionCount)}`,
    "JOYSTICK_SECTOR_COUNT",
  );
  const sectorAngle = (1 - JOYSTICK_CLOSE_ANGLE) / directionCount;
  return {
    close: {
      a1: JOYSTICK_START_ANGLE,
      a2: (JOYSTICK_START_ANGLE + JOYSTICK_CLOSE_ANGLE) % 1,
    },
    sectors: Array.from({ length: directionCount }, (_, index) => {
      const a1 = JOYSTICK_START_ANGLE + JOYSTICK_CLOSE_ANGLE + sectorAngle * index;
      return { index, a1: a1 % 1, a2: (a1 + sectorAngle) % 1 };
    }),
  };
}

function radialSectors(keycodes) {
  const geometry = radialSectorGeometry(keycodes.length);
  return [
    { k: "KI_X", ...geometry.close },
    ...geometry.sectors.map(({ a1, a2 }, index) => ({
      k: keycodes[index],
      a1,
      a2,
    })),
  ];
}

/**
 * Validates and inventories an official Codex Micro `*-profile.json` export.
 * It requires exactly one non-native Claude layer and never mutates the source.
 *
 * @param {object} source Parsed Work Louder Input profile export.
 * @param {{requireAppSense?: boolean}} [options] Whether the Claude layer must
 * already reference a local AppSense entry.
 * @returns {{device: string, language: string, profileName: string, layerName: string, layerIndex: number, appSenseLinked: boolean, configurableSwitches: number, inputSchema: string}}
 * Stable inventory consumed by the CLI and GUI.
 * @throws {Error} With a stable `code` when device, layer, layout, or AppSense invariants fail.
 */
export function inspectInputProfile(source, { requireAppSense = true } = {}) {
  assert(source && typeof source === "object", "Le fichier JSON est vide.", "EMPTY_FILE");
  assert(
    source.keyboard === DEVICE_TYPE,
    "Cette sauvegarde ne provient pas d’un Codex Micro.",
    "WRONG_DEVICE",
  );
  assert(source.language, "La langue du profil Input est absente.", "MISSING_LANGUAGE");
  assert(
    source.profile && typeof source.profile === "object",
    "Profil Input absent.",
    "MISSING_PROFILE",
  );
  assert(
    Array.isArray(source.profile.layers),
    "Liste des layers Input absente.",
    "MISSING_LAYERS",
  );
  assert(Array.isArray(source.actions), "Liste des actions Input absente.", "MISSING_ACTIONS");
  assert(
    Array.isArray(source.multiactions),
    "Liste des multiactions Input absente.",
    "MISSING_MULTIACTIONS",
  );

  const matchingLayers = source.profile.layers.filter(
    (layer) => layer.name?.trim().toLowerCase() === TARGET_LAYER_NAME.toLowerCase(),
  );
  assert(
    matchingLayers.length === 1,
    matchingLayers.length === 0
      ? "Aucun layer « Claude » n’a été trouvé dans cette sauvegarde."
      : "Plusieurs layers « Claude » ont été trouvés : gardez-en un seul avant l’import.",
    matchingLayers.length === 0 ? "NO_CLAUDE_LAYER" : "MULTIPLE_CLAUDE_LAYERS",
  );

  const layerIndex = source.profile.layers.indexOf(matchingLayers[0]);
  const layer = matchingLayers[0];
  assert(
    layerIndex > 0,
    "Le layer Claude ne peut pas remplacer le layer natif à l’index 0.",
    "CLAUDE_LAYER_NATIVE",
  );
  const expectedRows = [
    { index: 0, length: 2, code: "BAD_TOP_ROW", label: "supérieure" },
    { index: 1, length: 4, code: "BAD_AGENT_ROW", label: "des touches Agent" },
    { index: 2, length: 4, code: "BAD_KEY_ROW", label: "des quatre touches principales" },
    { index: 3, length: 3, code: "BAD_BOTTOM_ROW", label: "inférieure" },
  ];
  for (const row of expectedRows) {
    assert(
      Array.isArray(layer.layout?.base?.[row.index]) &&
        layer.layout.base[row.index].length >= row.length,
      `Le layer Claude n’a pas la disposition attendue pour la rangée ${row.label}.`,
      row.code,
    );
  }
  assert(
    Array.isArray(layer.layout?.encoders?.[0]) && layer.layout.encoders[0].length >= 3,
    "Le layer Claude n’a pas la disposition attendue pour la molette.",
    "BAD_ENCODERS",
  );
  assert(layer.layout?.joystick, "Le layer Claude ne contient pas de joystick.", "MISSING_JOYSTICK");
  const appSenseLinked = Number.isInteger(layer.linkedAppId) && layer.linkedAppId >= 0;
  if (requireAppSense) {
    assert(
      appSenseLinked,
      "Le layer Claude doit déjà être associé à Claude avec un identifiant AppSense valide.",
      "MISSING_APPSENSE",
    );
  }

  return {
    device: source.keyboard,
    language: source.language,
    profileName: source.profile.name,
    layerName: layer.name,
    layerIndex,
    appSenseLinked,
    configurableSwitches: 13,
    inputSchema: "0.17.x",
  };
}

// Le Codex Micro accepte six layers programmables au maximum (doc Work Louder).
const MAX_LAYERS = 6;

function hasClaudeLayout(layer) {
  return (
    Array.isArray(layer?.layout?.base?.[0]) &&
    layer.layout.base[0].length >= 2 &&
    Array.isArray(layer?.layout?.base?.[1]) &&
    layer.layout.base[1].length >= 4 &&
    Array.isArray(layer?.layout?.base?.[2]) &&
    layer.layout.base[2].length >= 4 &&
    Array.isArray(layer?.layout?.base?.[3]) &&
    layer.layout.base[3].length >= 3 &&
    Array.isArray(layer?.layout?.encoders?.[0]) &&
    layer.layout.encoders[0].length >= 3 &&
    Boolean(layer.layout?.joystick)
  );
}

/**
 * Synthesizes a neutral Claude layer by cloning a compatible layer structure.
 * Assignable controls are cleared, the native sensor is preserved, and no
 * device-local AppSense reference is invented.
 *
 * @param {object} source Official profile export that has no Claude layer.
 * @returns {{source: object, templateName: string, layerIndex: number}} A cloned
 * profile plus the chosen template and new layer index.
 * @throws {Error} With a stable `code` when creation would be ambiguous or unsafe.
 */
export function addClaudeLayer(source) {
  assert(source && typeof source === "object", "Le fichier JSON est vide.", "EMPTY_FILE");
  assert(
    source.keyboard === DEVICE_TYPE,
    "Cette sauvegarde ne provient pas d’un Codex Micro.",
    "WRONG_DEVICE",
  );
  assert(
    source.profile && typeof source.profile === "object",
    "Profil Input absent.",
    "MISSING_PROFILE",
  );
  assert(
    Array.isArray(source.profile.layers) && source.profile.layers.length > 0,
    "Liste des layers Input absente.",
    "MISSING_LAYERS",
  );

  const layers = source.profile.layers;
  assert(
    !layers.some(
      (layer) => layer.name?.trim().toLowerCase() === TARGET_LAYER_NAME.toLowerCase(),
    ),
    "Un layer « Claude » existe déjà dans cette sauvegarde.",
    "MULTIPLE_CLAUDE_LAYERS",
  );
  assert(
    layers.length < MAX_LAYERS,
    "Le profil contient déjà six layers : libérez un emplacement dans Input avant de créer le layer Claude.",
    "LAYER_LIMIT",
  );

  const template = layers.slice(1).find(hasClaudeLayout) ??
    (hasClaudeLayout(layers[0]) ? layers[0] : null);
  assert(
    template,
    "Aucun layer existant ne peut servir de modèle pour créer le layer Claude.",
    "NO_TEMPLATE_LAYER",
  );

  const output = clone(source);
  const layer = clone(template);
  layer.id = nextId(output.profile.layers);
  layer.name = TARGET_LAYER_NAME;
  delete layer.linkedAppId;
  // Safe by default: the assignable controls inherited from the template are
  // cleared. The base[3][0] sensor keeps its layer-change function and is never
  // exposed in the configurator.
  for (const [rowIndex, row] of layer.layout.base.entries()) {
    if (!Array.isArray(row)) continue;
    for (const [columnIndex, cell] of row.entries()) {
      if (rowIndex === 3 && columnIndex === 0) continue;
      if (cell && typeof cell === "object") cell.keycode = "KC_NONE";
    }
  }
  for (const encoder of layer.layout.encoders ?? []) {
    if (!Array.isArray(encoder)) continue;
    for (const cell of encoder) {
      if (cell && typeof cell === "object") cell.keycode = "KC_NONE";
    }
  }
  layer.layout.joystick = { type: "RADIAL", sectors: radialSectors(["KC_NONE"]) };
  output.profile.layers.push(layer);

  return {
    source: output,
    templateName: template.name ?? "",
    layerIndex: output.profile.layers.length - 1,
  };
}

/**
 * Decodes the existing Claude layer back into the configurator's canonical
 * mapping, including custom actions, wheel mode, and joystick sectors.
 *
 * @param {object} source Official profile export containing one Claude layer.
 * @returns {{mapping: object, assigned: number}} Derived mapping and count of
 * non-`none` assignments.
 * @throws {Error} When the source profile violates inspection invariants.
 */
export function deriveMappingFromProfile(source) {
  const inspection = inspectInputProfile(source, { requireAppSense: false });
  const layer = source.profile.layers[inspection.layerIndex];
  const actionsById = new Map(source.actions.map((action) => [String(action.id), action]));
  const { directActionByKeycode, sequencedActionByInputs } = getActionDecodingIndexes();

  const decodeCell = (cell) => {
    const keycode = cell?.keycode;
    if (!keycode || keycode === "KC_NONE") return "none";
    const directAction = directActionByKeycode.get(keycode);
    if (directAction) return directAction;

    const reference = /^KA_(\d+)$/.exec(keycode);
    if (reference) {
      const action = actionsById.get(reference[1]);
      if (!action) return "none";
      const sequencedAction = sequencedActionByInputs.get(JSON.stringify(action.keyInputs));
      if (sequencedAction) return sequencedAction;
      const keys = decodeKeyInputs(action.keyInputs);
      return keys ? { type: "custom", keys } : "none";
    }

    const finalKey = FINAL_KEY_BY_KEYCODE[keycode];
    return finalKey ? { type: "custom", keys: [finalKey] } : "none";
  };

  const mapping = {};
  for (const [controlId, location] of Object.entries(KEY_CONTROL_LOCATIONS)) {
    mapping[controlId] = decodeCell(
      layer.layout.base[location.row][location.column],
    );
  }

  const encoder = layer.layout.encoders[0];
  const wheelDirectionMatches = (cell, direction) => {
    if (typeof direction === "string") return cell?.keycode === direction;

    const reference = /^KA_(\d+)$/.exec(cell?.keycode ?? "");
    if (!reference) return false;
    const action = actionsById.get(reference[1]);
    return Boolean(action && sameJson(action.keyInputs, direction.keyInputs));
  };
  mapping.wheel = "none";
  for (const [mode, wheelMode] of Object.entries(WHEEL_MODES)) {
    if (
      wheelMode &&
      wheelDirectionMatches(
        encoder[PHYSICAL_ENCODER_SLOTS.clockwise],
        wheelMode.clockwise,
      ) &&
      wheelDirectionMatches(
        encoder[PHYSICAL_ENCODER_SLOTS.counterClockwise],
        wheelMode.counterClockwise,
      )
    ) {
      mapping.wheel = mode;
      break;
    }
  }
  mapping[ENCODER_PRESS_CONTROL] = decodeCell(
    encoder[PHYSICAL_ENCODER_SLOTS.press],
  );

  // The first sector is always the `KI_X` close zone: the useful directions are
  // the ones after it, in the order radialSectors lays them down.
  const sectors = (layer.layout.joystick?.sectors ?? []).filter(
    (sector) => sector.k !== "KI_X",
  );
  const directions = sectors.map((sector) => sector.k);
  if (sameJson(directions, ["KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"])) {
    mapping.joystick = "navigation";
  } else if (JOYSTICK_DIRECTION_COUNTS.includes(directions.length)) {
    mapping.joystick = {
      directions: directions.length,
      sectors: directions.map((keycode) => decodeCell({ keycode })),
    };
  } else {
    mapping.joystick = "none";
  }

  const assigned = Object.values(mapping).filter((value) => value !== "none").length;

  return { mapping, assigned };
}

// A `*-profile.json` exported by Input does NOT carry the `linkedApps` table,
// only the `linkedAppId` references set on the layers. Neither option below can
// therefore create an entry: they write a reference to an entry that must
// already exist on the board, created once in Input's UI. A reference to a
// missing entry imports without error and leaves AppSense dead without saying so.
function validateAppSenseId(value, label) {
  assert(
    Number.isInteger(value) && value >= 0,
    `${label} doit être un entier positif ou nul, reçu : ${JSON.stringify(value)}`,
    "INVALID_APPSENSE_ID",
  );
}

/**
 * Produces a new Claude profile while protecting the native layer, unrelated
 * layers, source object, and local AppSense boundaries.
 *
 * Forced AppSense ids are references only: the corresponding entries must
 * already exist in the device-local `linkedApps` registry. When a base-layer id
 * is supplied, only that layer's `linkedAppId` may change; its keymap remains
 * byte-for-byte equivalent.
 *
 * @param {object} source Official Work Louder Input profile export.
 * @param {object} [requestedMapping] Partial configurator mapping overlaid on
 * {@link DEFAULT_MAPPING}.
 * @param {object} [options] AppSense and validation controls.
 * @param {boolean} [options.requireAppSense=true] Require an inherited Claude link.
 * @param {number} [options.appSenseId] Existing local entry for the Claude layer.
 * @param {number} [options.baseLayerAppSenseId] Existing local entry used to
 * return automatically to the protected native layer.
 * @returns {{profile: object, report: object}} New profile and preservation report.
 * @throws {Error} With a stable `code` when assignments or preservation rules fail.
 */
export function buildInputProfile(
  source,
  requestedMapping = DEFAULT_MAPPING,
  { requireAppSense = true, appSenseId, baseLayerAppSenseId } = {},
) {
  const forcesClaudeLink = appSenseId !== undefined;
  const linksBaseLayer = baseLayerAppSenseId !== undefined;

  if (forcesClaudeLink) validateAppSenseId(appSenseId, "appSenseId");
  if (linksBaseLayer) validateAppSenseId(baseLayerAppSenseId, "baseLayerAppSenseId");

  // Two layers linked to the same entry make the switch ambiguous: the firmware
  // does not document the order in which it walks its table.
  if (forcesClaudeLink && linksBaseLayer) {
    assert(
      appSenseId !== baseLayerAppSenseId,
      "Le layer Claude et le layer natif ne peuvent pas être liés à la même entrée AppSense.",
      "DUPLICATE_APPSENSE_ID",
    );
  }

  // Forcing the Claude layer's link makes its absence in the source acceptable:
  // that is precisely the use case, repairing a lost link.
  const inspection = inspectInputProfile(source, {
    requireAppSense: requireAppSense && !forcesClaudeLink,
  });
  const mapping = { ...DEFAULT_MAPPING, ...requestedMapping };
  const output = clone(source);
  const original = clone(source);
  const targetLayer = output.profile.layers[inspection.layerIndex];
  const createdActionIds = [];

  output.profile.name = "Claude macOS";
  // Input 0.17.3 can remap imported action IDs while keeping stale IDs from
  // source groups. Groups only organize the action library, so rebuild that
  // metadata around the actions created by this profile.
  output.actionGroups = [];

  for (const [controlId, location] of Object.entries(KEY_CONTROL_LOCATIONS)) {
    targetLayer.layout.base[location.row][location.column].keycode = resolveKeyAssignment(
      output,
      mapping[controlId],
      createdActionIds,
    );
  }

  const hasWheelMode = Object.hasOwn(WHEEL_MODES, mapping.wheel);
  const wheelMode = hasWheelMode ? WHEEL_MODES[mapping.wheel] : null;
  assert(
    hasWheelMode,
    `Action inconnue pour la molette : ${mapping.wheel}`,
    "UNKNOWN_ASSIGNMENT",
  );
  if (wheelMode) {
    targetLayer.layout.encoders[0][PHYSICAL_ENCODER_SLOTS.clockwise].keycode =
      resolveWheelDirection(
        output,
        wheelMode.clockwise,
        createdActionIds,
      );
    targetLayer.layout.encoders[0][PHYSICAL_ENCODER_SLOTS.counterClockwise].keycode =
      resolveWheelDirection(
        output,
        wheelMode.counterClockwise,
        createdActionIds,
      );
  } else {
    targetLayer.layout.encoders[0][PHYSICAL_ENCODER_SLOTS.clockwise].keycode =
      "KC_NONE";
    targetLayer.layout.encoders[0][PHYSICAL_ENCODER_SLOTS.counterClockwise].keycode =
      "KC_NONE";
  }
  targetLayer.layout.encoders[0][PHYSICAL_ENCODER_SLOTS.press].keycode =
    resolveKeyAssignment(
      output,
      mapping[ENCODER_PRESS_CONTROL],
      createdActionIds,
    );

  if (mapping.joystick === "navigation") {
    targetLayer.layout.joystick = {
      type: "RADIAL",
      sectors: radialSectors(["KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"]),
    };
  } else if (mapping.joystick === "none") {
    targetLayer.layout.joystick = {
      type: "RADIAL",
      sectors: radialSectors(["KC_NONE"]),
    };
  } else if (isCustomJoystick(mapping.joystick)) {
    validateCustomJoystick(mapping.joystick);
    targetLayer.layout.joystick = {
      type: "RADIAL",
      sectors: radialSectors(
        mapping.joystick.sectors.map((entry) =>
          resolveKeyAssignment(output, entry, createdActionIds),
        ),
      ),
    };
  } else {
    throw new Error(
      `Action inconnue pour le joystick : ${JSON.stringify(mapping.joystick)}`,
    );
  }

  addActionsToGroup(output, createdActionIds);

  if (forcesClaudeLink) targetLayer.linkedAppId = appSenseId;
  // AppSense has no return path: every rule is a one-way transition. Linking the
  // native layer to a second application is the only way to leave the Claude
  // layer automatically, by entering that one. See
  // docs/research/appsense-behavior.md.
  if (linksBaseLayer) output.profile.layers[0].linkedAppId = baseLayerAppSenseId;

  source.profile.layers.forEach((layer, index) => {
    if (index !== inspection.layerIndex && !(index === 0 && linksBaseLayer)) {
      assert(
        sameJson(layer, output.profile.layers[index]),
        `Le layer ${index + 1} a été modifié alors qu’il devait être préservé.`,
      );
    }
  });

  assert(
    forcesClaudeLink ||
      source.profile.layers[inspection.layerIndex].linkedAppId ===
        output.profile.layers[inspection.layerIndex].linkedAppId,
    "Le lien AppSense du layer Claude n’a pas été préservé.",
  );
  if (linksBaseLayer) {
    // The link changes, never the keymap: the native OpenAI keys must stay
    // intact down to the keycode.
    assert(
      sameJson(source.profile.layers[0].layout, output.profile.layers[0].layout),
      "Le keymap du layer natif Work Louder a été modifié.",
    );
    const { linkedAppId: _sourceLink, ...sourceRest } = source.profile.layers[0];
    const { linkedAppId: _outputLink, ...outputRest } = output.profile.layers[0];
    assert(
      sameJson(sourceRest, outputRest),
      "Le layer natif Work Louder a été modifié au-delà de son lien AppSense.",
    );
  } else {
    assert(
      sameJson(source.profile.layers[0], output.profile.layers[0]),
      "Le layer natif Work Louder a été modifié.",
    );
  }
  assert(sameJson(source, original), "La sauvegarde source a été modifiée en mémoire.");

  return {
    profile: output,
    report: {
      ...inspection,
      outputProfileName: output.profile.name,
      createdActions: createdActionIds.length,
      preservedLayers: output.profile.layers.length - 1,
      nativeLayerPreserved: true,
      appSensePreserved: inspection.appSenseLinked,
      // Reference actually written on the Claude layer, forced or inherited.
      appSenseId: forcesClaudeLink
        ? appSenseId
        : output.profile.layers[inspection.layerIndex].linkedAppId,
      appSenseForced: forcesClaudeLink,
      // Native layer link, which provides the exit transition out of the Claude layer.
      baseLayerAppSenseId: linksBaseLayer ? baseLayerAppSenseId : null,
      assignedSwitches: [...KEY_CONTROL_ORDER, ENCODER_PRESS_CONTROL].filter(
        (controlId) => mapping[controlId] !== "none",
      ).length,
      wheelMode: mapping.wheel === "scroll" ? "Page précédente / suivante" : mapping.wheel,
      joystickMode: isCustomJoystick(mapping.joystick)
        ? `${mapping.joystick.directions} directions`
        : mapping.joystick === "navigation"
          ? "Flèches directionnelles"
          : "Non assigné",
    },
  };
}

export {
  ACTION_DEFINITIONS,
  DEFAULT_MAPPING,
  ENCODER_PRESS_CONTROL,
  FINAL_KEYCODES,
  FORBIDDEN_KEYS,
  KEY_CONTROL_LOCATIONS,
  KEY_CONTROL_ORDER,
  JOYSTICK_DIRECTION_COUNTS,
  MODIFIER_KEYCODES,
  PRINTABLE_KEYS,
  WHEEL_MODES,
  radialSectorGeometry,
};
