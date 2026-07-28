import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  ACTION_DEFINITIONS,
  buildInputProfile,
  DEFAULT_MAPPING,
  deriveMappingFromProfile,
  FORBIDDEN_KEYS,
  inspectInputProfile,
} from "../shared/input-profile.mjs";

function sourceProfile() {
  return {
    keyboard: "codex_micro",
    language: "us",
    profile: {
      id: 0,
      name: "Default",
      layers: [
        {
          id: 0,
          name: "Layer 1",
          layout: {
            encoders: [[
              { keycode: "KV_OAI_ENC_CC" },
              { keycode: "KV_OAI_ENC_CW" },
              { keycode: "KV_OAI_ENC_CLK" },
            ]],
            joystick: { type: "VENDOR", sectors: [] },
            base: [[{ keycode: "KV_0" }]],
          },
        },
        {
          id: 1,
          name: "Claude",
          linkedAppId: 7,
          layout: {
            encoders: [[
              { keycode: "KC_NONE" },
              { keycode: "KC_NONE" },
              { keycode: "KC_NONE" },
            ]],
            joystick: {
              type: "RADIAL",
              sectors: [
                { k: "KI_X", a1: 0.1875, a2: 0.3125 },
                { k: "KC_NONE", a1: 0.3125, a2: 0.1875 },
              ],
            },
            base: [
              [{ keycode: "KC_NONE" }, { keycode: "KC_NONE" }],
              [
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
              ],
              [
                { keycode: "KA_0" },
                { keycode: "KA_1" },
                { keycode: "KA_2" },
                { keycode: "KC_ESC" },
              ],
              [
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
                { keycode: "KC_NONE" },
              ],
            ],
          },
        },
      ],
    },
    actions: [
      {
        id: 0,
        name: "Claude New",
        color: null,
        keyInputs: [
          { keycode: "KC_LGUI", delay: 0, actionType: 1 },
          { keycode: "KC_N", delay: 0, actionType: 2 },
          { keycode: "KC_LGUI", delay: 0, actionType: 0 },
        ],
      },
    ],
    multiactions: [],
    smartActions: [],
    actionGroups: [{ id: 0, name: "Default", actionIds: [0] }],
    multiactionGroups: [],
    smartActionGroups: [],
  };
}

test("recognizes exactly one non-native Claude layer with AppSense", () => {
  const report = inspectInputProfile(sourceProfile());
  assert.equal(report.device, "codex_micro");
  assert.equal(report.layerIndex, 1);
  assert.equal(report.appSenseLinked, true);
});

test("builds the canonical mapping without touching the source or native layer", () => {
  const source = sourceProfile();
  const sourceSnapshot = structuredClone(source);
  const nativeSnapshot = structuredClone(source.profile.layers[0]);
  const { profile, report } = buildInputProfile(source, DEFAULT_MAPPING);
  const claude = profile.profile.layers[1];

  assert.deepEqual(source, sourceSnapshot);
  assert.deepEqual(profile.profile.layers[0], nativeSnapshot);
  assert.equal(claude.linkedAppId, 7);
  assert.deepEqual(
    claude.layout.base[2].map((entry) => entry.keycode),
    ["KA_0", "KA_1", "KA_2", "KC_ESC"],
  );
  assert.deepEqual(
    claude.layout.encoders[0].map((entry) => entry.keycode),
    ["KC_PGUP", "KC_PGDN", "KC_NONE"],
  );
  assert.deepEqual(
    claude.layout.joystick.sectors.map((sector) => sector.k),
    ["KI_X", "KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"],
  );
  assert.equal(profile.profile.name, "Claude macOS");
  assert.deepEqual(
    profile.actionGroups,
    [{ id: 0, name: "Claude Codex Micro", actionIds: [1, 2] }],
  );
  assert.equal(report.nativeLayerPreserved, true);
  assert.equal(report.appSensePreserved, true);

  const voice = profile.actions.find((action) => action.name === "Claude Voice");
  const diff = profile.actions.find((action) => action.name === "Claude Diff");
  assert.deepEqual(
    voice.keyInputs.map(({ keycode, actionType }) => [keycode, actionType]),
    [["KC_LGUI", 1], ["KC_D", 2], ["KC_LGUI", 0]],
  );
  assert.deepEqual(
    diff.keyInputs.map(({ keycode, actionType }) => [keycode, actionType]),
    [
      ["KC_LGUI", 1],
      ["KC_LSFT", 1],
      ["KC_D", 2],
      ["KC_LSFT", 0],
      ["KC_LGUI", 0],
    ],
  );
});

