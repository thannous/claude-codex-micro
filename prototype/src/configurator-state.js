import {
  ACTION_DEFINITIONS,
  DEFAULT_MAPPING,
  FINAL_KEYCODES,
  JOYSTICK_DIRECTION_COUNTS,
  WHEEL_MODES,
} from "../../shared/input-profile.mjs";

export const MAPPING_STORAGE_KEY = "codex-micro-mapping";
export const MODIFIERS = Object.freeze(["Command", "Shift", "Option", "Control"]);
export const MODIFIER_SYMBOLS = Object.freeze({
  Command: "⌘",
  Shift: "⇧",
  Option: "⌥",
  Control: "⌃",
});
export const KEY_SYMBOLS = Object.freeze({
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  PageUp: "Pg↑",
  PageDown: "Pg↓",
  Escape: "Esc",
  Space: "␣",
  Comma: ",",
  BracketLeft: "[",
  BracketRight: "]",
  Equal: "=",
  Minus: "−",
});
export const DEFAULT_CUSTOM = Object.freeze({
  type: "custom",
  keys: Object.freeze(["Command", "K"]),
});

const KEY_CONTROL_IDS = new Set(
  Object.keys(DEFAULT_MAPPING).filter((controlId) => controlId.startsWith("key-")),
);
const KEY_ACTION_IDS = new Set(Object.keys(ACTION_DEFINITIONS));
const JOYSTICK_ACTION_IDS = new Set(["navigation", "none"]);

export function assertKeyActionCatalog(actions) {
  const missing = [...KEY_ACTION_IDS].filter(
    (actionId) => !actions[actionId]?.controlTypes?.includes("key"),
  );
  if (missing.length > 0) {
    throw new Error(`The configurator is missing key actions: ${missing.join(", ")}`);
  }
}

export function isCustom(entry) {
  return typeof entry === "object" && entry !== null && entry.type === "custom";
}

export function isCustomJoystick(entry) {
  return typeof entry === "object" && entry !== null && Array.isArray(entry.sectors);
}

export function makeCustomJoystick(directions, previous = []) {
  return {
    directions,
    sectors: Array.from({ length: directions }, (_, index) => previous[index] ?? "none"),
  };
}

export function formatCustomKeys(keys) {
  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);
  const modifierText = modifiers.map((key) => MODIFIER_SYMBOLS[key] ?? key).join("");
  return `${modifierText}${KEY_SYMBOLS[finalKey] ?? finalKey}`;
}

export function isValidEntry(controlId, entry) {
  if (controlId === "joystick") {
    if (isCustomJoystick(entry)) {
      return (
        JOYSTICK_DIRECTION_COUNTS.includes(entry.directions) &&
        entry.sectors.length === entry.directions &&
        entry.sectors.every((sector) => isValidEntry("key-1", sector))
      );
    }
    return JOYSTICK_ACTION_IDS.has(entry);
  }
  if (controlId === "wheel") {
    return typeof entry === "string" && Object.hasOwn(WHEEL_MODES, entry);
  }
  if (!KEY_CONTROL_IDS.has(controlId)) return false;
  if (isCustom(entry)) {
    if (!Array.isArray(entry.keys) || entry.keys.length === 0) return false;
    const modifiers = entry.keys.slice(0, -1);
    const finalKey = entry.keys.at(-1);
    return (
      typeof finalKey === "string" &&
      Object.hasOwn(FINAL_KEYCODES, finalKey) &&
      modifiers.every((modifier, index) =>
        typeof modifier === "string" &&
        MODIFIERS.includes(modifier) &&
        modifiers.indexOf(modifier) === index,
      )
    );
  }
  return KEY_ACTION_IDS.has(entry);
}

export function entryFingerprint(entry) {
  if (isCustom(entry)) return JSON.stringify(["custom", entry.keys]);
  if (isCustomJoystick(entry)) {
    return JSON.stringify([
      "joystick",
      entry.directions,
      entry.sectors.map((sector) => entryFingerprint(sector)),
    ]);
  }
  return JSON.stringify(entry ?? "none");
}

export function mappingsEqual(left, right) {
  const controlIds = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const controlId of controlIds) {
    if (entryFingerprint(left[controlId]) !== entryFingerprint(right[controlId])) return false;
  }
  return true;
}

export function loadStoredState(storage) {
  const fallback = { mapping: DEFAULT_MAPPING };
  try {
    const target = storage ?? globalThis.window?.localStorage;
    const raw = target?.getItem(MAPPING_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.mapping !== "object" || Array.isArray(parsed.mapping)) {
      return fallback;
    }
    const mapping = {};
    for (const [controlId, entry] of Object.entries(parsed.mapping)) {
      if (isValidEntry(controlId, entry)) mapping[controlId] = entry;
    }
    for (const controlId of Object.keys(DEFAULT_MAPPING)) {
      if (!(controlId in mapping)) mapping[controlId] = DEFAULT_MAPPING[controlId];
    }
    return { mapping };
  } catch {
    return fallback;
  }
}

export function saveStoredState(mapping, storage) {
  try {
    const target = storage ?? globalThis.window?.localStorage;
    target?.setItem(MAPPING_STORAGE_KEY, JSON.stringify({ mapping }));
    return true;
  } catch {
    return false;
  }
}

export function assignMappingEntry(mapping, controlId, joystickSlot, entry) {
  if (controlId !== "joystick" || joystickSlot === null) {
    return { ...mapping, [controlId]: entry };
  }

  const joystick = mapping.joystick;
  if (!isCustomJoystick(joystick) || !Number.isInteger(joystickSlot)) return mapping;
  if (joystickSlot < 0 || joystickSlot >= joystick.sectors.length) return mapping;

  const sectors = joystick.sectors.map((sector, index) =>
    index === joystickSlot ? entry : sector,
  );
  return { ...mapping, joystick: { ...joystick, sectors } };
}

export function setJoystickMappingMode(mapping, mode) {
  if (mode === "navigation" || mode === "none") {
    return { ...mapping, joystick: mode };
  }
  if (!JOYSTICK_DIRECTION_COUNTS.includes(mode)) return mapping;
  const previous = isCustomJoystick(mapping.joystick) ? mapping.joystick.sectors : [];
  return { ...mapping, joystick: makeCustomJoystick(mode, previous) };
}

export function toggleShortcutModifier(keys, modifier) {
  if (!MODIFIERS.includes(modifier) || keys.length === 0) return keys;
  const finalKey = keys.at(-1);
  const active = new Set(keys.slice(0, -1));
  if (active.has(modifier)) active.delete(modifier);
  else active.add(modifier);
  return [...MODIFIERS.filter((candidate) => active.has(candidate)), finalKey];
}

export function replaceShortcutFinalKey(keys, finalKey) {
  if (
    keys.length === 0 ||
    typeof finalKey !== "string" ||
    !Object.hasOwn(FINAL_KEYCODES, finalKey)
  ) {
    return keys;
  }
  return [...keys.slice(0, -1), finalKey];
}

export function indexDuplicateKeyControls(controls, mapping, selectedControlId) {
  const byEntry = new Map();
  for (const control of controls) {
    if (control.type !== "key" || control.id === selectedControlId) continue;
    const fingerprint = entryFingerprint(mapping[control.id]);
    if (!byEntry.has(fingerprint)) byEntry.set(fingerprint, control);
  }
  return byEntry;
}

export function parseOptionalNonNegativeInteger(value) {
  const trimmed = String(value).trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const error = new Error("Expected a non-negative integer.");
    error.code = "INVALID_APPSENSE_ID";
    throw error;
  }
  return parsed;
}
