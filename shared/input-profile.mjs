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
]);

const CONTROL_ORDER = ["key-1", "key-2", "key-3", "key-4"];
const ADVANCED_CONTROL_ORDER = ["key-5", "key-6", "key-7", "key-8"];

const DEFAULT_MAPPING = {
  joystick: "navigation",
  wheel: "scroll",
  "key-1": "newSession",
  "key-2": "voice",
  "key-3": "diff",
  "key-4": "stop",
};

const ACTION_DEFINITIONS = {
  newSession: {
    name: "Claude New",
    type: "shortcut",
    keys: ["Command", "N"],
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
  none: {
    name: "None",
    type: "none",
  },
};

const WHEEL_MODES = {
  scroll: { counterClockwise: "KC_PGUP", clockwise: "KC_PGDN" },
  lines: { counterClockwise: "KC_UP", clockwise: "KC_DOWN" },
  volume: { counterClockwise: "KC_VOLD", clockwise: "KC_VOLU", experimental: true },
  none: null,
};

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
  if (definition.type === "direct") {
    return FINAL_KEYCODES[definition.key];
  }
  return "KC_NONE";
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

export function inspectInputProfile(source) {
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
  assert(
    Array.isArray(layer.layout?.base?.[2]) && layer.layout.base[2].length >= 4,
    "Le layer Claude n’a pas la disposition attendue pour les quatre touches.",
    "BAD_KEY_ROW",
  );
  assert(
    Array.isArray(layer.layout?.encoders?.[0]) && layer.layout.encoders[0].length >= 3,
    "Le layer Claude n’a pas la disposition attendue pour la molette.",
    "BAD_ENCODERS",
  );
  assert(layer.layout?.joystick, "Le layer Claude ne contient pas de joystick.", "MISSING_JOYSTICK");
  assert(
    Number.isInteger(layer.linkedAppId) && layer.linkedAppId >= 0,
    "Le layer Claude doit déjà être associé à Claude avec un identifiant AppSense valide.",
    "MISSING_APPSENSE",
  );

  return {
    device: source.keyboard,
    language: source.language,
    profileName: source.profile.name,
    layerName: layer.name,
    layerIndex,
    appSenseLinked: true,
    advancedRowAvailable:
      Array.isArray(layer.layout?.base?.[1]) && layer.layout.base[1].length >= 4,
    inputSchema: "0.17.x",
  };
}

export function deriveMappingFromProfile(source) {
  const inspection = inspectInputProfile(source);
  const layer = source.profile.layers[inspection.layerIndex];
  const actionsById = new Map(source.actions.map((action) => [String(action.id), action]));

  const decodeCell = (cell) => {
    const keycode = cell?.keycode;
    if (!keycode || keycode === "KC_NONE") return "none";
    if (keycode === "KC_ESC") return "stop";

    const reference = /^KA_(\d+)$/.exec(keycode);
    if (reference) {
      const action = actionsById.get(reference[1]);
      if (!action) return "none";
      for (const [id, definition] of Object.entries(ACTION_DEFINITIONS)) {
        if (
          definition.type === "shortcut" &&
          sameJson(action.keyInputs, buildKeyInputs(definition.keys))
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
  CONTROL_ORDER.forEach((controlId, index) => {
    mapping[controlId] = decodeCell(layer.layout.base[2][index]);
  });

  let advancedInUse = false;
  if (inspection.advancedRowAvailable) {
    const decoded = ADVANCED_CONTROL_ORDER.map((controlId, index) => [
      controlId,
      decodeCell(layer.layout.base[1][index]),
    ]);
    advancedInUse = decoded.some(([, assignment]) => assignment !== "none");
    if (advancedInUse) {
      for (const [controlId, assignment] of decoded) mapping[controlId] = assignment;
    }
  }

  const encoder = layer.layout.encoders[0];
  mapping.wheel = "none";
  for (const [mode, keycodes] of Object.entries(WHEEL_MODES)) {
    if (
      keycodes &&
      encoder[0]?.keycode === keycodes.counterClockwise &&
      encoder[1]?.keycode === keycodes.clockwise
    ) {
      mapping.wheel = mode;
      break;
    }
  }

  const sectors = layer.layout.joystick?.sectors ?? [];
  mapping.joystick = sectors.some((sector) => sector.k === "KC_UP") ? "navigation" : "none";

  const assigned = Object.values(mapping).filter((value) => value !== "none").length;

  return { mapping, advancedInUse, assigned };
}

export function buildInputProfile(source, requestedMapping = DEFAULT_MAPPING) {
  const inspection = inspectInputProfile(source);
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

  for (const [index, controlId] of CONTROL_ORDER.entries()) {
    targetLayer.layout.base[2][index].keycode = resolveKeyAssignment(
      output,
      mapping[controlId],
      createdActionIds,
    );
  }

  const advancedAssignments = ADVANCED_CONTROL_ORDER.filter(
    (controlId) => mapping[controlId] != null,
  );
  if (advancedAssignments.length > 0) {
    assert(
      inspection.advancedRowAvailable,
      "Le layer Claude n’a pas la disposition attendue pour la rangée avancée.",
      "BAD_ADVANCED_ROW",
    );
    for (const controlId of advancedAssignments) {
      const index = ADVANCED_CONTROL_ORDER.indexOf(controlId);
      targetLayer.layout.base[1][index].keycode = resolveKeyAssignment(
        output,
        mapping[controlId],
        createdActionIds,
      );
    }
  }

  const wheelMode = WHEEL_MODES[mapping.wheel];
  assert(
    mapping.wheel in WHEEL_MODES,
    `Action inconnue pour la molette : ${mapping.wheel}`,
    "UNKNOWN_ASSIGNMENT",
  );
  if (wheelMode) {
    targetLayer.layout.encoders[0][0].keycode = wheelMode.counterClockwise;
    targetLayer.layout.encoders[0][1].keycode = wheelMode.clockwise;
    targetLayer.layout.encoders[0][2].keycode = "KC_NONE";
  } else {
    targetLayer.layout.encoders[0].forEach((entry) => {
      entry.keycode = "KC_NONE";
    });
  }

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

  source.profile.layers.forEach((layer, index) => {
    if (index !== inspection.layerIndex) {
      assert(
        sameJson(layer, output.profile.layers[index]),
        `Le layer ${index + 1} a été modifié alors qu’il devait être préservé.`,
      );
    }
  });

  assert(
    source.profile.layers[inspection.layerIndex].linkedAppId ===
      output.profile.layers[inspection.layerIndex].linkedAppId,
    "Le lien AppSense du layer Claude n’a pas été préservé.",
  );
  assert(
    sameJson(source.profile.layers[0], output.profile.layers[0]),
    "Le layer natif Work Louder a été modifié.",
  );
  assert(sameJson(source, original), "La sauvegarde source a été modifiée en mémoire.");

  return {
    profile: output,
    report: {
      ...inspection,
      outputProfileName: output.profile.name,
      createdActions: createdActionIds.length,
      preservedLayers: output.profile.layers.length - 1,
      nativeLayerPreserved: true,
      appSensePreserved: true,
      advancedAssignments: advancedAssignments.length,
      wheelMode: mapping.wheel === "scroll" ? "Page précédente / suivante" : mapping.wheel,
      joystickMode:
        mapping.joystick === "navigation" ? "Flèches directionnelles" : "Non assigné",
    },
  };
}

export {
  ACTION_DEFINITIONS,
  ADVANCED_CONTROL_ORDER,
  CONTROL_ORDER,
  DEFAULT_MAPPING,
  FINAL_KEYCODES,
  FORBIDDEN_KEYS,
  MODIFIER_KEYCODES,
  PRINTABLE_KEYS,
  WHEEL_MODES,
};
