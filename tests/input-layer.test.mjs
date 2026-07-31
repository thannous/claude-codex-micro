import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  assertSafeRestoreDestination,
  createRestorableBackup,
  inspectOfficialExport,
  inventoryFromProfileExport,
  restoreStorageSnapshot,
  sanitizeOfficialLayerExport,
  sha256File,
  verifyBackup,
} from "../scripts/lib/input-export.mjs";
import {
  buildInstallPlan,
  evaluateInstallCompatibility,
  findBundledArtifact,
  loadPreset,
  validatePreset,
} from "../scripts/lib/preset.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function requiredControl(mapping, controlId) {
  const control = mapping.controls.find(
    (candidate) => candidate.id === controlId,
  );
  assert.ok(control, `Expected fixture control ${controlId}`);
  return control;
}

function officialProfileExport() {
  return {
    keyboard: "codex_micro",
    language: "en-US",
    profile: {
      name: "Mac",
      layers: [
        { index: 0, name: "Codex", color: "#FFFFFF", appSense: [] },
        { index: 1, name: "Claude", color: "#D97757", linkedAppId: 4 },
        { index: 2, name: "Browser", color: "#336699", appSense: ["com.apple.Safari"] },
      ],
    },
    actions: [],
    multiactions: [],
    smartActions: [],
    actionGroups: [],
    multiactionGroups: [],
    smartActionGroups: [],
  };
}

function officialLayerExport(extra = {}) {
  return {
    keyboard: "codex_micro",
    language: "en-US",
    layer: { name: "Claude", color: "#D97757" },
    actions: [],
    multiactions: [],
    smartActions: [],
    actionGroups: [],
    multiactionGroups: [],
    smartActionGroups: [],
    ...extra,
  };
}

function canonicalLayerExport() {
  const none = () => ({ keycode: "KC_NONE" });
  return {
    keyboard: "codex_micro",
    language: "en-US",
    layer: {
      name: "Claude",
      layout: {
        encoders: [[
          { keycode: "KC_PGUP" },
          { keycode: "KC_PGDN" },
          { keycode: "KC_NONE" },
        ]],
        joystick: {
          type: "RADIAL",
          sectors: ["KI_X", "KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"].map((key) => ({ k: key })),
        },
        base: [
          [none(), none()],
          [none(), none(), none(), none()],
          [
            { keycode: "KA_0" },
            { keycode: "KA_1" },
            { keycode: "KA_2" },
            { keycode: "KC_ESC" },
          ],
          [none(), none(), none()],
        ],
      },
    },
    actions: [
      {
        id: 0,
        keyInputs: [
          { keycode: "KC_LGUI", delay: 0, actionType: 1 },
          { keycode: "KC_N", delay: 0, actionType: 2 },
          { keycode: "KC_LGUI", delay: 0, actionType: 0 },
        ],
      },
      {
        id: 1,
        keyInputs: [
          { keycode: "KC_LGUI", delay: 0, actionType: 1 },
          { keycode: "KC_D", delay: 0, actionType: 2 },
          { keycode: "KC_LGUI", delay: 0, actionType: 0 },
        ],
      },
      {
        id: 2,
        keyInputs: [
          { keycode: "KC_LGUI", delay: 0, actionType: 1 },
          { keycode: "KC_LSFT", delay: 0, actionType: 1 },
          { keycode: "KC_D", delay: 0, actionType: 2 },
          { keycode: "KC_LSFT", delay: 0, actionType: 0 },
          { keycode: "KC_LGUI", delay: 0, actionType: 0 },
        ],
      },
    ],
    multiactions: [],
    smartActions: [],
    actionGroups: [],
    multiactionGroups: [],
    smartActionGroups: [],
  };
}

test("manifest and mapping enforce safe V1 invariants", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const result = validatePreset(manifest, mapping);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(manifest.preservation.targetLayerPolicy, "exactly-one-existing-named-layer");
  assert.ok(manifest.validation.required.includes("existing-claude-layer-confirmed"));
  assert.ok(!manifest.validation.required.includes("first-free-layer-confirmed"));
  assert.equal(mapping.controls.find((control) => control.id === "joystick").physical.column, 4);
  assert.equal(mapping.controls.find((control) => control.id === "encoder-rotate").physical.column, 1);
});


