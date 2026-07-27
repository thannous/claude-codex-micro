#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const profilePath = path.join(
  root,
  "profiles",
  "claude-shortcuts",
  "macos.example.json",
);

const profile = JSON.parse(await readFile(profilePath, "utf8"));
const errors = [];

if (profile.status !== "proposal-not-applied") {
  errors.push("status must remain proposal-not-applied");
}

if (profile.target?.appBundleId !== "com.anthropic.claudefordesktop") {
  errors.push("unexpected Claude bundle identifier");
}

if (
  profile.preservation?.mode !== "do-not-replace-existing-layers" ||
  profile.preservation?.unlistedControls !== "unchanged" ||
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
  profile.activation?.application?.bundleId !==
    "com.anthropic.claudefordesktop" ||
  profile.activation?.detectionMethod !== "auto-detect" ||
  profile.activation?.focusRequirementSeconds !== 5 ||
  profile.activation?.bindingStatus !== "proposal-not-applied"
) {
  errors.push("AppSense foreground activation contract is incomplete");
}

if (
  profile.layerBinding?.targetKind !== "existing-layer" ||
  profile.layerBinding?.layerId !== null ||
  profile.layerBinding?.selectionStatus !==
    "pending-inventory-and-approval" ||
  profile.layerBinding?.overwriteMapping !== false
) {
  errors.push("existing layer must remain unselected and untouched");
}

if (!Array.isArray(profile.controls) || profile.controls.length === 0) {
  errors.push("controls must be a non-empty array");
}

const names = new Set();
for (const control of profile.controls ?? []) {
  if (!control.control || names.has(control.control)) {
    errors.push(`missing or duplicate control: ${control.control ?? "<empty>"}`);
  }
  names.add(control.control);

  if (!["low", "medium", "high"].includes(control.risk)) {
    errors.push(`invalid risk for ${control.control}`);
  }

  const action = JSON.stringify(control.action ?? {}).toLowerCase();
  if (action.includes("enter") || action.includes("permission")) {
    errors.push(`sensitive action mapped on ${control.control}`);
  }
  if (action.includes("option") || action.includes("capslock")) {
    errors.push(`global shortcut mapped inside AppSense layer on ${control.control}`);
  }
}

if (
  !profile.outsideAppLinkedLayer?.some(
    (entry) => entry.action === "quick-entry",
  ) ||
  !profile.outsideAppLinkedLayer?.some(
    (entry) => entry.action === "voice-dictation",
  )
) {
  errors.push("global Claude shortcuts must remain outside the AppSense layer");
}

if (
  !profile.excludedByDefault?.some(
    (entry) => entry.action === "permission-approve-or-deny",
  )
) {
  errors.push("permission decisions must remain excluded by default");
}

if (
  !profile.excludedByDefault?.some(
    (entry) => entry.action === "send-message",
  )
) {
  errors.push("send-message must remain excluded by default");
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(
    `OK: ${profile.controls.length} AppSense controls validated; existing layer unselected and untouched`,
  );
}
