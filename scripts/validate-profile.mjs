#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(root, "profiles", "claude-shortcuts", "macos.example.json");
const profile = JSON.parse(await readFile(profilePath, "utf8"));
const errors = [];

if (profile.status !== "proposal-not-applied") errors.push("status must remain proposal-not-applied until hardware validation");
if (profile.target?.appBundleId !== "com.anthropic.claudefordesktop") errors.push("unexpected Claude bundle identifier");
if (profile.target?.observedInputVersion !== "0.17.2") errors.push("observed Input version must be 0.17.2");
if (profile.target?.observedFirmwareVersion !== "v0.4.1") errors.push("observed firmware version must be v0.4.1");

if (
  profile.preservation?.mode !== "add-only-first-free-layer" ||
  !profile.preservation?.protectedLayerIndexes?.includes(0) ||
  profile.preservation?.unlistedControls !== "no-action-in-new-layer" ||
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
  profile.activation?.detectionMethod !== "auto-detect" ||
  profile.activation?.focusRequirementSeconds !== 5 ||
  profile.activation?.bindingStatus !== "proposal-not-applied" ||
  profile.activation?.duplicatePolicy !== "refuse"
) {
  errors.push("AppSense foreground activation contract is incomplete");
}

if (
  profile.layerBinding?.targetKind !== "new-layer" ||
  profile.layerBinding?.layerId !== null ||
  profile.layerBinding?.slotPolicy !== "first-free-after-protected" ||
  profile.layerBinding?.selectionStatus !== "pending-local-inventory" ||
  profile.layerBinding?.overwriteMapping !== false
) {
  errors.push("new layer must target the first free slot without replacement");
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

const shortcut = (id) => JSON.stringify(controls.find((control) => control.control === id)?.action ?? {});
if (!shortcut("command-row-left").includes('"Meta"') || !shortcut("command-row-left").includes('"N"')) errors.push("new conversation must be Meta+N");
if (!shortcut("command-row-center-left").includes('"Meta"') || !shortcut("command-row-center-left").includes('"F"')) errors.push("search must be Meta+F");
if (!shortcut("command-row-center-right").includes('"Meta"') || !shortcut("command-row-center-right").includes('"Comma"')) errors.push("settings must be Meta+Comma");
if (!shortcut("command-row-right").includes('"Escape"')) errors.push("cancel must be Escape");

const encoder = controls.find((control) => control.control === "encoder-rotate")?.action;
if (encoder?.clockwise !== "scroll-down" || encoder?.counterclockwise !== "scroll-up") errors.push("encoder must provide vertical scrolling");
const joystick = controls.find((control) => control.control === "joystick")?.action;
for (const [direction, key] of Object.entries({ up: "ArrowUp", right: "ArrowRight", down: "ArrowDown", left: "ArrowLeft" })) {
  if (joystick?.[direction] !== key) errors.push(`joystick ${direction} must be ${key}`);
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
  console.log("OK: Claude V1 logical profile validated; layer 0 protected and sensitive actions excluded");
}