test("validators reject a sensitive key and an unprotected native layer", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));

  const unsafeMapping = structuredClone(mapping);
  unsafeMapping.controls[0].action = { type: "key", keys: ["Enter"], meaning: "send-message" };
  const unsafeResult = validatePreset(manifest, unsafeMapping);
  assert.equal(unsafeResult.ok, false);
  assert.match(unsafeResult.errors.join(" "), /sensitive action/);

  const unsafeManifest = structuredClone(manifest);
  unsafeManifest.preservation.protectedLayerIndexes = [];
  const preservationResult = validatePreset(unsafeManifest, mapping);
  assert.equal(preservationResult.ok, false);
  assert.match(preservationResult.errors.join(" "), /index 0 must be protected/);

  const staleManifest = structuredClone(manifest);
  staleManifest.validation.required = staleManifest.validation.required.map((item) =>
    item === "existing-claude-layer-confirmed" ? "first-free-layer-confirmed" : item
  );
  const staleResult = validatePreset(staleManifest, mapping);
  assert.equal(staleResult.ok, false);
  assert.match(staleResult.errors.join(" "), /first-free layer selection is forbidden/);
});

test("preset diagnostics cover every safety contract with actionable messages", async (t) => {
  const original = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const cases = [
    {
      name: "manifest identity and compatibility",
      mutate({ manifest }) {
        manifest.formatVersion = "2.0.0";
        manifest.status = "unknown";
        manifest.target.platform = "Linux";
        manifest.target.application.bundleId = "wrong.app";
        manifest.compatibility.input.bundleId = "wrong.input";
        manifest.compatibility.input.supportedVersions = [];
      },
      expected: [
        /formatVersion must be 1\.0\.0/,
        /Unsupported preset status/,
        /target\.platform must be macOS/,
        /Claude Desktop bundle identifier/,
        /Input bundle identifier/,
        /supportedVersions must include/,
      ],
    },
    {
      name: "preservation and installation",
      mutate({ manifest }) {
        manifest.preservation.protectedLayerIndexes = [];
        manifest.preservation.replaceExisting = true;
        manifest.preservation.targetLayerPolicy = "first-free";
        manifest.preservation.targetLayerName = "Other";
        manifest.preservation.targetAppSenseLink = "replace";
        manifest.preservation.maxLayers = 7;
        manifest.preservation.otherProfiles = "changed";
        manifest.preservation.otherLayers = "changed";
        manifest.preservation.otherAppSenseLinks = "changed";
        manifest.installation.mechanism = "direct-write";
        manifest.installation.applyMode = "automatic";
        manifest.installation.sourceArtifact = "private-storage";
        manifest.installation.outputArtifact = "storage-patch";
        manifest.validation.required = [];
      },
      expected: [
        /index 0 must be protected/,
        /replaceExisting must be false/,
        /targetLayerPolicy/,
        /targetLayerName must be Claude/,
        /AppSense link must be preserved/,
        /maxLayers must be 6/,
        /otherProfiles must be unchanged/,
        /otherLayers must be unchanged/,
        /otherAppSenseLinks must be unchanged/,
        /local profile transform/,
        /applyMode must be guided-ui/,
        /sourceArtifact/,
        /outputArtifact/,
        /existing Claude layer/,
      ],
    },
    {
      name: "artifact evidence",
      mutate({ manifest }) {
        manifest.installation.layerArtifact = "artifacts/Claude-layer.json";
        manifest.installation.layerArtifactSha256 = "INVALID";
        manifest.installation.layerArtifactStatus = "roundtrip-verified";
        manifest.validation.completed = [];
      },
      expected: [
        /exact lowercase SHA-256/,
        /official-layer-export-roundtrip evidence/,
      ],
      warning: /layer artifact is declared/i,
    },
    {
      name: "mapping identity and controls",
      mutate({ manifest, mapping }) {
        mapping.formatVersion = "2.0.0";
        mapping.presetId = `${manifest.id}-other`;
        mapping.layer.rgb.hex = "orange";
        mapping.layer.name = "Other";
        requiredControl(mapping, "command-row-center-left").id = requiredControl(
          mapping,
          "command-row-left",
        ).id;
        mapping.controls = mapping.controls.filter((control) => control.id !== "command-row-right");
        requiredControl(mapping, "command-row-center-right").action = {
          type: "shortcut",
          keys: ["Meta", "X"],
        };
        requiredControl(mapping, "encoder-rotate").action = {};
        requiredControl(mapping, "joystick").action = {};
        mapping.unusedControls = [];
      },
      expected: [
        /mapping\.formatVersion/,
        /mapping\.presetId/,
        /layer RGB/,
        /layer name/,
        /duplicate control id/,
        /missing required control/,
        /command-row-center-right must exactly match/,
        /encoder rotation/,
        /joystick action/,
        /unused controls/,
      ],
    },
    {
      name: "activation and exclusions",
      mutate({ mapping }) {
        mapping.activation = {
          type: "manual",
          application: { bundleId: "wrong.app" },
          detection: "none",
          linkPolicy: "replace",
          duplicatePolicy: "allow",
        };
        mapping.excludedByDefault = [];
      },
      expected: [
        /activation must use AppSense/,
        /AppSense bundle identifier/,
        /existing link/,
        /linkPolicy/,
        /duplicate AppSense links/,
        /excludedByDefault must include send-message/,
        /excludedByDefault must include destructive-command/,
      ],
    },
  ];

  for (const scenario of cases) {
    await t.test(scenario.name, () => {
      const value = {
        manifest: structuredClone(original.manifest),
        mapping: structuredClone(original.mapping),
      };
      scenario.mutate(value);
      const result = validatePreset(value.manifest, value.mapping);
      const messages = result.errors.join("\n");
      assert.equal(result.ok, false);
      for (const expected of scenario.expected) assert.match(messages, expected);
      if (scenario.warning) assert.match(result.warnings.join("\n"), scenario.warning);
    });
  }
});

