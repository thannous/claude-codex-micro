import { createHash } from "node:crypto";
import { createReadStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

export const REQUIRED_LAYER_EXPORT_KEYS = Object.freeze([
  "keyboard",
  "language",
  "layer",
  "actions",
  "multiactions",
  "smartActions",
  "actionGroups",
  "multiactionGroups",
  "smartActionGroups",
]);

export const REQUIRED_PROFILE_EXPORT_KEYS = Object.freeze([
  "keyboard",
  "language",
  "profile",
  "actions",
  "multiactions",
  "smartActions",
  "actionGroups",
  "multiactionGroups",
  "smartActionGroups",
]);

export const CODEX_MICRO_KEYBOARD = "codex_micro";

const ARRAY_EXPORT_KEYS = new Set([
  "actions",
  "multiactions",
  "smartActions",
  "actionGroups",
  "multiactionGroups",
  "smartActionGroups",
]);

const EXCLUDED_BACKUP_SEGMENTS = new Set([
  "Cache",
  "Code Cache",
  "GPUCache",
  "DawnCache",
  "Crashpad",
  "Logs",
  "logs",
]);

const SUSPICIOUS_KEY = /(?:^|_)(?:serial(?:number)?|bluetooth(?:address)?|macaddress|port(?:id|name)?|hardwareid|deviceid|userid|userpath|homepath|localpath|token|secret|credential)(?:$|_)/i;
const ABSOLUTE_PATH = /^(?:\/Users\/|\/home\/|\/private\/|[A-Za-z]:\\|~\/)/;
const DEVICE_PORT = /^(?:\/dev\/(?:cu|tty)\.|COM\d+$)/i;
const HARDWARE_ADDRESS = /^(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}$/i;

function safeRelativePath(root, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath.trim()) {
    throw new Error(`${label} must be a non-empty relative path.`);
  }
  if (path.isAbsolute(relativePath)) throw new Error(`${label} must be relative.`);
  const absoluteRoot = path.resolve(root);
  const absolute = path.resolve(absoluteRoot, relativePath);
  const relative = path.relative(absoluteRoot, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label} must stay inside ${absoluteRoot}.`);
  }
  return { absolute, relative };
}

export async function assertSafeRestoreDestination(
  configRoot,
  { allowedConfigRoots = [], forbiddenRoots = [] } = {},
) {
  if (typeof configRoot !== "string" || !configRoot.trim()) {
    throw new Error("Restore destination must be a non-empty path.");
  }
  const resolved = path.resolve(configRoot);
  const broadTargets = new Set([
    path.parse(resolved).root,
    path.resolve(os.homedir()),
    ...forbiddenRoots.filter(Boolean).map((value) => path.resolve(value)),
  ]);
  if (broadTargets.has(resolved)) {
    throw new Error(`Refusing broad restore destination: ${resolved}`);
  }

  const allowed = allowedConfigRoots.filter(Boolean).map((value) => path.resolve(value));
  if (!allowed.includes(resolved)) {
    throw new Error("Restore destination must exactly match a detected Work Louder Input configuration root.");
  }

  const stat = await fs.lstat(resolved);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Restore destination must be a real Work Louder Input configuration directory.");
  }
  const realDestination = await fs.realpath(resolved);
  const realAllowed = [];
  for (const candidate of allowed) {
    if (await pathExists(candidate)) realAllowed.push(await fs.realpath(candidate));
  }
  if (!realAllowed.includes(realDestination)) {
    throw new Error("Restore destination resolves outside the approved Work Louder Input roots.");
  }
  return realDestination;
}

function requireCodexMicro(inspection, label) {
  if (inspection.payload.keyboard !== CODEX_MICRO_KEYBOARD) {
    throw new Error(
      `${label} targets keyboard ${JSON.stringify(inspection.payload.keyboard)}; expected ${CODEX_MICRO_KEYBOARD}.`,
    );
  }
}

export function redactHome(value, home = os.homedir()) {
  if (typeof value !== "string" || !home) return value;
  return value === home ? "$HOME" : value.startsWith(`${home}${path.sep}`)
    ? `$HOME${value.slice(home.length)}`
    : value;
}

export async function pathExists(target) {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(filePath) {
  let raw;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read JSON file ${filePath}: ${error.message}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${filePath}: ${error.message}`);
  }
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