test("supports explicitly unassigned controls", () => {
  const { profile } = buildInputProfile(sourceProfile(), {
    joystick: "none",
    wheel: "none",
    "key-1": "none",
    "key-2": "voice",
    "key-3": "diff",
    "key-4": "stop",
  });
  const claude = profile.profile.layers[1];

  assert.equal(claude.layout.base[2][0].keycode, "KC_NONE");
  assert.deepEqual(
    claude.layout.encoders[0].map((entry) => entry.keycode),
    ["KC_NONE", "KC_NONE", "KC_NONE"],
  );
  assert.deepEqual(
    claude.layout.joystick.sectors.map((sector) => sector.k),
    ["KI_X", "KC_NONE"],
  );
});

test("rejects the wrong device, an ambiguous layer, a native target, or missing AppSense", () => {
  const wrongDevice = sourceProfile();
  wrongDevice.keyboard = "creator_micro";
  assert.throws(() => inspectInputProfile(wrongDevice), /Codex Micro/);

  const ambiguous = sourceProfile();
  ambiguous.profile.layers.push(structuredClone(ambiguous.profile.layers[1]));
  assert.throws(() => inspectInputProfile(ambiguous), /Plusieurs layers/);

  const nativeTarget = sourceProfile();
  nativeTarget.profile.layers[0].name = "Claude";
  nativeTarget.profile.layers.splice(1, 1);
  assert.throws(() => inspectInputProfile(nativeTarget), /index 0/);

  const withoutAppSense = sourceProfile();
  delete withoutAppSense.profile.layers[1].linkedAppId;
  assert.throws(() => inspectInputProfile(withoutAppSense), /AppSense/);

  const malformedAppSense = sourceProfile();
  malformedAppSense.profile.layers[1].linkedAppId = [];
  assert.throws(() => inspectInputProfile(malformedAppSense), /AppSense/);
});

test("builds a custom shortcut as a reusable action and a bare key directly", () => {
  const { profile } = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    "key-1": { type: "custom", keys: ["Command", "Shift", "K"] },
    "key-2": { type: "custom", keys: ["F5"] },
  });
  const claude = profile.profile.layers[1];

  const custom = profile.actions.find((action) => action.name === "Custom Command+Shift+K");
  assert.ok(custom, "custom shortcut becomes a named action");
  assert.deepEqual(
    custom.keyInputs.map(({ keycode, actionType }) => [keycode, actionType]),
    [
      ["KC_LGUI", 1],
      ["KC_LSFT", 1],
      ["KC_K", 2],
      ["KC_LSFT", 0],
      ["KC_LGUI", 0],
    ],
  );
  assert.equal(claude.layout.base[2][0].keycode, `KA_${custom.id}`);
  assert.equal(claude.layout.base[2][1].keycode, "KC_F5");
});

test("refuses forbidden keys and bare printable keys", () => {
  for (const key of FORBIDDEN_KEYS) {
    assert.throws(
      () =>
        buildInputProfile(sourceProfile(), {
          ...DEFAULT_MAPPING,
          "key-1": { type: "custom", keys: ["Command", key] },
        }),
      (error) => error.code === "FORBIDDEN_KEY",
      `${key} must be rejected`,
    );
  }
  assert.throws(
    () =>
      buildInputProfile(sourceProfile(), {
        ...DEFAULT_MAPPING,
        "key-1": { type: "custom", keys: ["A"] },
      }),
    (error) => error.code === "PRINTABLE_NEEDS_MODIFIER",
  );
});

