import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  ACTION_DEFINITIONS,
  addClaudeLayer,
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
  // La molette est en mode Effort par défaut : les deux sens référencent donc
  // une action générée, pas un keycode direct.
  const defaultEncoder = claude.layout.encoders[0].map((entry) => entry.keycode);
  assert.match(defaultEncoder[0], /^KA_\d+$/);
  assert.match(defaultEncoder[1], /^KA_\d+$/);
  assert.equal(defaultEncoder[2], "KC_NONE");
  assert.equal(deriveMappingFromProfile(profile).mapping.wheel, "effort");
  assert.deepEqual(
    claude.layout.joystick.sectors.map((sector) => sector.k),
    ["KI_X", "KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"],
  );
  assert.equal(profile.profile.name, "Claude macOS");
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

test("does not claim that AppSense was preserved when the Claude layer is not linked", () => {
  const source = sourceProfile();
  delete source.profile.layers[1].linkedAppId;

  const { profile, report } = buildInputProfile(source, DEFAULT_MAPPING, {
    requireAppSense: false,
  });

  assert.equal(profile.profile.layers[1].linkedAppId, undefined);
  assert.equal(report.appSenseLinked, false);
  assert.equal(report.appSensePreserved, false);
});

test("forces the Claude AppSense link even when the source has lost it", () => {
  const source = sourceProfile();
  delete source.profile.layers[1].linkedAppId;

  const { profile, report } = buildInputProfile(source, DEFAULT_MAPPING, {
    appSenseId: 4,
  });

  assert.equal(profile.profile.layers[1].linkedAppId, 4);
  assert.equal(report.appSenseId, 4);
  assert.equal(report.appSenseForced, true);
  assert.equal(report.baseLayerAppSenseId, null);
  // Forcer le lien dispense de l'exiger dans la source, sans avoir à passer
  // requireAppSense: false.
  assert.equal(report.appSenseLinked, false);
});

test("reports the inherited AppSense id when nothing is forced", () => {
  const { report } = buildInputProfile(sourceProfile(), DEFAULT_MAPPING);

  assert.equal(report.appSenseId, 7);
  assert.equal(report.appSenseForced, false);
  assert.equal(report.baseLayerAppSenseId, null);
});

test("links the native layer to a second app without touching its keymap", () => {
  const source = sourceProfile();
  const nativeKeymap = structuredClone(source.profile.layers[0].layout);

  const { profile, report } = buildInputProfile(source, DEFAULT_MAPPING, {
    baseLayerAppSenseId: 1,
  });

  assert.equal(profile.profile.layers[0].linkedAppId, 1);
  assert.deepEqual(profile.profile.layers[0].layout, nativeKeymap);
  assert.equal(profile.profile.layers[1].linkedAppId, 7);
  assert.equal(report.baseLayerAppSenseId, 1);
  assert.equal(report.nativeLayerPreserved, true);
});