function exportKindFromPayload(payload) {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (payload.layer && !payload.profile) return "layer";
    if (payload.profile && !payload.layer) return "profile";
  }
  return "unknown";
}

function findSuspiciousFields(value, currentPath = "$", findings = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => findSuspiciousFields(item, `${currentPath}[${index}]`, findings));
    return findings;
  }
  if (!value || typeof value !== "object") return findings;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (key === "linkedAppId" && child !== null && child !== undefined) {
      findings.push({ path: childPath, reason: "local-linked-app-id" });
    }
    if (SUSPICIOUS_KEY.test(key)) {
      findings.push({ path: childPath, reason: "suspicious-key" });
    }
    if (typeof child === "string") {
      if (ABSOLUTE_PATH.test(child)) findings.push({ path: childPath, reason: "absolute-path" });
      if (DEVICE_PORT.test(child)) findings.push({ path: childPath, reason: "device-port" });
      if (HARDWARE_ADDRESS.test(child)) findings.push({ path: childPath, reason: "hardware-address" });
    }
    findSuspiciousFields(child, childPath, findings);
  }
  return findings;
}

function summarizeShape(value, depth = 0) {
  if (depth > 5) return { type: Array.isArray(value) ? "array" : typeof value };
  if (Array.isArray(value)) {
    const variants = new Set(value.slice(0, 20).map((item) => {
      if (Array.isArray(item)) return "array";
      if (item === null) return "null";
      return typeof item;
    }));
    return {
      type: "array",
      length: value.length,
      elementTypes: [...variants].sort(),
      sample: value.length ? summarizeShape(value[0], depth + 1) : null,
    };
  }
  if (value && typeof value === "object") {
    return {
      type: "object",
      keys: Object.fromEntries(
        Object.entries(value)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, child]) => [key, summarizeShape(child, depth + 1)]),
      ),
    };
  }
  return { type: value === null ? "null" : typeof value };
}

export async function inspectOfficialExport(filePath) {
  const payload = await readJson(filePath);
  const kind = exportKindFromPayload(payload);
  const required = kind === "layer"
    ? REQUIRED_LAYER_EXPORT_KEYS
    : kind === "profile"
      ? REQUIRED_PROFILE_EXPORT_KEYS
      : [];
  const errors = [];

  if (kind === "unknown") {
    errors.push("Expected exactly one top-level object named layer or profile.");
  }

  for (const key of required) {
    if (!(key in payload)) errors.push(`Missing required top-level key: ${key}`);
    if (ARRAY_EXPORT_KEYS.has(key) && key in payload && !Array.isArray(payload[key])) {
      errors.push(`Expected ${key} to be an array.`);
    }
  }

  if (typeof payload.keyboard !== "string" && typeof payload.keyboard !== "number") {
    errors.push("keyboard must be a string or numeric device type.");
  }
  if (typeof payload.language !== "string") errors.push("language must be a string.");

  const stat = await fs.stat(filePath);
  return {
    format: "work-louder-input-export-observation/v1",
    kind,
    fileName: path.basename(filePath),
    size: stat.size,
    sha256: await sha256File(filePath),
    topLevelKeys: Object.keys(payload).sort(),
    shape: summarizeShape(payload),
    suspiciousFields: findSuspiciousFields(payload),
    errors,
    payload,
  };
}

