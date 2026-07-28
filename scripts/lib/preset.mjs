import { promises as fs } from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import {
  CODEX_MICRO_KEYBOARD,
  inspectOfficialExport,
  pathExists,
  readJson,
  sha256File,
} from "./input-export.mjs";
import { validatePresetSchemas } from "./schema-validation.mjs";

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

function sameAction(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

export function validatePreset(manifest, mapping) {
  const errors = validatePresetSchemas(manifest, mapping);
  const warnings = [];

  if (manifest.formatVersion !== "1.0.0") errors.push("manifest.formatVersion must be 1.0.0");
  if (!ALLOWED_STATUS.has(manifest.status)) errors.push(`Unsupported preset status: ${manifest.status}`);
  if (manifest.target?.platform !== "macOS") errors.push("target.platform must be macOS");
  if (manifest.target?.application?.bundleId !== "com.anthropic.claudefordesktop") {
    errors.push("Claude Desktop bundle identifier must be com.anthropic.claudefordesktop");
  }
  if (manifest.compatibility?.input?.bundleId !== "it.focusense.input-app") {
    errors.push("Input bundle identifier must be it.focusense.input-app");
  }
  const supportedInputVersions = manifest.compatibility?.input?.supportedVersions ?? [];
  if (!supportedInputVersions.includes(manifest.compatibility?.input?.observedVersion)) {
    errors.push("supportedVersions must include the observed Input version");
  }

  const preservation = manifest.preservation ?? {};
  if (!Array.isArray(preservation.protectedLayerIndexes) || !preservation.protectedLayerIndexes.includes(0)) {
    errors.push("layer index 0 must be protected");
  }
  if (preservation.replaceExisting !== false) errors.push("replaceExisting must be false");
  if (preservation.targetLayerPolicy !== "exactly-one-existing-named-layer") {
    errors.push("targetLayerPolicy must require exactly one existing named layer");
  }
  if (preservation.targetLayerName !== "Claude") errors.push("targetLayerName must be Claude");
  if (preservation.targetAppSenseLink !== "preserve-existing") {
    errors.push("the existing Claude AppSense link must be preserved");
  }
  if (preservation.maxLayers !== 6) errors.push("Codex Micro maxLayers must be 6");
  for (const field of ["otherProfiles", "otherLayers", "otherAppSenseLinks"]) {
    if (preservation[field] !== "unchanged") errors.push(`${field} must be unchanged`);
  }

  if (manifest.installation?.mechanism !== "local-profile-transform") {
    errors.push("installation mechanism must use the local profile transform");
  }
  if (manifest.installation?.applyMode !== "guided-ui") {
    errors.push("unverified direct writes are forbidden; applyMode must be guided-ui");
  }
  if (manifest.installation?.sourceArtifact !== "official-profile-json") {
    errors.push("installation sourceArtifact must be official-profile-json");
  }
  if (manifest.installation?.outputArtifact !== "generated-profile-json") {
    errors.push("installation outputArtifact must be generated-profile-json");
  }
  const requiredValidation = manifest.validation?.required ?? [];
  if (!requiredValidation.includes("existing-claude-layer-confirmed")) {
    errors.push("validation must require confirmation of the existing Claude layer");
  }
  if (requiredValidation.includes("first-free-layer-confirmed")) {
    errors.push("first-free layer selection is forbidden by the existing-layer flow");
  }
  const layerArtifact = manifest.installation?.layerArtifact;
  const layerArtifactSha256 = manifest.installation?.layerArtifactSha256;
  const layerArtifactStatus = manifest.installation?.layerArtifactStatus;
  if (!layerArtifact) {
    if (layerArtifactSha256 !== null) errors.push("a missing layer artifact must have a null SHA-256");
    if (layerArtifactStatus !== "pending-real-export") {
      errors.push("a missing layer artifact must remain pending-real-export");
    }
  } else {
    if (!/^[a-f0-9]{64}$/.test(layerArtifactSha256 ?? "")) {
      errors.push("a declared layer artifact requires its exact lowercase SHA-256");
    }
    if (layerArtifactStatus === "pending-real-export") {
      errors.push("a declared layer artifact cannot remain pending-real-export");
    }
  }
  if (
    layerArtifactStatus === "roundtrip-verified"
    && !manifest.validation?.completed?.includes("official-layer-export-roundtrip")
  ) {
    errors.push("roundtrip-verified requires completed official-layer-export-roundtrip evidence");
  }
  if (layerArtifactStatus !== "pending-real-export") {
    warnings.push("A layer artifact is declared; verify that its digest and round-trip evidence remain current.");
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
    ["command-row-left", { type: "shortcut", keys: ["Meta", "N"], meaning: "new-conversation" }],
    ["command-row-center-left", { type: "shortcut", keys: ["Meta", "D"], meaning: "voice-dictation" }],
    ["command-row-center-right", { type: "shortcut", keys: ["Meta", "Shift", "D"], meaning: "toggle-diff" }],
    ["command-row-right", { type: "key", keys: ["Escape"], meaning: "cancel-or-close-contextually" }],
  ]);
  for (const [id, expectedAction] of expected) {
    const control = controls.find((candidate) => candidate.id === id);
    if (!control) {
      errors.push(`missing required control ${id}`);
      continue;
    }
    if (!sameAction(control.action, expectedAction)) {
      errors.push(`${id} must exactly match ${JSON.stringify(expectedAction)}`);
    }
  }

  const encoder = controls.find((control) => control.id === "encoder-rotate");
  if (
    !sameAction(encoder?.action, {
      type: "page-navigation",
      clockwise: "PageDown",
      counterclockwise: "PageUp",
    })
  ) {
    errors.push("encoder rotation must exactly provide PageDown/PageUp navigation");
  }
  const joystick = controls.find((control) => control.id === "joystick");
  const joystickAction = {
    type: "directional-keys",
    up: "ArrowUp",
    right: "ArrowRight",
    down: "ArrowDown",
    left: "ArrowLeft",
  };
  if (!sameAction(joystick?.action, joystickAction)) {
    errors.push(`joystick action must exactly match ${JSON.stringify(joystickAction)}`);
  }

  const unused = mapping.unusedControls ?? [];
  if (!unused.length || unused.some((control) => control.behavior !== "no-action" && control.behavior !== "reserved")) {
    errors.push("unused controls must be explicitly no-action or reserved");
  }

  const activation = mapping.activation ?? {};
  if (activation.type !== "appsense-foreground-application") errors.push("activation must use AppSense foreground application");
  if (activation.application?.bundleId !== "com.anthropic.claudefordesktop") errors.push("AppSense bundle identifier is wrong");
  if (activation.detection !== "existing-link-required") {
    errors.push("AppSense activation must require an existing link");
  }
  if (activation.linkPolicy !== "preserve-existing") {
    errors.push("AppSense linkPolicy must preserve the existing link");
  }
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

function inventoryLayerHasAppSenseLink(layer) {
  if (layer?.appSenseLinked === true) return true;
  return (layer?.appSenseFields ?? []).some(
    (field) =>
      field?.path === "$.linkedAppId"
      && field.type === "number",
  );
}

export function buildInstallPlan({ manifest, mapping, inventory }) {
  const validation = validatePreset(manifest, mapping);
  if (!validation.ok) throw new Error(`Preset validation failed: ${validation.errors.join(" ")}`);

  const blockers = [];
  let targetIndex = null;
  if (!inventory) blockers.push("A local inventory generated from an official profile export is required.");
  if (inventory && inventory.keyboard !== CODEX_MICRO_KEYBOARD) {
    blockers.push(`Inventory targets ${inventory.keyboard ?? "<unknown>"}; expected ${CODEX_MICRO_KEYBOARD}.`);
  }
  if (inventory) {
    const matchingLayers = (inventory.layers ?? []).filter(
      (layer) => String(layer.name ?? "").trim().toLowerCase() === mapping.layer.name.toLowerCase(),
    );
    if (matchingLayers.length !== 1) {
      blockers.push(
        matchingLayers.length === 0
          ? `No existing layer named ${mapping.layer.name} was found; create and link it in Input before generating a profile.`
          : `Multiple layers named ${mapping.layer.name} exist; keep exactly one before generating a profile.`,
      );
    } else {
      targetIndex = matchingLayers[0].index;
      if (manifest.preservation.protectedLayerIndexes.includes(targetIndex)) {
        blockers.push(`The target layer resolves to protected index ${targetIndex}.`);
      }
      if (!inventoryLayerHasAppSenseLink(matchingLayers[0])) {
        blockers.push("The existing Claude layer has no provable AppSense link; link it in Input first.");
      }
    }
  }

  return {
    format: "codex-micro-install-plan/v1",
    presetId: manifest.id,
    mode: "guided-ui",
    targetLayerIndex: targetIndex,
    protectedLayerIndexes: manifest.preservation.protectedLayerIndexes,
    blockers,
    canGenerateProfile: blockers.length === 0,
    canApplyOfficialLayerImport: false,
    steps: [
      "Verify and preserve the official profile export backup.",
      `Transform only the existing Claude layer at index ${targetIndex ?? "<exactly-one-required>"}; never modify index 0.`,
      "Preserve the existing Claude AppSense link and every unrelated layer.",
      "Generate Claude-macOS-profile.json locally from the official profile export.",
      "In Input, use Add New to import the generated profile.",
      "Test each control, focus loss, persistence, and rollback to the original profile export.",
    ],
  };
}

export function evaluateInstallCompatibility({
  manifest,
  installedInputApps = [],
  inventory = null,
  profileInspection = null,
  allowUnverifiedInputVersion = false,
}) {
  const errors = [];
  const warnings = [];
  const expectedBundleId = manifest.compatibility.input.bundleId;
  const supportedVersions = manifest.compatibility.input.supportedVersions;
  const matchingApps = installedInputApps.filter((app) => app.bundleId === expectedBundleId);

  if (matchingApps.length !== 1) {
    errors.push(
      matchingApps.length === 0
        ? `Work Louder Input (${expectedBundleId}) is not installed or could not be inspected.`
        : `Multiple Work Louder Input installations match ${expectedBundleId}; keep one explicit installation.`,
    );
  } else if (!supportedVersions.includes(matchingApps[0].version)) {
    const message = `Installed Input ${matchingApps[0].version ?? "<unknown>"} is not in the supported set: ${supportedVersions.join(", ")}.`;
    if (allowUnverifiedInputVersion) warnings.push(`${message} Explicit override recorded.`);
    else errors.push(message);
  }

  if (inventory) {
    if (inventory.keyboard !== CODEX_MICRO_KEYBOARD) {
      errors.push(`Inventory targets ${inventory.keyboard ?? "<unknown>"}; expected ${CODEX_MICRO_KEYBOARD}.`);
    }
    if (inventory.format !== "codex-micro-input-inventory/v1") {
      errors.push(`Unexpected inventory format: ${inventory.format ?? "<missing>"}.`);
    }
  }

  if (profileInspection) {
    const inspectionErrors = Array.isArray(profileInspection.errors) ? profileInspection.errors : [];
    const payloadKeyboard = profileInspection.payload?.keyboard;
    if (profileInspection.kind !== "profile" || inspectionErrors.length) {
      errors.push(`The supplied profile export is invalid: ${inspectionErrors.join(" ") || "unknown format"}`);
    }
    if (payloadKeyboard !== CODEX_MICRO_KEYBOARD) {
      errors.push(
        `Profile export targets ${payloadKeyboard ?? "<unknown>"}; expected ${CODEX_MICRO_KEYBOARD}.`,
      );
    }
    const profileLayers = profileInspection.payload?.profile?.layers;
    if (profileInspection.kind === "profile" && !Array.isArray(profileLayers)) {
      errors.push("The supplied profile export has no inspectable profile.layers array.");
    } else if (Array.isArray(profileLayers)) {
      const targetLayerName = manifest.preservation.targetLayerName;
      const matchingProfileLayers = profileLayers.filter(
        (layer) => String(layer?.name ?? "").trim().toLowerCase() === targetLayerName.toLowerCase(),
      );
      if (matchingProfileLayers.length !== 1) {
        errors.push(`The supplied profile export must contain exactly one layer named ${targetLayerName}.`);
      } else {
        const targetLayer = matchingProfileLayers[0];
        const targetIndex = profileLayers.indexOf(targetLayer);
        if (manifest.preservation.protectedLayerIndexes.includes(targetIndex)) {
          errors.push(`The supplied profile targets protected layer index ${targetIndex}.`);
        }
        if (!Number.isInteger(targetLayer.linkedAppId) || targetLayer.linkedAppId < 0) {
          errors.push(`The existing ${targetLayerName} layer has no valid AppSense link.`);
        }
        if (inventory) {
          const matchingInventoryLayers = (inventory.layers ?? []).filter(
            (layer) =>
              String(layer?.name ?? "").trim().toLowerCase() === targetLayerName.toLowerCase(),
          );
          if (
            matchingInventoryLayers.length === 1
            && matchingInventoryLayers[0].index !== targetIndex
          ) {
            errors.push("Inventory and official profile export disagree on the Claude layer index.");
          }
        }
      }
    }
    if (inventory && inventory.source?.sha256 !== profileInspection.sha256) {
      errors.push("Inventory and official profile export hashes do not match.");
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    installedInput: matchingApps.length === 1 ? matchingApps[0] : null,
    supportedVersions,
    overrideUsed: allowUnverifiedInputVersion && warnings.length > 0,
  };
}

const INPUT_KEYCODE = Object.freeze({
  Meta: "KC_LGUI",
  Shift: "KC_LSFT",
  N: "KC_N",
  D: "KC_D",
});

function expectedKeyInputs(keys) {
  const modifiers = keys.slice(0, -1);
  const finalKey = keys.at(-1);
  return [
    ...modifiers.map((key) => ({ keycode: INPUT_KEYCODE[key], delay: 0, actionType: 1 })),
    { keycode: INPUT_KEYCODE[finalKey], delay: 0, actionType: 2 },
    ...modifiers
      .slice()
      .reverse()
      .map((key) => ({ keycode: INPUT_KEYCODE[key], delay: 0, actionType: 0 })),
  ];
}

export function validateCanonicalLayerArtifact(payload, mapping) {
  const errors = [];
  const layer = payload?.layer;
  const actions = Array.isArray(payload?.actions) ? payload.actions : [];
  if (layer?.name !== mapping.layer.name) {
    errors.push(`layer name must be ${mapping.layer.name}`);
  }

  const commandRow = layer?.layout?.base?.[2];
  const commandControls = [
    "command-row-left",
    "command-row-center-left",
    "command-row-center-right",
    "command-row-right",
  ];
  if (!Array.isArray(commandRow) || commandRow.length < commandControls.length) {
    errors.push("layer.layout.base[2] must expose the four command-row controls");
  }

  const referencedActionIds = new Set();
  for (const [index, controlId] of commandControls.entries()) {
    const expected = mapping.controls.find((control) => control.id === controlId)?.action;
    const actualKeycode = commandRow?.[index]?.keycode;
    if (expected?.type === "key") {
      if (!isDeepStrictEqual(expected.keys, ["Escape"]) || actualKeycode !== "KC_ESC") {
        errors.push(`${controlId} must resolve directly to KC_ESC`);
      }
      continue;
    }

    const match = /^KA_(\d+)$/.exec(actualKeycode ?? "");
    if (!match) {
      errors.push(`${controlId} must reference an official Input action`);
      continue;
    }
    const actionId = match[1];
    if (referencedActionIds.has(actionId)) {
      errors.push(`${controlId} reuses action ${actionId}; each shortcut must remain explicit`);
      continue;
    }
    referencedActionIds.add(actionId);
    const actualAction = actions.find((action) => String(action.id) === actionId);
    if (!actualAction) {
      errors.push(`${controlId} references missing action ${actionId}`);
      continue;
    }
    if (!sameAction(actualAction.keyInputs, expectedKeyInputs(expected.keys))) {
      errors.push(`${controlId} action ${actionId} does not match ${expected.keys.join("+")}`);
    }
  }

  if (actions.length !== referencedActionIds.size) {
    errors.push("the public layer artifact must contain only the three referenced shortcut actions");
  }
  for (const collection of ["multiactions", "smartActions"]) {
    if (!Array.isArray(payload?.[collection]) || payload[collection].length !== 0) {
      errors.push(`${collection} must remain empty in the safe default artifact`);
    }
  }
  for (const collection of ["actionGroups", "multiactionGroups", "smartActionGroups"]) {
    for (const group of Array.isArray(payload?.[collection]) ? payload[collection] : []) {
      const unknown = (group.actionIds ?? []).filter((id) => !referencedActionIds.has(String(id)));
      if (unknown.length) errors.push(`${collection} references unapproved actions: ${unknown.join(", ")}`);
    }
  }

  const encoderKeys = layer?.layout?.encoders?.[0]?.map((entry) => entry.keycode);
  if (!sameAction(encoderKeys, ["KC_PGUP", "KC_PGDN", "KC_NONE"])) {
    errors.push("encoder must be exactly PageUp, PageDown, and no press action");
  }
  const joystickKeys = layer?.layout?.joystick?.sectors?.map((sector) => sector.k);
  if (!sameAction(joystickKeys, ["KI_X", "KC_LEFT", "KC_DOWN", "KC_RGHT", "KC_UP"])) {
    errors.push("joystick sectors must exactly match the four canonical arrow directions");
  }

  for (const [rowIndex, row] of (layer?.layout?.base ?? []).entries()) {
    if (!Array.isArray(row)) {
      errors.push(`layer.layout.base[${rowIndex}] must be an array`);
      continue;
    }
    if (rowIndex === 2) continue;
    if (row.some((entry) => entry?.keycode !== "KC_NONE")) {
      errors.push(`unmapped controls in layer.layout.base[${rowIndex}] must remain KC_NONE`);
    }
  }

  return errors;
}

export async function findBundledArtifact(profileDir, manifest, mapping) {
  const relative = manifest.installation?.layerArtifact;
  if (!relative) return null;
  if (path.isAbsolute(relative) || !relative.endsWith("-layer.json")) {
    throw new Error("Declared artifact must be a relative *-layer.json file.");
  }

  const artifactDirectory = path.resolve(profileDir, manifest.files?.artifactDirectory ?? "");
  const absolute = path.resolve(profileDir, relative);
  const contained = path.relative(artifactDirectory, absolute);
  if (!contained || contained === ".." || contained.startsWith(`..${path.sep}`) || path.isAbsolute(contained)) {
    throw new Error("Declared artifact must stay inside files.artifactDirectory.");
  }
  if (!(await pathExists(absolute))) throw new Error(`Declared artifact does not exist: ${relative}`);

  const stat = await fs.lstat(absolute);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Declared artifact must be a regular file, not a symbolic link.");
  }
  const [realDirectory, realArtifact] = await Promise.all([
    fs.realpath(artifactDirectory),
    fs.realpath(absolute),
  ]);
  const realContained = path.relative(realDirectory, realArtifact);
  if (!realContained || realContained === ".." || realContained.startsWith(`..${path.sep}`)) {
    throw new Error("Declared artifact resolves outside files.artifactDirectory.");
  }

  const inspection = await inspectOfficialExport(absolute);
  if (inspection.kind !== "layer" || inspection.errors.length) {
    throw new Error(`Declared artifact is not a valid official layer export: ${inspection.errors.join(" ")}`);
  }
  if (inspection.payload.keyboard !== CODEX_MICRO_KEYBOARD) {
    throw new Error(`Declared artifact targets ${inspection.payload.keyboard}; expected ${CODEX_MICRO_KEYBOARD}.`);
  }
  if (inspection.suspiciousFields.length) {
    const details = inspection.suspiciousFields
      .map((finding) => `${finding.path} (${finding.reason})`)
      .join(", ");
    throw new Error(`Declared artifact contains possible local identifiers: ${details}`);
  }
  const digest = await sha256File(absolute);
  if (digest !== manifest.installation?.layerArtifactSha256) {
    throw new Error("Declared artifact SHA-256 does not match installation.layerArtifactSha256.");
  }
  const semanticErrors = validateCanonicalLayerArtifact(inspection.payload, mapping);
  if (semanticErrors.length) {
    throw new Error(`Declared artifact does not match the canonical safe mapping: ${semanticErrors.join(" ")}`);
  }

  return {
    path: absolute,
    sha256: digest,
    verifiedForImport: manifest.installation.layerArtifactStatus === "roundtrip-verified",
    keyboard: inspection.payload.keyboard,
  };
}
