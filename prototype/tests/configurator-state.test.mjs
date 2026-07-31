import assert from "node:assert/strict";
import test from "node:test";
import { ACTION_DEFINITIONS, DEFAULT_MAPPING } from "../../shared/input-profile.mjs";
import {
  DEFAULT_CUSTOM,
  MAPPING_STORAGE_KEY,
  assignMappingEntry,
  assertKeyActionCatalog,
  entryFingerprint,
  formatCustomKeys,
  indexDuplicateKeyControls,
  isCustom,
  isCustomJoystick,
  isValidEntry,
  loadStoredState,
  makeCustomJoystick,
  mappingsEqual,
  parseOptionalNonNegativeInteger,
  replaceShortcutFinalKey,
  saveStoredState,
  setJoystickMappingMode,
  toggleShortcutModifier,
} from "../src/configurator-state.js";

function storageFor(value) {
  return {
    getItem(key) {
      assert.equal(key, MAPPING_STORAGE_KEY);
      return value;
    },
  };
}

test("loads only valid stored assignments and restores every missing default", () => {
  const state = loadStoredState(
    storageFor(
      JSON.stringify({
        mapping: {
          "key-1": "settings",
          "key-2": { type: "custom", keys: ["Command", "K"] },
          wheel: "lines",
          joystick: {
            directions: 4,
            sectors: ["newSession", "voice", "diff", "none"],
          },
          unknown: "settings",
        },
      }),
    ),
  );

  assert.equal(state.mapping["key-1"], "settings");
  assert.deepEqual(state.mapping["key-2"], { type: "custom", keys: ["Command", "K"] });
  assert.equal(state.mapping.wheel, "lines");
  assert.equal(state.mapping.joystick.directions, 4);
  assert.equal("unknown" in state.mapping, false);
  assert.equal(state.mapping["key-13"], DEFAULT_MAPPING["key-13"]);
});

test("fails closed for unavailable, malformed, or structurally invalid storage", () => {
  assert.deepEqual(loadStoredState(storageFor(null)), { mapping: DEFAULT_MAPPING });
  assert.deepEqual(loadStoredState(storageFor("not-json")), { mapping: DEFAULT_MAPPING });
  assert.deepEqual(loadStoredState(storageFor(JSON.stringify({ mapping: [] }))), {
    mapping: DEFAULT_MAPPING,
  });
  assert.deepEqual(
    loadStoredState({
      getItem() {
        throw new Error("storage blocked");
      },
    }),
    { mapping: DEFAULT_MAPPING },
  );
});

test("validates key, wheel, and joystick entries from shared sources of truth", () => {
  assert.equal(isValidEntry("key-1", "sendInDuplicateSession"), true);
  assert.equal(isValidEntry("key-1", DEFAULT_CUSTOM), true);
  assert.equal(isValidEntry("key-1", { type: "custom", keys: ["Command", 1] }), false);
  assert.equal(isValidEntry("key-1", { type: "custom", keys: [] }), false);
  assert.equal(isValidEntry("key-1", { type: "custom", keys: ["Command", "Enter"] }), false);
  assert.equal(
    isValidEntry("key-1", { type: "custom", keys: ["Command", "Command", "K"] }),
    false,
  );
  assert.equal(isValidEntry("key-99", "settings"), false);
  assert.equal(isValidEntry("wheel", "effort"), true);
  assert.equal(isValidEntry("wheel", "navigation"), false);
  assert.equal(isValidEntry("wheel", "toString"), false);
  assert.equal(isValidEntry("joystick", "navigation"), true);
  assert.equal(
    isValidEntry("joystick", {
      directions: 8,
      sectors: new Array(8).fill("voice"),
    }),
    true,
  );
  assert.equal(
    isValidEntry("joystick", { directions: 6, sectors: new Array(6).fill("voice") }),
    false,
  );
});

test("fails fast when the UI catalogue drifts from shared key actions", () => {
  const allActions = Object.fromEntries(
    Object.keys(ACTION_DEFINITIONS).map((id) => [id, { controlTypes: ["key"] }]),
  );
  assert.doesNotThrow(() => assertKeyActionCatalog(allActions));
  delete allActions.voice;
  assert.throws(() => assertKeyActionCatalog(allActions), /missing key actions: voice/);
});

test("builds joystick mappings and formats custom shortcuts without mutation", () => {
  const previous = ["voice", "diff"];
  const joystick = makeCustomJoystick(4, previous);
  assert.deepEqual(joystick, {
    directions: 4,
    sectors: ["voice", "diff", "none", "none"],
  });
  assert.deepEqual(previous, ["voice", "diff"]);
  assert.equal(isCustomJoystick(joystick), true);
  assert.equal(isCustom(DEFAULT_CUSTOM), true);
  assert.equal(formatCustomKeys(["Command", "Shift", "BracketLeft"]), "⌘⇧[");
});

