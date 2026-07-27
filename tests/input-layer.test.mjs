import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createRestorableBackup,
  inspectOfficialExport,
  inventoryFromProfileExport,
  restoreStorageSnapshot,
  sanitizeOfficialLayerExport,
  verifyBackup,
} from "../scripts/lib/input-export.mjs";
import { applyFixturePatch, buildInstallPlan, loadPreset, validatePreset } from "../scripts/lib/preset.mjs";

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function officialProfileExport() {
  return {
    keyboard: "codex_micro",
    language: "en-US",
    profile: {
      name: "Mac",
      layers: [
        { index: 0, name: "Codex", color: "#FFFFFF", appSense: [] },
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

test("manifest and mapping enforce safe V1 invariants", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const result = validatePreset(manifest, mapping);
  assert.equal(result.ok, true, result.errors.join("\n"));
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
});

test("official profile export inventory protects index 0 and selects index 1", async (t) => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "codex-inventory-"));
  t.after(() => fs.rm(temp, { recursive: true, force: true }));
  const exportPath = path.join(temp, "Mac-profile.json");
  await writeJson(exportPath, officialProfileExport());
  const inventory = await inventoryFromProfileExport(exportPath);
  assert.deepEqual(inventory.protectedLayerIndexes, [0]);
  assert.equal(inventory.firstFreeAfterProtected, 1);
  assert.deepEqual(inventory.layers.map((layer) => layer.name), ["Codex", "Browser"]);
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
    inputVersion: "0.17.2",
    firmwareVersion: "v0.4.1",
    now: new Date("2026-07-27T12:00:00.000Z"),
  });
  const verification = await verifyBackup(backup.destination);
  assert.equal(verification.ok, true, verification.errors.join("\n"));
  assert.equal(await fs.stat(path.join(backup.destination, "official-profile-export", "Mac-profile.json")).then(() => true), true);
  await assert.rejects(fs.access(path.join(backup.destination, "input-user-data", "Cache", "ignored.json")));

  await writeJson(path.join(configRoot, "input_storage.json"), { marker: "mutated" });
  const dryRun = await restoreStorageSnapshot({ backupDir: backup.destination, configRoot, dryRun: true });
  assert.equal(dryRun.dryRun, true);
  const stillMutated = JSON.parse(await fs.readFile(path.join(configRoot, "input_storage.json"), "utf8"));
  assert.equal(stillMutated.marker, "mutated");

  const restoredPlan = await restoreStorageSnapshot({
    backupDir: backup.destination,
    configRoot,
    dryRun: false,
    now: new Date("2026-07-27T12:30:00.000Z"),
  });
  const restored = JSON.parse(await fs.readFile(path.join(configRoot, "input_storage.json"), "utf8"));
  assert.equal(restored.marker, "original");
  const safety = JSON.parse(await fs.readFile(path.join(restoredPlan.safetyCopy, "input_storage.json"), "utf8"));
  assert.equal(safety.marker, "mutated");

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
});

test("transaction fixture adds the first free layer, preserves layer 0 and refuses a duplicate", () => {
  const original = {
    layers: [
      { index: 0, name: "Codex", controls: [{ id: "native", action: "unchanged" }] },
      { index: 2, name: "Browser", controls: [] },
    ],
  };
  const native = JSON.stringify(original.layers[0]);
  const first = applyFixturePatch(original);
  assert.equal(first.changed, true);
  assert.equal(first.targetIndex, 1);
  assert.equal(JSON.stringify(first.config.layers.find((layer) => layer.index === 0)), native);
  const second = applyFixturePatch(first.config);
  assert.equal(second.changed, false);
  assert.equal(second.reason, "duplicate");
});

test("install plan refuses to pretend an artifact exists", async () => {
  const { manifest, mapping } = await loadPreset(path.join(projectRoot, "profiles", "claude-shortcuts"));
  const inventory = {
    layers: [{ index: 0, name: "Codex" }],
    firstFreeAfterProtected: 1,
  };
  const plan = buildInstallPlan({ manifest, mapping, inventory, artifactPath: null });
  assert.equal(plan.canApplyOfficialImport, false);
  assert.match(plan.blockers.join(" "), /No verified official/);
  assert.equal(plan.targetLayerIndex, 1);
});