test("rejects invalid or colliding AppSense ids", () => {
  assert.throws(
    () => buildInputProfile(sourceProfile(), DEFAULT_MAPPING, { appSenseId: -1 }),
    /appSenseId/,
  );
  assert.throws(
    () => buildInputProfile(sourceProfile(), DEFAULT_MAPPING, { baseLayerAppSenseId: "1" }),
    /baseLayerAppSenseId/,
  );
  // Deux layers liés à la même application rendraient la bascule ambiguë.
  assert.throws(
    () =>
      buildInputProfile(sourceProfile(), DEFAULT_MAPPING, {
        appSenseId: 3,
        baseLayerAppSenseId: 3,
      }),
    /même entrée AppSense/,
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

test("builds the two explicit Claude send actions without opening Enter to custom shortcuts", () => {
  const { profile } = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    "key-1": "send",
    "key-2": "sendInDuplicateSession",
  });
  const claude = profile.profile.layers[1];
  const duplicateSession = profile.actions.find(
    (action) => action.name === "Claude Send in Duplicate Session",
  );

  assert.equal(claude.layout.base[2][0].keycode, "KC_ENT");
  assert.ok(duplicateSession, "duplicated-session send becomes a named action");
  assert.equal(claude.layout.base[2][1].keycode, `KA_${duplicateSession.id}`);
  assert.deepEqual(
    duplicateSession.keyInputs.map(({ keycode, actionType }) => [keycode, actionType]),
    [
      ["KC_LALT", 1],
      ["KC_LGUI", 1],
      ["KC_ENT", 2],
      ["KC_LGUI", 0],
      ["KC_LALT", 0],
    ],
  );

  const derived = deriveMappingFromProfile(profile);
  assert.equal(derived.mapping["key-1"], "send");
  assert.equal(derived.mapping["key-2"], "sendInDuplicateSession");
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
    ["KC_DOWN", "KC_UP", "KC_NONE"],
  );

  const volume = buildInputProfile(sourceProfile(), { ...DEFAULT_MAPPING, wheel: "volume" });
  assert.deepEqual(
    volume.profile.profile.layers[1].layout.encoders[0].map((entry) => entry.keycode),
    ["KC_VOLU", "KC_VOLD", "KC_NONE"],
  );

  const effort = buildInputProfile(sourceProfile(), { ...DEFAULT_MAPPING, wheel: "effort" });
  const effortEncoder = effort.profile.profile.layers[1].layout.encoders[0];
  assert.match(effortEncoder[0].keycode, /^KA_\d+$/);
  assert.match(effortEncoder[1].keycode, /^KA_\d+$/);
  assert.equal(effortEncoder[2].keycode, "KC_NONE");

  const effortDown = effort.profile.actions.find(
    (action) => action.name === "Claude Effort Down",
  );
  const effortUp = effort.profile.actions.find(
    (action) => action.name === "Claude Effort Up",
  );
  assert.ok(effortDown);
  assert.ok(effortUp);
  assert.equal(effortEncoder[0].keycode, `KA_${effortUp.id}`);
  assert.equal(effortEncoder[1].keycode, `KA_${effortDown.id}`);
  assert.deepEqual(
    effortDown.keyInputs.map(({ keycode, delay, actionType }) => [
      keycode,
      delay,
      actionType,
    ]),
    [
      ["KC_LGUI", 0, 1],
      ["KC_LSFT", 0, 1],
      ["KC_E", 0, 2],
      ["KC_LSFT", 0, 0],
      ["KC_LGUI", 80, 0],
      ["KC_LEFT", 0, 2],
      ["KC_ESC", 10, 2],
    ],
  );
  assert.equal(effortUp.keyInputs[5].keycode, "KC_RGHT");
  assert.equal(deriveMappingFromProfile(effort.profile).mapping.wheel, "effort");
});

test("maps all 13 switches while preserving the layer sensor", () => {
  const source = sourceProfile();
  source.profile.layers[1].layout.base[3][0].keycode = "KV_LAYER_SENSOR";
  const configured = buildInputProfile(source, {
    ...DEFAULT_MAPPING,
    "key-9": "settings",
    "key-10": "find",
    "key-5": "findNext",
    "key-8": "findPrevious",
    "key-11": "back",
    "key-12": "forward",
    "key-13": "reload",
  });
  const layout = configured.profile.profile.layers[1].layout;

  assert.match(layout.base[0][0].keycode, /^KA_\d+$/);
  assert.match(layout.base[0][1].keycode, /^KA_\d+$/);
  assert.match(layout.base[1][0].keycode, /^KA_\d+$/);
  assert.match(layout.base[1][3].keycode, /^KA_\d+$/);
  assert.equal(layout.base[3][0].keycode, "KV_LAYER_SENSOR");
  assert.match(layout.base[3][1].keycode, /^KA_\d+$/);
  assert.match(layout.base[3][2].keycode, /^KA_\d+$/);
  assert.match(layout.encoders[0][2].keycode, /^KA_\d+$/);
  assert.equal(configured.report.assignedSwitches, 11);

  const shortTopRow = sourceProfile();
  shortTopRow.profile.layers[1].layout.base[0] = [{ keycode: "KC_NONE" }];
  assert.throws(
    () => buildInputProfile(shortTopRow, DEFAULT_MAPPING),
    (error) => error.code === "BAD_TOP_ROW",
  );

  const shortBottomRow = sourceProfile();
  shortBottomRow.profile.layers[1].layout.base[3] = [{ keycode: "KC_NONE" }];
  assert.throws(
    () => buildInputProfile(shortBottomRow, DEFAULT_MAPPING),
    (error) => error.code === "BAD_BOTTOM_ROW",
  );
});

