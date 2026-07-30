const DEVICE_TYPE = "codex_micro";
const TARGET_LAYER_NAME = "Claude";

const MODIFIER_KEYCODES = {
  Command: "KC_LGUI",
  Shift: "KC_LSFT",
  Option: "KC_LALT",
  Control: "KC_LCTL",
};

// Touches finales autorisées pour un raccourci. Retour/Entrée, Suppression et
// Retour arrière sont volontairement absents : un appui accidentel ne doit
// jamais envoyer, approuver ou détruire quoi que ce soit.
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

const FORBIDDEN_KEYS = Object.freeze(["Enter", "Return", "Delete", "Backspace"]);

// Une touche imprimable seule taperait du texte dans la conversation : elle
// n'est acceptée qu'accompagnée d'un modificateur.
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

// Les douze keycaps programmables sont répartis sur quatre rangées. La
// première cellule de la dernière rangée est le capteur de changement de
// layer : elle est volontairement absente de cette table et reste intacte.
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
const KEY_CONTROL_ORDER = Object.keys(KEY_CONTROL_LOCATIONS);
// The top-left rotary encoder exposes counterclockwise, clockwise, and press
// cells. Its press is the thirteenth configurable physical switch.
const ENCODER_PRESS_CONTROL = "key-13";

const DEFAULT_MAPPING = {
  joystick: "navigation",
  // La molette est en mode Effort par défaut : c'est le geste distinctif de cette
  // carte pour Claude, et il est calibré et documenté (voir
  // docs/research/effort-wheel-calibration.md). Les autres modes restent
  // disponibles dans le GUI, le défilement compris.
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

// Attente laissée au sélecteur d'effort pour apparaître, en millisecondes.
//
// Input ne documente pas si `delay` s'applique avant ou après son étape, et
// aucune source ne permet de le trancher : le champ est transmis verbatim au
// firmware, qui seul l'interprète. La macro contourne la question par sa forme
// plutôt que par une mesure. Toute l'attente est posée sur la libération de ⌘ et
// la flèche reçoit 0, ce qui rend les deux lectures équivalentes :
//
//   - lecture « après »  : ⌘ relâché, attente, flèche  -> sélecteur : ce délai
//   - lecture « avant »  : attente, ⌘ relâché, flèche  -> sélecteur : ce délai
//
// Même marge et même durée totale dans les deux cas. Ne pas répartir cette
// attente sur les deux étapes : cela double le délai d'ouverture sans rien
// garantir de plus.
//
// Calibrage matériel, échelle descendante testée sur Codex Micro : 40 ms tient,
// 20 ms échoue. La valeur retenue double ce plancher mesuré. Le délai
// d'ouverture est donc de 80 ms, auquel s'ajoutent les 10 ms de retour visuel
// ci-dessous, contre 900 ms pour la première version de la macro.
//
// En descendant plus bas, l'échec n'est pas bruyant : la flèche part avant que
// le sélecteur ait le focus et le changement de niveau est perdu sans trace.
// Toute nouvelle baisse doit donc être validée par plusieurs répétitions ET par
// une première ouverture à froid, au retour d'une autre application.
const EFFORT_PICKER_DELAY_MS = 80;

// Attente portée par l'étape Escape, en millisecondes. Elle sert au retour
// visuel, pas à la fiabilité, et ne doit pas être ramenée à 0.
//
// Sans elle, la flèche et Escape sont émis sans écart et Claude les traite dans
// le même tour de boucle : le sélecteur s'ouvre et se referme sans jamais peindre
// une image montrant le slider à son nouveau niveau. On change donc l'effort à
// l'aveugle, et l'effet visible est un simple clignotement. 10 ms suffisent à
// laisser passer une image, et le niveau atteint devient lisible.
//
// Cette attente est payée APRÈS que le niveau a changé : elle allonge la macro
// sans retarder son effet. C'est aussi ce qui indique que `delay` s'applique
// avant son étape et non après — dans la lecture « après » ces 10 ms seraient du
// temps mort en fin de macro et ne changeraient rien à l'affichage.
const EFFORT_FEEDBACK_DELAY_MS = 10;

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

// Claude Desktop ouvre le sélecteur d'effort avec ⌘⇧E. Son curseur ARIA
// accepte ensuite gauche/droite pour passer au niveau disponible précédent ou
// suivant. ⌘⇧E est une bascule vérifiée sur Claude Desktop : chaque cran doit
// donc refermer le sélecteur avec Escape, sinon le cran suivant le referme au
// lieu de l'ouvrir et le niveau est sauté.
//
// Le sélecteur est rendu de façon asynchrone, il faut donc l'attendre avant
// d'envoyer la flèche : EFFORT_PICKER_DELAY_MS, porté par la seule libération de
// ⌘. Puis il faut le laisser peindre le niveau atteint avant de le refermer :
// EFFORT_FEEDBACK_DELAY_MS, porté par Escape. L'étape de la flèche reste à 0,
// c'est elle qui rend les deux lectures possibles de `delay` équivalentes.
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

function nextId(items) {
  return items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), -1) + 1;
}