test("official profile export inventory protects index 0 and finds one existing Claude layer", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-inventory-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const exportPath = path.join(temp, "Mac-profile.json");
  await writeJson(exportPath, officialProfileExport());
  const inventory = await inventoryFromProfileExport(exportPath);
  assert.deepEqual(inventory.protectedLayerIndexes, [0]);
  assert.equal(inventory.firstFreeAfterProtected, 3);
  assert.equal(inventory.layers[1].appSenseLinked, true);
  assert.deepEqual(inventory.layers.map((layer) => layer.name), ["Codex", "Claude", "Browser"]);
});

test("backup is readable, hash-verified and restorable on an isolated copy", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-backup-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const configRoot = path.join(temp, "input-user-data");
  const backupRoot = path.join(temp, "backups");
  const exportPath = path.join(temp, "Mac-profile.json");
  await writeJson(path.join(configRoot, "input_storage.json"), { profiles: [{ name: "Mac" }], marker: "original" });
  await writeJson(path.join(configRoot, "Local Storage", "safe.json"), { value: 1 });
  await writeJson(path.join(configRoot, "Cache", "ignored.json"), { should: "not-copy" });
  await writeJson(exportPath, officialProfileExport());

  const backup = await createRestorableBackup({
    configRoot,
    profileExportPath: exportPath,
    backupRoot,
    inputVersion: "0.17.3",
    firmwareVersion: "v0.4.1",
    now: new Date("2026-07-27T12:00:00.000Z"),
  });
  const verification = await verifyBackup(backup.destination);
  assert.equal(verification.ok, true, verification.errors.join("\n"));
  assert.equal(await fs.stat(path.join(backup.destination, "official-profile-export", "Mac-profile.json")).then(() => true), true);
  await assert.rejects(fs.access(path.join(backup.destination, "input-user-data", "Cache", "ignored.json")));

  await writeJson(path.join(configRoot, "input_storage.json"), { marker: "mutated" });
  const restoreOptions = {
    backupDir: backup.destination,
    configRoot,
    allowedConfigRoots: [configRoot],
  };
  const dryRun = await restoreStorageSnapshot({ ...restoreOptions, dryRun: true });
  assert.equal(dryRun.dryRun, true);
  const stillMutated = JSON.parse(await fs.readFile(path.join(configRoot, "input_storage.json"), "utf8"));
  assert.equal(stillMutated.marker, "mutated");

  const restoredPlan = await restoreStorageSnapshot({
    ...restoreOptions,
    dryRun: false,
    now: new Date("2026-07-27T12:30:00.000Z"),
  });
  const restored = JSON.parse(await fs.readFile(path.join(configRoot, "input_storage.json"), "utf8"));
  assert.equal(restored.marker, "original");
  const safety = JSON.parse(await fs.readFile(path.join(restoredPlan.safetyCopy, "input_storage.json"), "utf8"));
  assert.equal(safety.marker, "mutated");

  const manifestPath = path.join(backup.destination, "backup-manifest.json");
  const backupManifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  backupManifest.restore.storageSnapshot = "../../outside";
  await writeJson(manifestPath, backupManifest);
  const escaped = await verifyBackup(backup.destination);
  assert.equal(escaped.ok, false);
  assert.match(escaped.errors.join(" "), /must stay inside/);
  backupManifest.restore.storageSnapshot = "input-user-data";
  await writeJson(manifestPath, backupManifest);

  await writeJson(path.join(backup.destination, "unexpected.json"), { injected: true });
  const tampered = await verifyBackup(backup.destination);
  assert.equal(tampered.ok, false);
  assert.match(tampered.errors.join(" "), /Unexpected backup file/);
});