test("derives the existing layer mapping back from a built profile", () => {
  const requested = {
    ...DEFAULT_MAPPING,
    "key-2": { type: "custom", keys: ["Command", "Option", "L"] },
    "key-5": "voice",
    "key-9": "settings",
    "key-11": "find",
    "key-13": "closeWindow",
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
  assert.equal(derived.mapping["key-9"], "settings");
  assert.equal(derived.mapping["key-11"], "find");
  assert.equal(derived.mapping["key-13"], "closeWindow");
  assert.equal(derived.mapping.wheel, "lines");
  assert.equal(derived.mapping.joystick, "navigation");

  const fresh = deriveMappingFromProfile(sourceProfile());
  assert.equal(fresh.mapping["key-4"], "stop");
  assert.equal(fresh.mapping["key-12"], "none");
  assert.equal(fresh.mapping["key-13"], "none");
});

test("builds the expanded Claude shortcut catalog", () => {
  const { profile } = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    "key-9": "settings",
    "key-10": "find",
    "key-5": "findNext",
    "key-6": "findPrevious",
    "key-7": "back",
    "key-8": "forward",
    "key-11": "zoomIn",
    "key-12": "zoomOut",
    "key-13": "resetZoom",
  });
  const actionNames = new Set(profile.actions.map((action) => action.name));

  for (const expected of [
    "Claude Settings",
    "Claude Find",
    "Claude Find Next",
    "Claude Find Previous",
    "Claude Back",
    "Claude Forward",
    "Claude Zoom In",
    "Claude Zoom Out",
    "Claude Reset Zoom",
  ]) {
    assert.ok(actionNames.has(expected), `${expected} should be generated`);
  }
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

test("addClaudeLayer clones a template layer, neutralized and without AppSense", () => {
  const source = sourceProfile();
  source.profile.layers[1].name = "Codex";
  source.profile.layers[1].layout.base[3][0].keycode = "KV_LAYER_SENSOR";
  const snapshot = structuredClone(source);

  const { source: augmented, templateName, layerIndex } = addClaudeLayer(source);

  assert.deepEqual(source, snapshot);
  assert.equal(templateName, "Codex");
  assert.equal(layerIndex, 2);

  const layer = augmented.profile.layers[2];
  assert.equal(layer.name, "Claude");
  assert.equal(layer.linkedAppId, undefined);
  assert.equal(layer.layout.base[3][0].keycode, "KV_LAYER_SENSOR");
  assert.ok(
    layer.layout.base
      .flatMap((row, rowIndex) =>
        row.filter((_, columnIndex) => !(rowIndex === 3 && columnIndex === 0)),
      )
      .every((cell) => cell.keycode === "KC_NONE"),
  );
  assert.ok(layer.layout.encoders[0].every((cell) => cell.keycode === "KC_NONE"));

  const inspection = inspectInputProfile(augmented, { requireAppSense: false });
  assert.equal(inspection.appSenseLinked, false);
  assert.equal(inspection.layerIndex, 2);

  const { profile, report } = buildInputProfile(augmented, DEFAULT_MAPPING, {
    requireAppSense: false,
  });
  assert.equal(report.appSenseLinked, false);
  assert.equal(profile.profile.layers[2].linkedAppId, undefined);
  assert.deepEqual(
    profile.profile.layers[2].layout.base[2].map((entry) => entry.keycode),
    ["KA_0", "KA_1", "KA_2", "KC_ESC"],
  );
});

test("addClaudeLayer refuses duplicates, full profiles, and missing templates", () => {
  assert.throws(() => addClaudeLayer(sourceProfile()), /existe déjà/);

  const codex = sourceProfile();
  codex.profile.layers[1].name = "Codex";

  const full = structuredClone(codex);
  while (full.profile.layers.length < 6) {
    full.profile.layers.push(structuredClone(full.profile.layers[1]));
  }
  assert.throws(() => addClaudeLayer(full), /six layers/);

  const nativeOnly = structuredClone(codex);
  nativeOnly.profile.layers = [nativeOnly.profile.layers[0]];
  assert.throws(() => addClaudeLayer(nativeOnly), /modèle/);
});

test("inspection requires AppSense by default but can report its absence", () => {
  const source = sourceProfile();
  delete source.profile.layers[1].linkedAppId;

  assert.throws(() => inspectInputProfile(source), /AppSense/);

  const inspection = inspectInputProfile(source, { requireAppSense: false });
  assert.equal(inspection.appSenseLinked, false);
});

test("assigns Claude actions to four joystick directions", () => {
  const { profile, report } = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    joystick: {
      directions: 4,
      sectors: ["newSession", "voice", "diff", "settings"],
    },
  });
  const { sectors } = profile.profile.layers[1].layout.joystick;

  // Le premier secteur reste la zone de fermeture, les quatre suivants portent
  // des références d'action et non des keycodes nus.
  assert.equal(sectors.length, 5);
  assert.equal(sectors[0].k, "KI_X");
  for (const sector of sectors.slice(1)) {
    assert.match(sector.k, /^KA_\d+$/);
  }
  assert.equal(report.joystickMode, "4 directions");

  const names = sectors
    .slice(1)
    .map((sector) => profile.actions.find((a) => `KA_${a.id}` === sector.k).name);
  assert.deepEqual(names, [
    "Claude New",
    "Claude Voice",
    "Claude Diff",
    "Claude Settings",
  ]);
});