export async function sanitizeOfficialLayerExport(inputPath, outputPath) {
  const inspection = await inspectOfficialExport(inputPath);
  if (inspection.kind !== "layer") {
    throw new Error(`Expected a Work Louder layer export, found ${inspection.kind}.`);
  }
  if (inspection.errors.length) {
    throw new Error(`Layer export validation failed: ${inspection.errors.join(" ")}`);
  }
  requireCodexMicro(inspection, "Layer export");
  if (inspection.suspiciousFields.length) {
    const details = inspection.suspiciousFields
      .map((item) => `${item.path} (${item.reason})`)
      .join(", ");
    throw new Error(`Refusing to publish an export with possible local identifiers: ${details}`);
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, `${JSON.stringify(inspection.payload, null, 2)}\n`, { mode: 0o600 });
  const digest = await sha256File(outputPath);
  await fs.writeFile(`${outputPath}.sha256`, `${digest}  ${path.basename(outputPath)}\n`, { mode: 0o600 });
  return { outputPath, sha256: digest };
}

async function walkFiles(root, relative = "", output = []) {
  const directory = path.join(root, relative);
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDED_BACKUP_SEGMENTS.has(entry.name)) continue;
    const childRelative = path.join(relative, entry.name);
    const child = path.join(root, childRelative);
    if (entry.isSymbolicLink()) {
      throw new Error(`Refusing to include symbolic link in backup: ${childRelative}`);
    }
    if (entry.isDirectory()) await walkFiles(root, childRelative, output);
    else if (entry.isFile()) output.push(childRelative);
  }
  return output;
}