test("compares normalized mappings and indexes duplicate key assignments once", () => {
  assert.equal(mappingsEqual({ "key-1": "voice" }, { "key-1": "voice", "key-2": "none" }), true);
  assert.equal(
    mappingsEqual(
      { "key-1": { type: "custom", keys: ["Command", "K"] } },
      { "key-1": { keys: ["Command", "K"], type: "custom" } },
    ),
    true,
  );
  assert.equal(
    mappingsEqual(
      { joystick: { directions: 4, sectors: ["voice", "diff", "none", "none"] } },
      { joystick: { sectors: ["voice", "diff", "none", "none"], directions: 4 } },
    ),
    true,
  );
  assert.equal(mappingsEqual({ "key-1": "voice" }, { "key-1": "diff" }), false);
  assert.equal(entryFingerprint(undefined), JSON.stringify("none"));

  const controls = [
    { id: "key-1", type: "key" },
    { id: "key-2", type: "key" },
    { id: "key-3", type: "key" },
    { id: "wheel", type: "dial" },
  ];
  const index = indexDuplicateKeyControls(
    controls,
    { "key-1": "voice", "key-2": "voice", "key-3": "voice", wheel: "effort" },
    "key-1",
  );
  assert.equal(index.get(entryFingerprint("voice")).id, "key-2");
  assert.equal(index.has(entryFingerprint("effort")), false);
});

test("parses optional AppSense ids and preserves the stable error code", () => {
  assert.equal(parseOptionalNonNegativeInteger(""), undefined);
  assert.equal(parseOptionalNonNegativeInteger(" 12 "), 12);
  assert.equal(parseOptionalNonNegativeInteger(0), 0);
  for (const value of [
    "-1",
    "1.5",
    "0x10",
    "0b11",
    "1e3",
    "9007199254740992",
    "not-a-number",
  ]) {
    assert.throws(() => parseOptionalNonNegativeInteger(value), {
      code: "INVALID_APPSENSE_ID",
    });
  }
});

test("persists mappings defensively", () => {
  const writes = [];
  assert.equal(
    saveStoredState({ "key-1": "voice" }, { setItem: (...args) => writes.push(args) }),
    true,
  );
  assert.deepEqual(writes, [
    [MAPPING_STORAGE_KEY, JSON.stringify({ mapping: { "key-1": "voice" } })],
  ]);
  assert.equal(
    saveStoredState({}, { setItem: () => { throw new Error("quota"); } }),
    false,
  );
});

test("updates direct and joystick assignments without mutating previous mappings", () => {
  const initial = {
    ...DEFAULT_MAPPING,
    joystick: { directions: 4, sectors: ["voice", "none", "none", "none"] },
  };
  const direct = assignMappingEntry(initial, "key-1", null, "settings");
  assert.equal(direct["key-1"], "settings");
  assert.equal(initial["key-1"], DEFAULT_MAPPING["key-1"]);

  const joystick = assignMappingEntry(initial, "joystick", 1, "diff");
  assert.deepEqual(joystick.joystick.sectors, ["voice", "diff", "none", "none"]);
  assert.deepEqual(initial.joystick.sectors, ["voice", "none", "none", "none"]);
  assert.equal(assignMappingEntry(initial, "joystick", 9, "diff"), initial);
  assert.equal(
    assignMappingEntry({ ...initial, joystick: "navigation" }, "joystick", 0, "diff").joystick,
    "navigation",
  );
});

test("changes joystick modes and custom shortcuts through pure transformations", () => {
  const custom = {
    ...DEFAULT_MAPPING,
    joystick: { directions: 4, sectors: ["voice", "diff", "none", "none"] },
  };
  assert.equal(setJoystickMappingMode(custom, "navigation").joystick, "navigation");
  assert.equal(setJoystickMappingMode(custom, 6), custom);
  assert.deepEqual(setJoystickMappingMode(custom, 8).joystick.sectors, [
    "voice", "diff", "none", "none", "none", "none", "none", "none",
  ]);

  const keys = ["Command", "K"];
  assert.deepEqual(toggleShortcutModifier(keys, "Shift"), ["Command", "Shift", "K"]);
  assert.deepEqual(toggleShortcutModifier(["Command", "Shift", "K"], "Command"), ["Shift", "K"]);
  assert.equal(toggleShortcutModifier(keys, "unknown"), keys);
  assert.deepEqual(replaceShortcutFinalKey(keys, "F1"), ["Command", "F1"]);
  assert.equal(replaceShortcutFinalKey(keys, "Enter"), keys);
  assert.equal(replaceShortcutFinalKey(keys, 1), keys);
});