test("supports the additional wheel modes", () => {
  const lines = buildInputProfile(sourceProfile(), { ...DEFAULT_MAPPING, wheel: "lines" });
  assert.deepEqual(
    lines.profile.profile.layers[1].layout.encoders[0].map((entry) => entry.keycode),
    ["KC_UP", "KC_DOWN", "KC_NONE"],
  );

  const volume = buildInputProfile(sourceProfile(), { ...DEFAULT_MAPPING, wheel: "volume" });
  assert.deepEqual(
    volume.profile.profile.layers[1].layout.encoders[0].map((entry) => entry.keycode),
    ["KC_VOLD", "KC_VOLU", "KC_NONE"],
  );
});

test("writes the advanced row only on explicit opt-in", () => {
  const untouched = buildInputProfile(sourceProfile(), DEFAULT_MAPPING);
  assert.deepEqual(
    untouched.profile.profile.layers[1].layout.base[1].map((entry) => entry.keycode),
    ["KC_NONE", "KC_NONE", "KC_NONE", "KC_NONE"],
  );
  assert.equal(untouched.report.advancedAssignments, 0);

  const advanced = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    "key-5": "newSession",
    "key-6": "none",
  });
  const row = advanced.profile.profile.layers[1].layout.base[1];
  assert.match(row[0].keycode, /^KA_\d+$/);
  assert.equal(row[1].keycode, "KC_NONE");
  assert.equal(advanced.report.advancedAssignments, 2);

  const shortRow = sourceProfile();
  shortRow.profile.layers[1].layout.base[1] = [{ keycode: "KC_NONE" }];
  assert.throws(
    () => buildInputProfile(shortRow, { ...DEFAULT_MAPPING, "key-5": "stop" }),
    (error) => error.code === "BAD_ADVANCED_ROW",
  );
});

test("derives the existing layer mapping back from a built profile", () => {
  const requested = {
    ...DEFAULT_MAPPING,
    "key-2": { type: "custom", keys: ["Command", "Option", "L"] },
    "key-5": "voice",
    wheel: "lines",
  };
  const { profile } = buildInputProfile(sourceProfile(), requested);
  const derived = deriveMappingFromProfile(profile);

  assert.equal(derived.mapping["key-1"], "newSession");
  assert.deepEqual(derived.mapping["key-2"], {
    type: "custom",
    keys: ["Command", "Option", "L"],
  });
  assert.equal(derived.mapping["key-3"], "diff");
  assert.equal(derived.mapping["key-4"], "stop");
  assert.equal(derived.mapping["key-5"], "voice");
  assert.equal(derived.mapping.wheel, "lines");
  assert.equal(derived.mapping.joystick, "navigation");
  assert.equal(derived.advancedInUse, true);

  const fresh = deriveMappingFromProfile(sourceProfile());
  assert.equal(fresh.mapping["key-4"], "stop");
  assert.equal(fresh.advancedInUse, false);
});

test("shared action definitions stay in sync with the canonical mapping.json", () => {
  const canonical = JSON.parse(
    readFileSync(new URL("../profiles/claude-shortcuts/mapping.json", import.meta.url), "utf8"),
  );
  const byMeaning = Object.fromEntries(
    canonical.controls
      .filter((control) => Array.isArray(control.action.keys))
      .map((control) => [control.action.meaning, control.action.keys]),
  );
  const normalize = (keys) => keys.map((key) => (key === "Meta" ? "Command" : key));

  assert.deepEqual(normalize(byMeaning["new-conversation"]), ACTION_DEFINITIONS.newSession.keys);
  assert.deepEqual(normalize(byMeaning["voice-dictation"]), ACTION_DEFINITIONS.voice.keys);
  assert.deepEqual(normalize(byMeaning["toggle-diff"]), ACTION_DEFINITIONS.diff.keys);
  assert.deepEqual(byMeaning["cancel-or-close-contextually"], [ACTION_DEFINITIONS.stop.key]);
});
