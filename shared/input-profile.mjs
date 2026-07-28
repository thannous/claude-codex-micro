const DEVICE_TYPE = "codex_micro";
const TARGET_LAYER_NAME = "Claude";

const KEYCODE_BY_KEY = {
  Command: "KC_LGUI",
  Shift: "KC_LSFT",
  N: "KC_N",
  D: "KC_D",
};

const DIRECT_KEYCODES = {
  Escape: "KC_ESC",
};

const CONTROL_ORDER = ["key-1", "key-2", "key-3", "key-4"];

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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildKeyInputs(keys) {
  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);

  assert(finalKey && KEYCODE_BY_KEY[finalKey], `Touche non prise en charge : ${finalKey}`);
  for (const modifier of modifiers) {
    assert(
      modifier === "Command" || modifier === "Shift",
      `Modificateur non pris en charge : ${modifier}`,
    );
  }

  return [
    ...modifiers.map((key) => ({
      keycode: KEYCODE_BY_KEY[key],
      delay: 0,
      actionType: 1,
    })),
    {
      keycode: KEYCODE_BY_KEY[finalKey],
      delay: 0,
      actionType: 2,
    },
    ...modifiers
      .slice()
      .reverse()
      .map((key) => ({
        keycode: KEYCODE_BY_KEY[key],
        delay: 0,
        actionType: 0,
      })),
  ];
}

function nextId(items) {
  return items.reduce((highest, item) => Math.max(highest, Number(item.id) || 0), -1) + 1;
}

function findOrCreateAction(profile, definition, createdActionIds) {
  const keyInputs = buildKeyInputs(definition.keys);
  const existing = profile.actions.find((action) => sameJson(action.keyInputs, keyInputs));
  if (existing) return existing.id;

  const id = nextId(profile.actions);
  profile.actions.push({
    id,
    name: definition.name,
    color: null,
    keyInputs,
  });
  createdActionIds.push(id);
  return id;
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
  assert(source && typeof source === "object", "Le fichier JSON est vide.");
  assert(
    source.keyboard === DEVICE_TYPE,
    "Cette sauvegarde ne provient pas d’un Codex Micro.",
  );
  assert(source.language, "La langue du profil Input est absente.");
  assert(source.profile && typeof source.profile === "object", "Profil Input absent.");
  assert(Array.isArray(source.profile.layers), "Liste des layers Input absente.");
  assert(Array.isArray(source.actions), "Liste des actions Input absente.");
  assert(Array.isArray(source.multiactions), "Liste des multiactions Input absente.");

  const matchingLayers = source.profile.layers.filter(
    (layer) => layer.name?.trim().toLowerCase() === TARGET_LAYER_NAME.toLowerCase(),
  );
  assert(
    matchingLayers.length === 1,
    matchingLayers.length === 0
      ? "Aucun layer « Claude » n’a été trouvé dans cette sauvegarde."
      : "Plusieurs layers « Claude » ont été trouvés : gardez-en un seul avant l’import.",
  );

  const layerIndex = source.profile.layers.indexOf(matchingLayers[0]);
  const layer = matchingLayers[0];
  assert(layerIndex > 0, "Le layer Claude ne peut pas remplacer le layer natif à l’index 0.");
  assert(
    Array.isArray(layer.layout?.base?.[2]) && layer.layout.base[2].length >= 4,
    "Le layer Claude n’a pas la disposition attendue pour les quatre touches.",
  );
  assert(
    Array.isArray(layer.layout?.encoders?.[0]) && layer.layout.encoders[0].length >= 3,
    "Le layer Claude n’a pas la disposition attendue pour la molette.",
  );
  assert(layer.layout?.joystick, "Le layer Claude ne contient pas de joystick.");
  assert(
    Number.isInteger(layer.linkedAppId) && layer.linkedAppId >= 0,
    "Le layer Claude doit déjà être associé à Claude avec un identifiant AppSense valide.",
  );

  return {
    device: source.keyboard,
    language: source.language,
    profileName: source.profile.name,
    layerName: layer.name,
    layerIndex,
    appSenseLinked: true,
    inputSchema: "0.17.x",
  };
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
    const actionId = mapping[controlId];
    const definition = ACTION_DEFINITIONS[actionId];
    assert(definition, `Action inconnue pour ${controlId} : ${actionId}`);

    if (definition.type === "shortcut") {
      const id = findOrCreateAction(output, definition, createdActionIds);
      targetLayer.layout.base[2][index].keycode = `KA_${id}`;
    } else if (definition.type === "direct") {
      targetLayer.layout.base[2][index].keycode = DIRECT_KEYCODES[definition.key];
    } else {
      targetLayer.layout.base[2][index].keycode = "KC_NONE";
    }
  }

  if (mapping.wheel === "scroll") {
    targetLayer.layout.encoders[0][0].keycode = "KC_PGUP";
    targetLayer.layout.encoders[0][1].keycode = "KC_PGDN";
    targetLayer.layout.encoders[0][2].keycode = "KC_NONE";
  } else if (mapping.wheel === "none") {
    targetLayer.layout.encoders[0].forEach((entry) => {
      entry.keycode = "KC_NONE";
    });
  } else {
    throw new Error(`Action inconnue pour la molette : ${mapping.wheel}`);
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
      wheelMode: mapping.wheel === "scroll" ? "Page précédente / suivante" : "Non assignée",
      joystickMode:
        mapping.joystick === "navigation" ? "Flèches directionnelles" : "Non assigné",
    },
  };
}

export { DEFAULT_MAPPING };
