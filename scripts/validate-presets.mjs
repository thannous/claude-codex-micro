#!/usr/bin/env node

import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findBundledArtifact, loadPreset, validatePreset } from "./lib/preset.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profileDir = path.join(root, "profiles", "claude-shortcuts");
const { manifest, mapping } = await loadPreset(profileDir);
const result = validatePreset(manifest, mapping);
const errors = [...result.errors];

try {
  await findBundledArtifact(profileDir, manifest, mapping);
} catch (error) {
  errors.push(error.message);
}

for (const relative of [manifest.files?.mapping, manifest.files?.visual, manifest.files?.artifactDirectory]) {
  if (!relative) {
    errors.push("manifest files section is incomplete");
    continue;
  }
  try {
    await access(path.join(profileDir, relative));
  } catch {
    errors.push(`declared preset file does not exist: ${relative}`);
  }
}

for (const schemaPath of [
  path.join(root, "profiles", "schema", "v1", "preset-manifest.schema.json"),
  path.join(root, "profiles", "schema", "v1", "layer-mapping.schema.json"),
  path.join(profileDir, "schema.json"),
]) {
  try {
    JSON.parse(await readFile(schemaPath, "utf8"));
  } catch (error) {
    errors.push(`invalid JSON schema ${path.relative(root, schemaPath)}: ${error.message}`);
  }
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  console.log("OK: reusable preset manifest, physical mapping and preservation rules validated");
}