function findOrCreateAction(profile, name, keyInputs, createdActionIds) {
  const existing = profile.actions.find((action) => sameJson(action.keyInputs, keyInputs));
  if (existing) return existing.id;

  const id = nextId(profile.actions);
  profile.actions.push({
    id,
    name,
    color: null,
    keyInputs,
  });
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
    const id = findOrCreateAction(
      profile,
      definition.name,
      keyInputs,
      createdActionIds,
    );
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

function radialSectors(keycodes) {
  const closeAngle = 45 / 360;
  const start = (90 - 45 / 2) / 360;
  const remainingAngle = 1 - closeAngle;
  const sectorAngle = remainingAngle / keycodes.length;
  const sectors = [{ k: "KI_X", a1: start, a2: (start + closeAngle) % 1 }];

  keycodes.forEach((keycode, index) => {
    const a1 = start + closeAngle + sectorAngle * index;
    sectors.push({
      k: keycode,
      a1: a1 % 1,
      a2: (a1 + sectorAngle) % 1,
    });
  });

  return sectors;
}

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

// Crée le layer « Claude » à partir d'un export qui n'en contient pas, en
// clonant la structure d'un layer existant. Le lien AppSense (linkedAppId)
// référence le registre local d'Input et ne peut pas être inventé ici : le
// layer créé doit être lié via « Auto detect » après import.
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
  // Sécurité par défaut : les contrôles assignables hérités du modèle sont
  // neutralisés. Le capteur base[3][0] conserve sa fonction de changement de
  // layer et ne sera jamais exposé dans le configurateur.
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

export function deriveMappingFromProfile(source) {
  const inspection = inspectInputProfile(source, { requireAppSense: false });
  const layer = source.profile.layers[inspection.layerIndex];
  const actionsById = new Map(source.actions.map((action) => [String(action.id), action]));

  const decodeCell = (cell) => {
    const keycode = cell?.keycode;
    if (!keycode || keycode === "KC_NONE") return "none";
    for (const [id, definition] of Object.entries(ACTION_DEFINITIONS)) {
      if (
        (definition.type === "direct" && FINAL_KEYCODES[definition.key] === keycode) ||
        (definition.type === "directKeycode" && definition.keycode === keycode)
      ) {
        return id;
      }
    }

    const reference = /^KA_(\d+)$/.exec(keycode);
    if (reference) {
      const action = actionsById.get(reference[1]);
      if (!action) return "none";
      for (const [id, definition] of Object.entries(ACTION_DEFINITIONS)) {
        if (
          (definition.type === "shortcut" &&
            sameJson(action.keyInputs, buildKeyInputs(definition.keys))) ||
          (definition.type === "sequence" &&
            sameJson(action.keyInputs, definition.keyInputs))
        ) {
          return id;
        }
      }
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

  const sectors = layer.layout.joystick?.sectors ?? [];
  mapping.joystick = sectors.some((sector) => sector.k === "KC_UP") ? "navigation" : "none";

  const assigned = Object.values(mapping).filter((value) => value !== "none").length;

  return { mapping, assigned };
}

// Un fichier `*-profile.json` exporté par Input ne transporte PAS la table
// `linkedApps`, seulement les références `linkedAppId` posées sur les layers.
// Aucune des deux options ci-dessous ne peut donc créer une entrée : elles
// écrivent une référence vers une entrée qui doit déjà exister sur la carte,
// créée une fois dans l'UI d'Input. Une référence vers une entrée absente
// s'importe sans erreur et laisse AppSense mort sans le dire.
function validateAppSenseId(value, label) {
  assert(
    Number.isInteger(value) && value >= 0,
    `${label} doit être un entier positif ou nul, reçu : ${JSON.stringify(value)}`,
    "INVALID_APPSENSE_ID",
  );
}

export function buildInputProfile(
  source,
  requestedMapping = DEFAULT_MAPPING,
  { requireAppSense = true, appSenseId, baseLayerAppSenseId } = {},
) {
  const forcesClaudeLink = appSenseId !== undefined;
  const linksBaseLayer = baseLayerAppSenseId !== undefined;

  if (forcesClaudeLink) validateAppSenseId(appSenseId, "appSenseId");
  if (linksBaseLayer) validateAppSenseId(baseLayerAppSenseId, "baseLayerAppSenseId");

  // Deux layers liés à la même entrée rendent la bascule ambiguë : le firmware
  // ne documente pas dans quel ordre il parcourt sa table.
  if (forcesClaudeLink && linksBaseLayer) {
    assert(
      appSenseId !== baseLayerAppSenseId,
      "Le layer Claude et le layer natif ne peuvent pas être liés à la même entrée AppSense.",
      "DUPLICATE_APPSENSE_ID",
    );
  }

  // Forcer le lien du layer Claude rend son absence dans la source acceptable :
  // c'est précisément le cas d'usage, réparer un lien perdu.
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

  const wheelMode = WHEEL_MODES[mapping.wheel];
  assert(
    mapping.wheel in WHEEL_MODES,
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
  } else {
    throw new Error(`Action inconnue pour le joystick : ${mapping.joystick}`);
  }

  addActionsToGroup(output, createdActionIds);

  if (forcesClaudeLink) targetLayer.linkedAppId = appSenseId;
  // AppSense n'a pas de retour : chaque règle est une transition aller. Lier le
  // layer natif à une seconde application est le seul moyen de quitter le layer
  // Claude automatiquement, en entrant dans ce layer-là. Voir
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
    // Le lien change, jamais le keymap : les touches natives OpenAI doivent
    // rester intactes au keycode près.
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
      // Référence effectivement écrite sur le layer Claude, forcée ou héritée.
      appSenseId: forcesClaudeLink
        ? appSenseId
        : output.profile.layers[inspection.layerIndex].linkedAppId,
      appSenseForced: forcesClaudeLink,
      // Lien du layer natif, qui fournit la transition de sortie du layer Claude.
      baseLayerAppSenseId: linksBaseLayer ? baseLayerAppSenseId : null,
      assignedSwitches: [...KEY_CONTROL_ORDER, ENCODER_PRESS_CONTROL].filter(
        (controlId) => mapping[controlId] !== "none",
      ).length,
      wheelMode: mapping.wheel === "scroll" ? "Page précédente / suivante" : mapping.wheel,
      joystickMode:
        mapping.joystick === "navigation" ? "Flèches directionnelles" : "Non assigné",
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
  MODIFIER_KEYCODES,
  PRINTABLE_KEYS,
  WHEEL_MODES,
};
