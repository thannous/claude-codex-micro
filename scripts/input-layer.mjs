#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRestorableBackup,
  inspectOfficialExport,
  inventoryFromProfileExport,
  pathExists,
  readJson,
  redactHome,
  restoreStorageSnapshot,
  sanitizeOfficialLayerExport,
  verifyBackup,
} from "./lib/input-export.mjs";
import {
  buildInstallPlan,
  evaluateInstallCompatibility,
  loadPreset,
  validatePreset,
} from "./lib/preset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultProfileDir = path.join(root, "profiles", "claude-shortcuts");
const localRoot = path.join(root, ".local");

function usage() {
  console.log(`Usage: node scripts/input-layer.mjs <command> [options]

Commands:
  doctor                      Inspect versions and candidate Input storage paths (read-only)
  inspect-export              Validate and summarize an official *-layer.json or *-profile.json
  sanitize-export             Fail-closed sanitizer for a real official layer export
  inventory                   Build a local inventory from an official profile export
  backup                      Copy Input user data and an official profile export to .local/
  verify-backup               Re-hash every file in a backup
  install                     Produce a dry-run or local profile-transform session
  rollback                    Prepare rollback; storage restore requires explicit opt-in

Common options:
  --profile-dir <path>        Preset directory (default profiles/claude-shortcuts)
  --json                      Print machine-readable JSON
  --dry-run                   Never modify local state (default for install/rollback)
  --apply                     Create backup/session state; profile generation remains local and explicit
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      index += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function print(value, asJson = false) {
  if (asJson || typeof value !== "string") console.log(JSON.stringify(value, null, 2));
  else console.log(value);
}

function requireOption(args, key) {
  if (!args[key]) throw new Error(`Missing required option --${key}`);
  return path.resolve(args[key]);
}

function candidateConfigRoots() {
  const home = os.homedir();
  return [
    process.env.WORK_LOUDER_INPUT_USER_DATA,
    path.join(home, "Library", "Application Support", "input"),
    path.join(home, "Library", "Application Support", "it.focusense.input-app"),
    path.join(home, "Library", "Containers", "it.focusense.input-app", "Data", "Library", "Application Support", "input"),
  ].filter(Boolean);
}

async function findConfigRoot(explicit) {
  const candidates = candidateConfigRoots().map((candidate) => path.resolve(candidate));
  if (explicit) {
    const resolved = path.resolve(explicit);
    if (!candidates.includes(resolved)) {
      throw new Error(
        "Explicit --config-root must exactly match a detected Input path or WORK_LOUDER_INPUT_USER_DATA.",
      );
    }
    return resolved;
  }
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }
  return null;
}

function inputIsRunning() {
  if (process.platform !== "darwin") return false;
  const result = spawnSync(
    "/usr/bin/pgrep",
    ["-f", "/[Ii]nput\\.app/Contents/MacOS/[Ii]nput($|[[:space:]])"],
    { encoding: "utf8" },
  );
  return result.status === 0 && result.stdout.trim().length > 0;
}

function requireInputStopped() {
  if (inputIsRunning()) {
    throw new Error("Quit Work Louder Input before copying or restoring its local storage.");
  }
}

function plistValue(plistPath, key) {
  const result = spawnSync("/usr/bin/plutil", ["-extract", key, "raw", "-o", "-", plistPath], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

async function inspectApp(appPath) {
  const plist = path.join(appPath, "Contents", "Info.plist");
  if (!(await pathExists(plist))) return null;
  return {
    path: redactHome(appPath),
    bundleId: plistValue(plist, "CFBundleIdentifier"),
    version: plistValue(plist, "CFBundleShortVersionString"),
    build: plistValue(plist, "CFBundleVersion"),
  };
}

async function inspectInstalledApps(candidates) {
  const apps = [];
  const seen = new Set();
  for (const candidate of candidates) {
    const value = await inspectApp(candidate);
    if (!value) continue;

    let identity;
    try {
      const stats = await fs.stat(candidate);
      identity = `${stats.dev}:${stats.ino}`;
    } catch {
      identity = `${value.bundleId}:${path.resolve(candidate).toLowerCase()}`;
    }
    if (seen.has(identity)) continue;

    seen.add(identity);
    apps.push(value);
  }
  return apps;
}

async function doctor(args, suppliedManifest = null) {
  const home = os.homedir();
  const inputApps = ["/Applications/input.app", "/Applications/Input.app", path.join(home, "Applications", "input.app")];
  const claudeApps = ["/Applications/Claude.app", path.join(home, "Applications", "Claude.app")];
  const [input, claude] = await Promise.all([
    inspectInstalledApps(inputApps),
    inspectInstalledApps(claudeApps),
  ]);
  const manifest = suppliedManifest
    ?? (await loadPreset(path.resolve(args["profile-dir"] ?? defaultProfileDir))).manifest;
  const compatibility = evaluateInstallCompatibility({ manifest, installedInputApps: input });
  const roots = [];
  for (const candidate of candidateConfigRoots()) {
    if (await pathExists(candidate)) roots.push(redactHome(candidate));
  }
  return {
    format: "codex-micro-doctor/v1",
    platform: process.platform,
    architecture: process.arch,
    input,
    claude,
    configurationRoots: roots,
    inputRunning: inputIsRunning(),
    expected: {
      inputBundleId: manifest.compatibility.input.bundleId,
      supportedInputVersions: manifest.compatibility.input.supportedVersions,
      claudeBundleId: manifest.target.application.bundleId,
      observedFirmwareVersion: manifest.compatibility.firmware.observedVersion,
    },
    compatibility: {
      ok: compatibility.ok,
      errors: compatibility.errors,
      warnings: compatibility.warnings,
    },
    facts: [
      "No settings were changed.",
      "A discovered storage path is not proof that every device setting is stored there.",
    ],
  };
}

async function commandInspectExport(args) {
  const input = requireOption(args, "input");
  const inspection = await inspectOfficialExport(input);
  const { payload: _payload, ...safe } = inspection;
  return safe;
}

async function commandInventory(args) {
  const profileExport = requireOption(args, "profile-export");
  const inventory = await inventoryFromProfileExport(profileExport);
  const output = path.resolve(args.output ?? path.join(localRoot, "inventories", "current.json"));
  await fs.mkdir(path.dirname(output), { recursive: true, mode: 0o700 });
  await fs.writeFile(output, `${JSON.stringify(inventory, null, 2)}\n`, { mode: 0o600 });
  return { output: redactHome(output), inventory };
}

async function commandBackup(args) {
  requireInputStopped();
  const configRoot = await findConfigRoot(args["config-root"]);
  if (!configRoot) throw new Error("Unable to locate Input configuration. Pass --config-root after running doctor.");
  const profileExportPath = requireOption(args, "profile-export");
  const backupRoot = path.resolve(args["backup-root"] ?? path.join(localRoot, "input-backups"));
  const result = await createRestorableBackup({
    configRoot,
    profileExportPath,
    backupRoot,
    inputVersion: args["input-version"] ?? "0.17.3",
    firmwareVersion: args["firmware-version"] ?? "v0.4.1",
  });
  const verification = await verifyBackup(result.destination);
  if (!verification.ok) throw new Error(`Backup was created but verification failed: ${verification.errors.join(" ")}`);
  return { id: result.id, destination: redactHome(result.destination), verified: true };
}

async function commandInstall(args) {
  const profileDir = path.resolve(args["profile-dir"] ?? defaultProfileDir);
  const { manifest, mapping } = await loadPreset(profileDir);
  const validation = validatePreset(manifest, mapping);
  if (!validation.ok) throw new Error(validation.errors.join(" "));
  const inventory = args.inventory ? await readJson(path.resolve(args.inventory)) : null;
  const plan = buildInstallPlan({ manifest, mapping, inventory });

  const apply = Boolean(args.apply);
  if (apply && !inventory) {
    throw new Error("--apply requires --inventory generated from the official profile export.");
  }
  const profileExportPath = args["profile-export"]
    ? path.resolve(args["profile-export"])
    : apply
      ? requireOption(args, "profile-export")
      : null;
  let profileInspection = null;
  let compatibility = null;
  if (profileExportPath) {
    const localDoctor = await doctor(args, manifest);
    profileInspection = await inspectOfficialExport(profileExportPath);
    compatibility = evaluateInstallCompatibility({
      manifest,
      installedInputApps: localDoctor.input,
      inventory,
      profileInspection,
      allowUnverifiedInputVersion: Boolean(args["allow-unverified-input-version"]),
    });
    plan.compatibility = {
      ok: compatibility.ok,
      errors: compatibility.errors,
      warnings: compatibility.warnings,
      inputVersion: compatibility.installedInput?.version ?? null,
      supportedVersions: compatibility.supportedVersions,
      profileExportSha256: profileInspection.sha256,
    };
    plan.blockers.push(...compatibility.errors);
    plan.canGenerateProfile = plan.blockers.length === 0;
  }

  if (!apply) return { dryRun: true, plan };
  if (plan.blockers.length) throw new Error(`Installation blocked: ${plan.blockers.join(" ")}`);
  requireInputStopped();
  const configRoot = await findConfigRoot(args["config-root"]);
  if (!configRoot) throw new Error("--apply requires a detected or explicit --config-root");
  const sessionRoot = path.join(localRoot, "sessions");
  const statePath = path.join(sessionRoot, `${manifest.id}.json`);
  if (await pathExists(statePath)) {
    const current = await readJson(statePath);
    if (current.status !== "rolled-back") throw new Error(`Duplicate installation refused; existing session status is ${current.status}.`);
  }

  const backup = await createRestorableBackup({
    configRoot,
    profileExportPath,
    backupRoot: path.join(localRoot, "input-backups"),
    inputVersion: manifest.compatibility.input.observedVersion,
    firmwareVersion: manifest.compatibility.firmware.observedVersion,
  });
  const verification = await verifyBackup(backup.destination);
  if (!verification.ok) throw new Error(`Backup verification failed: ${verification.errors.join(" ")}`);

  await fs.mkdir(sessionRoot, { recursive: true, mode: 0o700 });
  const state = {
    format: "codex-micro-install-session/v1",
    presetId: manifest.id,
    createdAt: new Date().toISOString(),
    status: "ready-for-local-profile-transform",
    compatibility: {
      inputVersion: compatibility.installedInput.version,
      supportedVersions: compatibility.supportedVersions,
      overrideUsed: compatibility.overrideUsed,
      warnings: compatibility.warnings,
      profileExportSha256: profileInspection.sha256,
      inventorySha256: inventory.source.sha256,
    },
    backupId: backup.id,
    backupPath: redactHome(backup.destination),
    plan,
  };
  await fs.writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });

  if (args["open-input"] && process.platform === "darwin") {
    spawnSync("/usr/bin/open", ["-b", "it.focusense.input-app"], { stdio: "ignore" });
  }
  return { dryRun: false, session: redactHome(statePath), backupVerified: true, plan };
}

async function commandRollback(args) {
  const backupDir = requireOption(args, "backup");
  const verification = await verifyBackup(backupDir);
  if (!verification.ok) throw new Error(`Backup verification failed: ${verification.errors.join(" ")}`);
  const configRoot = await findConfigRoot(args["config-root"]);
  const restoreStorage = Boolean(args["restore-storage"]);
  const officialImportConfirmed = Boolean(args["confirm-official-profile-import"]);
  const apply = Boolean(args.apply);

  if (apply && !restoreStorage && !officialImportConfirmed) {
    throw new Error("--apply requires either --confirm-official-profile-import or --restore-storage.");
  }
  if (apply && restoreStorage && !args["acknowledge-unverified-storage-restore"]) {
    throw new Error("Storage restore is secondary and unverified for the device. Re-run with --acknowledge-unverified-storage-restore after reviewing the official profile-import rollback.");
  }
  if (apply && restoreStorage) requireInputStopped();
  const storagePlan = configRoot
    ? await restoreStorageSnapshot({
        backupDir,
        configRoot,
        allowedConfigRoots: candidateConfigRoots(),
        forbiddenRoots: [root],
        dryRun: !(apply && restoreStorage),
      })
    : null;

  let sessionUpdated = null;
  if (apply && args.session) {
    const sessionPath = path.resolve(args.session);
    const session = await readJson(sessionPath);
    if (session.format !== "codex-micro-install-session/v1") {
      throw new Error(`Unexpected install session format: ${session.format}`);
    }
    if (session.backupId !== verification.manifest.id) {
      throw new Error("The install session does not reference the supplied backup.");
    }
    session.status = "rolled-back";
    session.rolledBackAt = new Date().toISOString();
    session.rollbackEvidence = officialImportConfirmed
      ? "user-confirmed-official-profile-import"
      : "local-storage-snapshot-restored";
    await fs.writeFile(sessionPath, `${JSON.stringify(session, null, 2)}
`, { mode: 0o600 });
    sessionUpdated = redactHome(sessionPath);
  }

  return {
    dryRun: !apply,
    backupVerified: true,
    preferred: "Open Input and import the *-profile.json in official-profile-export.",
    officialProfileImportConfirmed: officialImportConfirmed,
    storageRestoreRequested: restoreStorage,
    storagePlan: storagePlan
      ? {
          ...storagePlan,
          source: redactHome(storagePlan.source),
          destination: redactHome(storagePlan.destination),
          safetyCopy: storagePlan.safetyCopy ? redactHome(storagePlan.safetyCopy) : null,
        }
      : null,
    sessionUpdated,
    warning: "The rollback is not complete until the device is checked and the original profile is active again.",
  };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (!command || command === "help" || args.help) {
    usage();
    return;
  }

  let result;
  switch (command) {
    case "doctor":
      result = await doctor(args);
      break;
    case "inspect-export":
      result = await commandInspectExport(args);
      break;
    case "sanitize-export": {
      const input = requireOption(args, "input");
      const output = requireOption(args, "output");
      result = await sanitizeOfficialLayerExport(input, output);
      result.outputPath = redactHome(result.outputPath);
      break;
    }
    case "inventory":
      result = await commandInventory(args);
      break;
    case "backup":
      result = await commandBackup(args);
      break;
    case "verify-backup":
      result = await verifyBackup(requireOption(args, "backup"));
      break;
    case "install":
      result = await commandInstall(args);
      break;
    case "rollback":
      result = await commandRollback(args);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
  print(result, Boolean(args.json));
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
