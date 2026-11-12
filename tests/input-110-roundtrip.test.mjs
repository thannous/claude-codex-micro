import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildInputProfile, DEFAULT_MAPPING, deriveMappingFromProfile } from "../shared/input-profile.mjs";
import { evaluateInstallCompatibility, validatePreset } from "../scripts/lib/preset.mjs";

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/input-1.1.0/${name}-profile.json`, import.meta.url)));
const source = fixture("source");
const roundtrip = fixture("roundtrip");
const canonical = (value) => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]))
    : value;

test("a real Input 1.1.0 source survives generation and native re-export with the same native-layer SHA-256", () => {
  const { profile, report } = buildInputProfile(source);
  assert.deepEqual(profile.profile.layers[0], source.profile.layers[0]);
  assert.deepEqual(roundtrip.profile.layers[0], source.profile.layers[0]);
  const digest = createHash("sha256").update(JSON.stringify(canonical(roundtrip.profile.layers[0]))).digest("hex");
  assert.equal(digest, "07eaffb11c3bb91ffe3f3f12aff90a6564c14410d2b5b61bfac21b7d64085493");
  assert.equal(roundtrip.profile.layers[1].linkedAppId, source.profile.layers[1].linkedAppId);
  assert.equal(report.nativeLayerPreserved, true);
});

test("Input 1.1.0 action-id remapping preserves shortcuts, effort macros, joystick and six Agent codes", () => {
  assert.deepEqual(deriveMappingFromProfile(roundtrip).mapping, DEFAULT_MAPPING);
  const layer = roundtrip.profile.layers[1];
  const codes = [...layer.layout.base[0], ...layer.layout.base[1]].map((cell) => cell.keycode);
  assert.deepEqual(codes, Array.from({ length: 6 }, (_, index) => `KV_OAI_AG0${index}`));
  assert.equal(roundtrip.actions.length, 5);
});

test("compatibility admits the verified 1.1.0 without admitting an unverified patch", () => {
  const manifest = JSON.parse(readFileSync(new URL("../profiles/claude-shortcuts/manifest.json", import.meta.url)));
  const mapping = JSON.parse(readFileSync(new URL("../profiles/claude-shortcuts/mapping.json", import.meta.url)));
  assert.equal(validatePreset(manifest, mapping).ok, true);
  const check = (version) => evaluateInstallCompatibility({
    manifest, installedInputApps: [{ bundleId: "it.focusense.input-app", version }],
  });
  assert.equal(check("1.1.0").ok, true);
  assert.equal(check("1.1.1").ok, false);
  const unverified = structuredClone(manifest);
  unverified.compatibility.input.observedVersion = "1.1.1";
  unverified.compatibility.input.supportedVersions.push("1.1.1");
  assert.equal(validatePreset(unverified, mapping).ok, false);
});
