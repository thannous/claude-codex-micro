import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { sourceProfile } from "./helpers/input-profile-fixture.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runScript(relativePath, args = [], options = {}) {
  return spawnSync(process.execPath, [path.join(repositoryRoot, relativePath), ...args], {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 5000,
    ...options,
  });
}

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-micro-test-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

test("every command exposes a safe help path without requiring hardware", async (t) => {
  const cases = [
    ["scripts/input-layer.mjs", ["help"]],
    ["scripts/lighting.mjs", ["--help"]],
    ["scripts/lighting-probe.mjs", ["--help"]],
    ["scripts/thread-status.mjs", ["--help"]],
    ["scripts/enable-agent-keys.mjs", []],
    ["scripts/configure.mjs", ["--help"]],
  ];

  for (const [script, args] of cases) {
    await t.test(script, () => {
      const result = runScript(script, args);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /Usage:/);
      assert.equal(result.stderr, "");
    });
  }

  const missingArguments = runScript("scripts/build-input-profile.mjs");
  assert.equal(missingArguments.status, 1);
  assert.match(missingArguments.stderr, /Usage:/);
});

test("repository validation commands run successfully from the checkout", async (t) => {
  for (const script of [
    "scripts/validate-profile.mjs",
    "scripts/validate-presets.mjs",
    "scripts/check-doc-links.mjs",
  ]) {
    await t.test(script, () => {
      const result = runScript(script);
      assert.equal(result.status, 0, result.stderr);
      assert.match(result.stdout, /OK:/);
    });
  }
});

test("build-input-profile writes a validated profile once and refuses overwrite", async (t) => {
  const directory = await temporaryDirectory(t);
  const inputPath = path.join(directory, "source-profile.json");
  const outputPath = path.join(directory, "built-profile.json");
  await writeFile(inputPath, JSON.stringify(sourceProfile()));

  const result = runScript("scripts/build-input-profile.mjs", [
    inputPath,
    outputPath,
    "--app-sense-id=12",
    "--base-layer-app-sense-id=13",
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Input profile written/);

  const output = JSON.parse(await readFile(outputPath, "utf8"));
  assert.equal(output.profile.name, "Claude macOS");
  assert.equal(output.profile.layers[0].linkedAppId, 13);
  assert.equal(output.profile.layers[1].linkedAppId, 12);

  const before = await readFile(outputPath, "utf8");
  const overwrite = runScript("scripts/build-input-profile.mjs", [inputPath, outputPath]);
  assert.notEqual(overwrite.status, 0);
  assert.equal(await readFile(outputPath, "utf8"), before);
});

test("input-layer inspects, inventories, and plans from an isolated official export", async (t) => {
  const directory = await temporaryDirectory(t);
  const profilePath = path.join(directory, "source-profile.json");
  const inventoryPath = path.join(directory, "inventory.json");
  await writeFile(profilePath, JSON.stringify(sourceProfile()));

  const inspection = runScript("scripts/input-layer.mjs", [
    "inspect-export",
    "--input",
    profilePath,
    "--json",
  ]);
  assert.equal(inspection.status, 0, inspection.stderr);
  const inspectionResult = JSON.parse(inspection.stdout);
  assert.equal(inspectionResult.kind, "profile");
  assert.equal("payload" in inspectionResult, false, "the CLI summary must not echo the profile");

  const inventory = runScript("scripts/input-layer.mjs", [
    "inventory",
    "--profile-export",
    profilePath,
    "--output",
    inventoryPath,
    "--json",
  ]);
  assert.equal(inventory.status, 0, inventory.stderr);
  const inventoryResult = JSON.parse(inventory.stdout);
  assert.equal(inventoryResult.inventory.layers[1].name, "Claude");
  assert.equal(inventoryResult.inventory.layers[1].appSenseLinked, true);

  const plan = runScript("scripts/input-layer.mjs", [
    "install",
    "--inventory",
    inventoryPath,
    "--json",
  ]);
  assert.equal(plan.status, 0, plan.stderr);
  const planResult = JSON.parse(plan.stdout);
  assert.equal(planResult.dryRun, true);
  assert.equal(planResult.plan.targetLayerIndex, 1);
  assert.equal(planResult.plan.canGenerateProfile, true);
  assert.deepEqual(planResult.plan.blockers, []);
});

test("enable-agent-keys changes only the six Claude cells and can revert them", async (t) => {
  const directory = await temporaryDirectory(t);
  const sourcePath = path.join(directory, "source-profile.json");
  const enabledPath = path.join(directory, "enabled-profile.json");
  const revertedPath = path.join(directory, "reverted-profile.json");
  const source = sourceProfile();
  const nativeLayer = structuredClone(source.profile.layers[0]);
  await writeFile(sourcePath, JSON.stringify(source));

  const enabled = runScript("scripts/enable-agent-keys.mjs", [sourcePath, enabledPath]);
  assert.equal(enabled.status, 0, enabled.stderr);
  const enabledProfile = JSON.parse(await readFile(enabledPath, "utf8"));
  assert.deepEqual(enabledProfile.profile.layers[0], nativeLayer);
  assert.deepEqual(
    enabledProfile.profile.layers[1].layout.base.slice(0, 2).map((row) =>
      row.map((cell) => cell.keycode),
    ),
    [
      ["KV_OAI_AG00", "KV_OAI_AG01"],
      ["KV_OAI_AG02", "KV_OAI_AG03", "KV_OAI_AG04", "KV_OAI_AG05"],
    ],
  );

  const reverted = runScript("scripts/enable-agent-keys.mjs", [
    enabledPath,
    revertedPath,
    "--revert",
  ]);
  assert.equal(reverted.status, 0, reverted.stderr);
  const revertedProfile = JSON.parse(await readFile(revertedPath, "utf8"));
  assert.equal(
    revertedProfile.profile.layers[1].layout.base
      .slice(0, 2)
      .flat()
      .every((cell) => cell.keycode === "KC_NONE"),
    true,
  );
});

test("the thread-status hook records only transition metadata and stays silent", async (t) => {
  const directory = await temporaryDirectory(t);
  const env = {
    ...process.env,
    CLAUDE_THREAD_STATUS_DIR: directory,
    CLAUDE_CODE_SESSION_ID: "session-from-env",
    CLAUDE_PID: "1234",
    CLAUDE_CODE_ENTRYPOINT: "cli",
  };
  const payload = {
    hook_event_name: "Notification",
    notification_type: "permission_prompt",
    cwd: "/tmp/project",
    message: "must never be persisted",
  };

  const emitted = runScript("thread-status/bin/emit.mjs", [], {
    env,
    input: JSON.stringify(payload),
  });
  assert.equal(emitted.status, 0);
  assert.equal(emitted.stdout, "");
  assert.equal(emitted.stderr, "");

  const journalPath = path.join(directory, "events.ndjson");
  const record = JSON.parse((await readFile(journalPath, "utf8")).trim());
  assert.equal(record.event, "Notification");
  assert.equal(record.sessionId, "session-from-env");
  assert.equal(record.notificationType, "permission_prompt");
  assert.equal(record.pid, 1234);
  assert.equal("message" in record, false);

  const before = await readFile(journalPath, "utf8");
  const invalid = runScript("thread-status/bin/emit.mjs", [], {
    env,
    input: "not-json",
  });
  assert.equal(invalid.status, 0);
  assert.equal(await readFile(journalPath, "utf8"), before);
});