test("inventory fails closed when the official profile structure cannot prove layer 0", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-inventory-unsafe-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));

  const missingLayers = officialProfileExport();
  delete missingLayers.profile.layers;
  const missingPath = path.join(temp, "missing-layers-profile.json");
  await writeJson(missingPath, missingLayers);
  await assert.rejects(() => inventoryFromProfileExport(missingPath), /profile\.layers is missing/);

  const noNative = officialProfileExport();
  noNative.profile.layers = [{ index: 2, name: "Browser" }];
  const noNativePath = path.join(temp, "no-native-profile.json");
  await writeJson(noNativePath, noNative);
  await assert.rejects(() => inventoryFromProfileExport(noNativePath), /protected native layer at index 0/);
});

test("sanitizer accepts a clean layer export and rejects local identifiers", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-sanitize-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const clean = path.join(temp, "Claude-layer.json");
  const output = path.join(temp, "public", "Claude-layer.json");
  await writeJson(clean, officialLayerExport());
  const inspection = await inspectOfficialExport(clean);
  assert.equal(inspection.kind, "layer");
  assert.deepEqual(inspection.errors, []);
  await sanitizeOfficialLayerExport(clean, output);
  assert.equal(await fs.stat(output).then(() => true), true);

  const unsafe = path.join(temp, "unsafe-layer.json");
  await writeJson(unsafe, officialLayerExport({ metadata: { serialNumber: "ABC", localPath: "/Users/example/private" } }));
  await assert.rejects(() => sanitizeOfficialLayerExport(unsafe, path.join(temp, "unsafe-public.json")), /Refusing to publish/);

  const locallyLinked = path.join(temp, "locally-linked-layer.json");
  await writeJson(locallyLinked, officialLayerExport({
    layer: { name: "Claude", color: "#D97757", linkedAppId: 0 },
  }));
  const linkedInspection = await inspectOfficialExport(locallyLinked);
  assert.deepEqual(linkedInspection.suspiciousFields, [
    { path: "$.layer.linkedAppId", reason: "local-linked-app-id" },
  ]);
  await assert.rejects(
    () => sanitizeOfficialLayerExport(locallyLinked, path.join(temp, "locally-linked-public.json")),
    /local-linked-app-id/,
  );

  const wrongDevice = path.join(temp, "wrong-device-layer.json");
  await writeJson(wrongDevice, officialLayerExport({ keyboard: "creator_micro" }));
  await assert.rejects(
    () => sanitizeOfficialLayerExport(wrongDevice, path.join(temp, "wrong-device-public.json")),
    /expected codex_micro/,
  );
});

test("rollback accepts only an exact approved Input root", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-restore-root-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const inputRoot = path.join(temp, "input");
  const unrelated = path.join(temp, "unrelated");
  await fs.mkdir(inputRoot);
  await fs.mkdir(unrelated);

  assert.equal(
    await assertSafeRestoreDestination(inputRoot, { allowedConfigRoots: [inputRoot] }),
    await fs.realpath(inputRoot),
  );
  await assert.rejects(
    () => assertSafeRestoreDestination(unrelated, { allowedConfigRoots: [inputRoot] }),
    /must exactly match/,
  );
  await assert.rejects(
    () => assertSafeRestoreDestination(os.homedir(), { allowedConfigRoots: [os.homedir()] }),
    /broad restore destination/,
  );
});

test("install plan requires exactly one existing Claude layer outside protected index 0", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const inventory = {
    format: "codex-micro-input-inventory/v1",
    keyboard: "codex_micro",
    layers: [
      { index: 0, name: "Codex", appSenseLinked: false },
      { index: 1, name: "Claude", appSenseLinked: true },
    ],
  };
  const plan = buildInstallPlan({ manifest, mapping, inventory });
  assert.equal(plan.canGenerateProfile, true);
  assert.deepEqual(plan.blockers, []);
  assert.equal(plan.targetLayerIndex, 1);

  const missing = buildInstallPlan({
    manifest,
    mapping,
    inventory: { ...inventory, layers: [{ index: 0, name: "Codex" }] },
  });
  assert.equal(missing.canGenerateProfile, false);
  assert.match(missing.blockers.join(" "), /No existing layer named Claude/);

  const duplicate = buildInstallPlan({
    manifest,
    mapping,
    inventory: {
      ...inventory,
      layers: [{ index: 0, name: "Codex" }, { index: 1, name: "Claude" }, { index: 2, name: "claude" }],
    },
  });
  assert.match(duplicate.blockers.join(" "), /Multiple layers named Claude/);

  const withoutAppSense = buildInstallPlan({
    manifest,
    mapping,
    inventory: {
      ...inventory,
      layers: [
        { index: 0, name: "Codex", appSenseLinked: false },
        { index: 1, name: "Claude", appSenseLinked: false, appSenseFields: [] },
      ],
    },
  });
  assert.match(withoutAppSense.blockers.join(" "), /no provable AppSense link/);
});

