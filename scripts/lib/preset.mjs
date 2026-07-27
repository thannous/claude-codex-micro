import { promises as fs } from "node:fs";
import path from "node:path";
import { pathExists, readJson, sha256File } from "./input-export.mjs";

const ALLOWED_STATUS = new Set([
  "proposal-not-applied",
  "hardware-observed",
  "manually-validated",
  "export-format-verified",
]);

const SENSITIVE_ACTION_PATTERN = /(?:\benter\b|\breturn\b|send[-_ ]?message|permission|approve|deny|reject|delete|backspace|git[-_ ]?push|deploy|destructive|shell|terminal|command[-_ ]?execution|\brm\b|sudo)/i;

function flattenStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((child) => flattenStrings(child, output));
  else if (value && typeof value === "object") Object.values(value).forEach((child) => flattenStrings(child, output));
  return output;
}

export function validatePreset(manifest, mapping) {
  const errors = [];
  const warnings = [];

  if (manifest.formatVersion !== "1.0.0") errors.push("manifest.formatVersion must be 1.0.0");
  if (!ALLOWED_STATUS.has(manifest.status)) errors.push(`Unsupported preset status: ${manifest.status}`);
  if (manifest.target?.platform !== "macOS") errors.push("target.platform must be macOS");
  if (manifest.target?.application?.bundleId !== "com.anthropic.claudefordesktop") {
    errors.push("Claude Desktop bundle identifier must be com.anthropic.claudefordesktop");
  }

  const preservation = manifest.preservation ?? {};
  if (!Array.isArray(preservation.protectedLayerIndexes) || !preservation.protectedLayerIndexes.includes(0)) {
    errors.push("layer index 0 must be protected");
  }
  if (preservation.replaceExisting !== false) errors.push("replaceExisting must be false");
  if (preservation.slotPolicy !== "first-free-after-protected") {
    errors.push("slotPolicy must be first-free-after-protected");
  }
  if (preservation.maxLayers !== 6) errors.push("Codex Micro maxLayers must be 6");
  for (const field of ["otherProfiles", "otherLayers", "otherAppSenseLinks"]) {
    if (preservation[field] !== "unchanged") errors.push(`${field} must be unchanged`);
  }

  if (manifest.installation?.mechanism !== "work-louder-input-layer-json") {
    errors.push("installation mechanism must use the official Work Louder layer JSON flow");
  }
  if (manifest.installation?.applyMode !== "guided-ui") {
    errors.push("unverified direct writes are forbidden; applyMode must be guided-ui");
  }
  if (manifest.installation?.artifactStatus !== "pending-real-export") {
    warnings.push("An official layer artifact is present or uses a non-default status; verify the import evidence.");
  }

  if (mapping.formatVersion !== "1.0.0") errors.push("mapping.formatVersion must be 1.0.0");
  if (mapping.presetId !== manifest.id) errors.push("mapping.presetId must match manifest.id");
  if (!/^#[0-9A-F]{6}$/i.test(mapping.layer?.rgb?.hex ?? "")) errors.push("layer RGB must be #RRGGBB");
  if (mapping.layer?.name !== "Claude") errors.push("layer name must be Claude");

  const controls = mapping.controls ?? [];
  const ids = new Set();
  for (const control of controls) {
    if (!control.id || ids.has(control.id)) errors.push(`missing or duplicate control id: ${control.id ?? "<missing>"}`);
    ids.add(control.id);
    const actionStrings = flattenStrings(control.action).join(" ");
    if (SENSITIVE_ACTION_PATTERN.test(actionStrings)) errors.push(`sensitive action mapped on ${control.id}`);
  }

  const expected = new Map([
    ["command-row-left", "Meta N"],
    ["command-row-center-left", "Meta F"],
    ["command-row-center-right", "Meta Comma"],
    ["command-row-right", "Escape"],
  ]);
  for (const [id, signature] of expected) {
    const control = controls.find((candidate) => candidate.id === id);
    if (!control) {
      errors.push(`missing required control ${id}`);
      continue;
    }
    const actual = flattenStrings(control.action).join(" ");
    for (const token of signature.split(" ")) {
      if (!actual.includes(token)) errors.push(`${id} must include ${token}`);
    }
  }

  const encoder = controls.find((control) => control.id === "encoder-rotate");
  if (!encoder || encoder.action?.clockwise !== "scroll-down" || encoder.action?.counterclockwise !== "scroll-up") {
    errors.push("encoder rotation must provide vertical scrolling");
  }
  const joystick = controls.find((control) => control.id === "joystick");
  for (const [direction, key] of Object.entries({ up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" })) {
    if (joystick?.action?.[direction] !== key) errors.push(`joystick ${direction} must be ${key}`);
  }

  const unused = mapping.unusedControls ?? [];
  if (!unused.length || unused.some((control) => control.behavior !== "no-action" && control.behavior !== "reserved")) {
    errors.push("unused controls must be explicitly no-action or reserved");
  }

  const activation = mapping.activation ?? {};
  if (activation.type !== "appsense-foreground-application") errors.push("activation must use AppSense foreground application");
  if (activation.application?.bundleId !== "com.anthropic.claudefordesktop") errors.push("AppSense bundle identifier is wrong");
  if (activation.focusSeconds !== 5) errors.push("AppSense focusSeconds must be 5");
  if (activation.duplicatePolicy !== "refuse") errors.push("duplicate AppSense links must be refused");

  const excluded = new Set((mapping.excludedByDefault ?? []).map((item) => item.action));
  for (const action of ["send-message", "permission-approve-or-deny", "delete", "git-push", "deploy", "destructive-command"]) {
    if (!excluded.has(action)) errors.push(`excludedByDefault must include ${action}`);
  }

  return { ok: errors.length === 0, errors, warnings };
}

export async function loadPreset(profileDir) {
  const manifestPath = path.join(profileDir, "manifest.json");
  const mappingPath = path.join(profileDir, "mapping.json");
  const [manifest, mapping] = await Promise.all([readJson(manifestPath), readJson(mappingPath)]);
  return { manifest, mapping, manifestPath, mappingPath };
}

export function buildInstallPlan({ manifest, mapping, inventory, artifactPath = null }) {
  const validation = validatePreset(manifest, mapping);
  if (!validation.ok) throw new Error(`Preset validation failed: ${validation.errors.join(" ")}`);

  const targetIndex = inventory?.firstFreeAfterProtected ?? null;
  const blockers = [];
  if (!inventory) blockers.push("A local inventory generated from an official profile export is required.");
  if (inventory && targetIndex === null) blockers.push("No free layer slot is available after protected layer index 0.");
  if (inventory?.layers?.some((layer) => String(layer.name ?? "").toLowerCase() === mapping.layer.name.toLowerCase())) {
    blockers.push(`A layer named ${mapping.layer.name} already exists; duplicate installation is refused.`);
  }
  if (artifactPath === null) blockers.push("No verified official *-layer.json artifact is bundled; manual mapping is required.");

  return {
    format: "codex-micro-install-plan/v1",
    presetId: manifest.id,
    mode: "guided-ui",
    targetLayerIndex: targetIndex,
    protectedLayerIndexes: manifest.preservation.protectedLayerIndexes,
    artifactPath,
    blockers,
    canApplyOfficialImport: blockers.length === 0,
    steps: [
      "Verify and preserve the official profile export backup.",
      `Use only layer index ${targetIndex ?? "<first-free-after-0>"}; never replace index 0.`,
      artifactPath ? "In Input, choose Import layer and select the staged *-layer.json file." : "Create an empty layer and reproduce mapping.json exactly.",
      "Set the layer name and RGB color from mapping.json.",
      "Link only Claude Desktop to this layer with AppSense > Auto detect.",
      "Test each control, focus loss, persistence, and export the installed layer for verification.",
    ],
  };
}

export function applyFixturePatch(config, { layerName = "Claude", maxLayers = 6 } = {}) {
  const clone = structuredClone(config);
  if (!Array.isArray(clone.layers)) throw new Error("fixture config must contain a layers array");
  if (clone.layers.some((layer) => String(layer.name).toLowerCase() === layerName.toLowerCase())) {
    return { changed: false, reason: "duplicate", config: clone };
  }
  const occupied = new Set(clone.layers.map((layer) => layer.index));
  let target = null;
  for (let index = 1; index < maxLayers; index += 1) {
    if (!occupied.has(index)) {
      target = index;
      break;
    }
  }
  if (target === null) throw new Error("no free layer slot");
  const nativeBefore = JSON.stringify(clone.layers.find((layer) => layer.index === 0));
  clone.layers.push({ index: target, name: layerName, controls: [], appsense: ["com.anthropic.claudefordesktop"] });
  clone.layers.sort((a, b) => a.index - b.index);
  const nativeAfter = JSON.stringify(clone.layers.find((layer) => layer.index === 0));
  if (nativeBefore !== nativeAfter) throw new Error("protected layer 0 changed");
  return { changed: true, targetIndex: target, config: clone };
}

export async function findBundledArtifact(profileDir, manifest) {
  const relative = manifest.installation?.artifact;
  if (!relative) return null;
  const absolute = path.resolve(profileDir, relative);
  if (!(await pathExists(absolute))) throw new Error(`Declared artifact does not exist: ${relative}`);
  return { path: absolute, sha256: await sha256File(absolute) };
}
