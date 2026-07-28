#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { validateLogicalProfileSchema } from "./lib/schema-validation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(root, "profiles", "claude-shortcuts", "macos.example.json");
const profile = JSON.parse(await readFile(profilePath, "utf8"));
const errors = validateLogicalProfileSchema(profile);

function sameAction(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

if (profile.id !== "claude-desktop-macos-codex-micro-v0") errors.push("logical profile id must remain the V0 proposal");
if (profile.status !== "proposal-not-applied") errors.push("logical profile status must remain proposal-not-applied");
if (profile.target?.appBundleId !== "com.anthropic.claudefordesktop") errors.push("unexpected Claude bundle identifier");
if (profile.target?.observedInputVersion !== "0.17.3") errors.push("observed Input version must be 0.17.3");
if (!profile.target?.supportedInputVersions?.includes("0.17.3")) {
  errors.push("supported Input versions must include 0.17.3");
}
if (profile.target?.observedFirmwareVersion !== "v0.4.1") errors.push("observed firmware version must be v0.4.1");

if (
  profile.preservation?.mode !== "update-only-existing-layer" ||
  !profile.preservation?.protectedLayerIndexes?.includes(0) ||
  profile.preservation?.unlistedControls !== "no-action-in-target-layer" ||
  profile.preservation?.touchLayerControl !== "reserved" ||
  profile.preservation?.otherLayers !== "unchanged" ||
  profile.preservation?.otherProfiles !== "unchanged" ||
  profile.preservation?.otherAppSenseLinks !== "unchanged"
) {
  errors.push("layer preservation policy is incomplete");
}

if (
  profile.activation?.type !== "appsense-foreground-application" ||
  profile.activation?.provider !== "Work Louder Input" ||
  profile.activation?.application?.bundleId !== "com.anthropic.claudefordesktop" ||
  profile.activation?.detectionMethod !== "preserve-existing" ||
  profile.activation?.bindingStatus !== "existing-link-required" ||
  profile.activation?.duplicatePolicy !== "refuse"
) {
  errors.push("AppSense foreground activation contract is incomplete");
}

if (
  profile.layerBinding?.targetKind !== "existing-layer" ||
  profile.layerBinding?.layerId !== null ||
  profile.layerBinding?.selectionPolicy !== "exactly-one-layer-named-Claude" ||
  profile.layerBinding?.selectionStatus !== "existing-layer-required" ||
  profile.layerBinding?.overwriteMapping !== true ||
  profile.layerBinding?.nativePresetImport !== "local-profile-transform"
) {
  errors.push("the transform must target exactly one existing Claude layer");
}

if (profile.appearance?.name !== "Claude" || !/^#[0-9A-F]{6}$/i.test(profile.appearance?.rgb ?? "")) {
  errors.push("Claude layer appearance is incomplete");
}

const controls = profile.controls ?? [];
const expectedIds = [
  "command-row-left",
  "command-row-center-left",
  "command-row-center-right",
  "command-row-right",
  "encoder-rotate",
  "joystick",
];
const names = new Set();
for (const control of controls) {
  if (!control.control || names.has(control.control)) errors.push(`missing or duplicate control: ${control.control ?? "<empty>"}`);
  names.add(control.control);
  if (!control.physicalPosition) errors.push(`physical position missing for ${control.control}`);
  const action = JSON.stringify(control.action ?? {}).toLowerCase();
  if (/(enter|return|permission|approve|deny|delete|backspace|git.?push|deploy|shell|destructive)/i.test(action)) {
    errors.push(`sensitive action mapped on ${control.control}`);
  }
}
for (const id of expectedIds) if (!names.has(id)) errors.push(`missing required control: ${id}`);

const action = (id) => controls.find((control) => control.control === id)?.action;
if (!sameAction(action("command-row-left"), { type: "shortcut", keys: ["Meta", "N"] })) {
  errors.push("new conversation must be exactly Meta+N");
}
if (!sameAction(action("command-row-center-left"), { type: "shortcut", keys: ["Meta", "D"] })) {
  errors.push("voice dictation must be exactly Meta+D");
}
if (!sameAction(action("command-row-center-right"), { type: "shortcut", keys: ["Meta", "Shift", "D"] })) {
  errors.push("diff must be exactly Meta+Shift+D");
}
if (!sameAction(action("command-row-right"), { type: "key", keys: ["Escape"] })) {
  errors.push("cancel must be exactly Escape");
}

const encoder = controls.find((control) => control.control === "encoder-rotate")?.action;
if (!sameAction(encoder, { type: "page-navigation", clockwise: "PageDown", counterclockwise: "PageUp" })) {
  errors.push("encoder must exactly provide PageDown/PageUp navigation");
}
const joystick = controls.find((control) => control.control === "joystick")?.action;
if (!sameAction(joystick, {
  type: "directional-keys",
  up: "ArrowUp",
  right: "ArrowRight",
  down: "ArrowDown",
  left: "ArrowLeft",
})) {
  errors.push("joystick action must exactly match the four arrow directions");
}

if (!profile.unusedControls?.length || profile.unusedControls.some((entry) => !["no-action", "reserved"].includes(entry.behavior))) {
  errors.push("unused controls must be explicitly safe");
}

for (const action of ["quick-entry", "voice-dictation"]) {
  if (!profile.outsideAppLinkedLayer?.some((entry) => entry.action === action)) errors.push(`${action} must remain outside the AppSense layer`);
}
for (const action of ["send-message", "permission-approve-or-deny", "delete", "git-push", "deploy", "destructive-command"]) {
  if (!profile.excludedByDefault?.some((entry) => entry.action === action)) errors.push(`${action} must remain excluded by default`);
}

if (errors.length) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log("OK: Claude logical proposal validated; layer 0 protected and sensitive actions excluded");
}