test("artifact verification binds digest and canonical action semantics", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-artifact-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const artifactPath = path.join(temp, "artifacts", "Claude-layer.json");
  const { manifest: sourceManifest, mapping } = await loadPreset(
    path.join(projectRoot, "profiles", "claude-shortcuts"),
  );
  const manifest = structuredClone(sourceManifest);
  await writeJson(artifactPath, canonicalLayerExport());
  manifest.installation.layerArtifact = "artifacts/Claude-layer.json";
  manifest.installation.layerArtifactStatus = "roundtrip-verified";
  manifest.installation.layerArtifactSha256 = await sha256File(artifactPath);
  manifest.validation.completed.push("official-layer-export-roundtrip");

  const verified = await findBundledArtifact(temp, manifest, mapping);
  assert.equal(verified.verifiedForImport, true);

  const changed = canonicalLayerExport();
  changed.actions[1].keyInputs[1].keycode = "KC_ENT";
  await writeJson(artifactPath, changed);
  await assert.rejects(
    () => findBundledArtifact(temp, manifest, mapping),
    /SHA-256 does not match/,
  );

  manifest.installation.layerArtifactSha256 = await sha256File(artifactPath);
  await assert.rejects(
    () => findBundledArtifact(temp, manifest, mapping),
    /does not match the canonical safe mapping/,
  );
});

test("validation is property-order independent and rejects undeclared fields", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const reordered = structuredClone(mapping);
  reordered.controls[0].action = {
    meaning: "new-conversation",
    keys: ["Meta", "N"],
    type: "shortcut",
  };
  assert.equal(validatePreset(manifest, reordered).ok, true);

  const extra = structuredClone(manifest);
  extra.unexpectedProperty = true;
  const result = validatePreset(extra, mapping);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /additional properties/);
});

test("compatibility reports malformed profile inspections without throwing", async () => {
  const { manifest } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const result = evaluateInstallCompatibility({
    manifest,
    installedInputApps: [{ bundleId: "it.focusense.input-app", version: "0.17.3" }],
    profileInspection: {
      kind: "unknown",
      errors: ["Expected profile"],
      payload: null,
      sha256: "0".repeat(64),
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /invalid/);
  assert.match(result.errors.join(" "), /expected codex_micro/);
});

test("compatibility rejects a real profile whose Claude layer lost AppSense", async () => {
  const { manifest } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const payload = officialProfileExport();
  delete payload.profile.layers[1].linkedAppId;
  const result = evaluateInstallCompatibility({
    manifest,
    installedInputApps: [{ bundleId: "it.focusense.input-app", version: "0.17.3" }],
    profileInspection: {
      kind: "profile",
      errors: [],
      payload,
      sha256: "0".repeat(64),
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /no valid AppSense link/);

  payload.profile.layers[1].linkedAppId = [];
  const malformed = evaluateInstallCompatibility({
    manifest,
    installedInputApps: [{ bundleId: "it.focusense.input-app", version: "0.17.3" }],
    profileInspection: {
      kind: "profile",
      errors: [],
      payload,
      sha256: "0".repeat(64),
    },
  });
  assert.equal(malformed.ok, false);
  assert.match(malformed.errors.join(" "), /no valid AppSense link/);
});

test("compatibility binds inventory hash and Claude layer index to the profile export", async () => {
  const { manifest } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const result = evaluateInstallCompatibility({
    manifest,
    installedInputApps: [{ bundleId: "it.focusense.input-app", version: "0.17.3" }],
    inventory: {
      format: "codex-micro-input-inventory/v1",
      keyboard: "codex_micro",
      source: { sha256: "1".repeat(64) },
      layers: [
        { index: 0, name: "Codex", appSenseLinked: false },
        { index: 2, name: "Claude", appSenseLinked: true },
      ],
    },
    profileInspection: {
      kind: "profile",
      errors: [],
      payload: officialProfileExport(),
      sha256: "0".repeat(64),
    },
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /disagree on the Claude layer index/);
  assert.match(result.errors.join(" "), /hashes do not match/);
});