test("supports eight joystick directions and round-trips them", () => {
  const sectorsIn = [
    "newSession",
    "voice",
    "diff",
    "settings",
    "find",
    "findNext",
    "back",
    "forward",
  ];
  const { profile } = buildInputProfile(sourceProfile(), {
    ...DEFAULT_MAPPING,
    joystick: { directions: 8, sectors: sectorsIn },
  });

  assert.equal(profile.profile.layers[1].layout.joystick.sectors.length, 9);
  assert.deepEqual(deriveMappingFromProfile(profile).mapping.joystick, {
    directions: 8,
    sectors: sectorsIn,
  });
});

test("keeps reading the four-arrow preset as navigation", () => {
  const { profile } = buildInputProfile(sourceProfile(), DEFAULT_MAPPING);
  assert.equal(deriveMappingFromProfile(profile).mapping.joystick, "navigation");
});

test("rejects an unsupported joystick direction count or a sector mismatch", () => {
  assert.throws(
    () =>
      buildInputProfile(sourceProfile(), {
        ...DEFAULT_MAPPING,
        joystick: { directions: 6, sectors: new Array(6).fill("voice") },
      }),
    /4 ou 8 directions/,
  );

  assert.throws(
    () =>
      buildInputProfile(sourceProfile(), {
        ...DEFAULT_MAPPING,
        joystick: { directions: 4, sectors: ["voice", "diff"] },
      }),
    /4 directions mais porte 2 secteurs/,
  );
});