function backupId(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function copyConfigRoot(source, destination) {
  await fs.cp(source, destination, {
    recursive: true,
    preserveTimestamps: true,
    filter: (sourcePath) => !sourcePath
      .split(path.sep)
      .some((segment) => EXCLUDED_BACKUP_SEGMENTS.has(segment)),
  });
}

export async function createRestorableBackup({
  configRoot,
  profileExportPath,
  backupRoot,
  inputVersion = "unknown",
  firmwareVersion = "unknown",
  now = new Date(),
}) {
  if (!configRoot || !(await pathExists(configRoot))) {
    throw new Error(`Input configuration root not found: ${configRoot || "<missing>"}`);
  }
  const profileInspection = await inspectOfficialExport(profileExportPath);
  if (profileInspection.kind !== "profile" || profileInspection.errors.length) {
    throw new Error(`A readable official *-profile.json export is required before installation.`);
  }
  requireCodexMicro(profileInspection, "Profile export");

  const id = backupId(now);
  const destination = path.join(backupRoot, id);
  await fs.mkdir(backupRoot, { recursive: true, mode: 0o700 });
  await fs.mkdir(destination, { recursive: false, mode: 0o700 });

  const snapshotDir = path.join(destination, "input-user-data");
  await copyConfigRoot(configRoot, snapshotDir);

  const officialDir = path.join(destination, "official-profile-export");
  await fs.mkdir(officialDir, { recursive: true, mode: 0o700 });
  const copiedProfile = path.join(officialDir, path.basename(profileExportPath));
  await fs.copyFile(profileExportPath, copiedProfile);
  await fs.chmod(copiedProfile, 0o600);

  const files = [];
  for (const relativePath of await walkFiles(destination)) {
    const absolute = path.join(destination, relativePath);
    const stat = await fs.stat(absolute);
    files.push({
      path: relativePath.split(path.sep).join("/"),
      size: stat.size,
      sha256: await sha256File(absolute),
    });
  }
  files.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    format: "codex-micro-input-backup/v1",
    id,
    createdAt: now.toISOString(),
    inputVersion,
    firmwareVersion,
    source: {
      configRoot: redactHome(path.resolve(configRoot)),
      profileExportFile: path.basename(profileExportPath),
      profileExportSha256: profileInspection.sha256,
      profileKeyboard: profileInspection.payload.keyboard,
      profileLanguage: profileInspection.payload.language,
    },
    restore: {
      preferred: "official-profile-import",
      storageSnapshot: "input-user-data",
      warning: "Restoring app storage alone does not prove that the device keymap was restored; re-import the official profile export in Input.",
    },
    files,
  };

  await fs.writeFile(
    path.join(destination, "backup-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { mode: 0o600 },
  );

  return { id, destination, manifest };
}

export async function verifyBackup(backupDir) {
  const manifestPath = path.join(backupDir, "backup-manifest.json");
  const manifest = await readJson(manifestPath);
  const errors = [];
  if (manifest.format !== "codex-micro-input-backup/v1") {
    errors.push(`Unexpected backup format: ${manifest.format}`);
  }

  const expectedPaths = new Set();
  if (!Array.isArray(manifest.files)) errors.push("Backup manifest files must be an array.");
  for (const file of Array.isArray(manifest.files) ? manifest.files : []) {
    if (!file || typeof file.path !== "string") {
      errors.push("Backup manifest contains a file entry without a path.");
      continue;
    }
    const normalized = path.normalize(file.path);
    if (path.isAbsolute(file.path) || normalized === ".." || normalized.startsWith(`..${path.sep}`)) {
      errors.push(`Unsafe backup manifest path: ${file.path}`);
      continue;
    }
    expectedPaths.add(normalized.split(path.sep).join("/"));
    const absolute = path.join(backupDir, normalized);
    if (!(await pathExists(absolute))) {
      errors.push(`Missing backup file: ${file.path}`);
      continue;
    }
    const stat = await fs.stat(absolute);
    if (stat.size !== file.size) errors.push(`Size mismatch: ${file.path}`);
    const digest = await sha256File(absolute);
    if (digest !== file.sha256) errors.push(`SHA-256 mismatch: ${file.path}`);
  }

  let storageSnapshotPath = null;
  try {
    const resolved = safeRelativePath(
      backupDir,
      manifest.restore?.storageSnapshot,
      "restore.storageSnapshot",
    );
    storageSnapshotPath = resolved.absolute;
    const snapshotPrefix = `${resolved.relative.split(path.sep).join("/")}/`;
    if (![...expectedPaths].some((filePath) => filePath.startsWith(snapshotPrefix))) {
      errors.push("restore.storageSnapshot does not contain any inventoried backup file.");
    }
    const stat = await fs.lstat(storageSnapshotPath);
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      errors.push("restore.storageSnapshot must reference a real directory inside the backup.");
    }
  } catch (error) {
    errors.push(error.message);
  }

  const actualPaths = (await walkFiles(backupDir))
    .map((value) => value.split(path.sep).join("/"))
    .filter((value) => value !== "backup-manifest.json");
  for (const actual of actualPaths) {
    if (!expectedPaths.has(actual)) errors.push(`Unexpected backup file: ${actual}`);
  }

  return { ok: errors.length === 0, errors, manifest, storageSnapshotPath };
}

export async function restoreStorageSnapshot({
  backupDir,
  configRoot,
  allowedConfigRoots = [],
  forbiddenRoots = [],
  dryRun = true,
  now = new Date(),
}) {
  const verification = await verifyBackup(backupDir);
  if (!verification.ok) throw new Error(`Backup verification failed: ${verification.errors.join(" ")}`);
  const snapshot = verification.storageSnapshotPath;
  if (!(await pathExists(snapshot))) throw new Error(`Storage snapshot not found: ${snapshot}`);
  const safeConfigRoot = await assertSafeRestoreDestination(configRoot, {
    allowedConfigRoots,
    forbiddenRoots,
  });

  const safetyCopy = `${safeConfigRoot}.before-codex-restore-${backupId(now)}`;
  const plan = {
    dryRun,
    source: snapshot,
    destination: safeConfigRoot,
    safetyCopy,
    preferredRestore: verification.manifest.restore.preferred,
    warning: verification.manifest.restore.warning,
  };
  if (dryRun) return plan;
  if (await pathExists(safetyCopy)) throw new Error(`Safety copy already exists: ${safetyCopy}`);

  await fs.rename(safeConfigRoot, safetyCopy);
  try {
    await fs.cp(snapshot, safeConfigRoot, { recursive: true, preserveTimestamps: true });
  } catch (error) {
    await fs.rm(safeConfigRoot, { recursive: true, force: true });
    await fs.rename(safetyCopy, safeConfigRoot);
    throw new Error(`Storage restore failed and the original directory was put back: ${error.message}`);
  }
  return plan;
}

function safeLayerName(layer, index) {
  if (layer && typeof layer.name === "string" && layer.name.trim()) return layer.name.trim();
  return `Layer ${index}`;
}

function collectAppSenseCandidates(value, currentPath = "$", output = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => collectAppSenseCandidates(child, `${currentPath}[${index}]`, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  for (const [key, child] of Object.entries(value)) {
    const childPath = `${currentPath}.${key}`;
    if (/appsense|application|software|bundle|foreground|process|linkedapp/i.test(key)) {
      output.push({ path: childPath, type: Array.isArray(child) ? "array" : typeof child });
    }
    collectAppSenseCandidates(child, childPath, output);
  }
  return output;
}

export async function inventoryFromProfileExport(profileExportPath, { maxLayers = 6 } = {}) {
  const inspection = await inspectOfficialExport(profileExportPath);
  if (inspection.kind !== "profile" || inspection.errors.length) {
    throw new Error("A valid official Work Louder profile export is required for inventory.");
  }
  requireCodexMicro(inspection, "Profile export");

  const profile = inspection.payload.profile;
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    throw new Error("Unsupported profile export structure: profile must be an object.");
  }
  if (!Array.isArray(profile.layers)) {
    throw new Error("Unsupported profile export structure: profile.layers is missing. Slot availability will not be inferred.");
  }

  const seenIndexes = new Set();
  const layers = profile.layers.map((layer, arrayIndex) => {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) {
      throw new Error(`Unsupported profile export structure at profile.layers[${arrayIndex}].`);
    }
    const index = Number.isInteger(layer.index) ? layer.index : arrayIndex;
    if (index < 0 || index >= maxLayers) {
      throw new Error(`Layer index ${index} is outside the supported range 0-${maxLayers - 1}.`);
    }
    if (seenIndexes.has(index)) throw new Error(`Duplicate layer index ${index} in profile export.`);
    seenIndexes.add(index);
    return {
      index,
      indexSource: Number.isInteger(layer.index) ? "explicit" : "array-order",
      name: safeLayerName(layer, index),
      color: typeof layer.color === "string" ? layer.color : null,
      protected: index === 0,
      occupied: true,
      appSenseLinked: Number.isInteger(layer.linkedAppId) && layer.linkedAppId >= 0,
      appSenseFields: collectAppSenseCandidates(layer),
    };
  });
  const occupied = new Set(layers.map((layer) => layer.index));
  if (!occupied.has(0)) {
    throw new Error("Cannot verify the protected native layer at index 0; installation is blocked.");
  }
  const freeLayerIndexes = [];
  for (let index = 0; index < maxLayers; index += 1) {
    if (!occupied.has(index)) freeLayerIndexes.push(index);
  }

  return {
    format: "codex-micro-input-inventory/v1",
    generatedAt: new Date().toISOString(),
    source: {
      type: "official-profile-export",
      file: path.basename(profileExportPath),
      sha256: inspection.sha256,
    },
    keyboard: inspection.payload.keyboard,
    language: inspection.payload.language,
    maxLayers,
    protectedLayerIndexes: [0],
    layers: layers.sort((a, b) => a.index - b.index),
    freeLayerIndexes,
    firstFreeAfterProtected: freeLayerIndexes.find((index) => index > 0) ?? null,
    appSenseFields: collectAppSenseCandidates(profile),
    limitations: [
      "AppSense values are not published by this inventory; only candidate field paths are listed.",
      "Physical control identifiers and action semantics still require Input UI or hardware validation.",
    ],
  };
}
