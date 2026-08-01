import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const RUNTIME_BOUNDARY_MODULES = [
  "scripts/lib/hid-frame.mjs",
  "scripts/lib/hid-device.mjs",
  "scripts/lib/hid-lighting.mjs",
  "scripts/lib/thread-slots.mjs",
  "shared/input-profile.mjs",
  "shared/thread-status-palette.mjs",
];

// Importing the prototype workflow would load the whole browser application and
// distort the root coverage report. Keep its public surface explicit and inspect
// the source instead; the equality check below catches newly exported functions.
const SOURCE_ONLY_BOUNDARY_EXPORTS = new Map([
  [
    "prototype/src/profile-workflow.js",
    [
      "createProfileReview",
      "describeProfileError",
      "prepareImportedProfile",
      "sha256Hex",
    ],
  ],
]);

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function callableDeclaration(source, name) {
  const escaped = escapeRegExp(name);
  const match = source.match(
    new RegExp(
      `(\/\\*\\*[\\s\\S]*?\\*\/)[\\t ]*(?:\\r?\\n[\\t ]*)*` +
        `(?:export\\s+)?(?:async\\s+)?(function|class)\\s+${escaped}\\b`,
    ),
  );
  if (!match) return null;
  return { jsdoc: match[1], kind: match[2] };
}

function functionParameterSource(source, name) {
  const escaped = escapeRegExp(name);
  return source.match(
    new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${escaped}\\s*\\(([^)]*)\\)`),
  )?.[1] ?? null;
}

function exportedFunctionNames(source) {
  return [...source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)]
    .map((match) => match[1])
    .sort();
}

function constantDeclaration(source, name) {
  const escaped = escapeRegExp(name);
  return source.match(
    new RegExp(
      `(\/\\*\\*[\\s\\S]*?\\*\/)[\\t ]*(?:\\r?\\n[\\t ]*)*` +
        `(?:export\\s+)?const\\s+${escaped}\\b`,
    ),
  )?.[1] ?? null;
}

function isReexported(source, name) {
  return [...source.matchAll(/export\s*\{([^}]+)\}\s*from/g)].some((match) =>
    match[1]
      .split(",")
      .map((specifier) => specifier.trim().split(/\s+as\s+/).at(-1))
      .includes(name),
  );
}

function assertDocumentedMember(source, file, className, member, endMarker = null) {
  const classStart = source.indexOf(`export class ${className}`);
  assert.notEqual(classStart, -1, `${file}: missing class ${className}`);
  const classEnd = endMarker ? source.indexOf(endMarker, classStart) : source.length;
  const classSource = source.slice(classStart, classEnd === -1 ? source.length : classEnd);
  const escaped = escapeRegExp(member);
  assert.match(
    classSource,
    new RegExp(
      `\/\\*\\*[\\s\\S]*?\\*\/[\\t ]*(?:\\r?\\n[\\t ]*)*` +
        `(?:static\\s+)?(?:async\\s+)?${escaped}\\s*\\(`,
    ),
    `${file}: ${className}.${member} must have an adjacent JSDoc contract`,
  );
}

function assertCallableContract(source, file, name) {
  const declaration = callableDeclaration(source, name);
  assert.ok(declaration, `${file}: ${name} must have an adjacent JSDoc contract`);
  if (declaration.kind === "class") return;

  assert.match(
    declaration.jsdoc,
    /@returns?\s+\{/,
    `${file}: ${name} must document its return contract`,
  );
  const parameters = functionParameterSource(source, name);
  if (parameters?.trim()) {
    assert.match(
      declaration.jsdoc,
      /@param\s+\{/,
      `${file}: ${name} must document its parameters`,
    );
  }
}

test("complex boundary exports keep adjacent formal JSDoc contracts", async (context) => {
  for (const relativePath of RUNTIME_BOUNDARY_MODULES) {
    await context.test(relativePath, async () => {
      const absolutePath = path.join(REPOSITORY_ROOT, relativePath);
      const [source, exports] = await Promise.all([
        readFile(absolutePath, "utf8"),
        import(pathToFileURL(absolutePath).href),
      ]);

      const exportedEntries = Object.entries(exports);
      const callableNames = exportedEntries
        .filter(([, value]) => typeof value === "function")
        .map(([name]) => name)
        .sort();

      for (const name of callableNames) assertCallableContract(source, relativePath, name);

      const constantNames = exportedEntries
        .filter(([, value]) => typeof value !== "function")
        .map(([name]) => name)
        .sort();
      for (const name of constantNames) {
        if (isReexported(source, name)) continue;
        assert.ok(
          constantDeclaration(source, name),
          `${relativePath}: ${name} must have an adjacent JSDoc contract`,
        );
      }
    });
  }
});

test("prototype boundary exports keep adjacent formal JSDoc contracts", async (context) => {
  for (const [relativePath, expectedNames] of SOURCE_ONLY_BOUNDARY_EXPORTS) {
    await context.test(relativePath, async () => {
      const source = await readFile(path.join(REPOSITORY_ROOT, relativePath), "utf8");
      assert.deepEqual(
        exportedFunctionNames(source),
        [...expectedNames].sort(),
        `${relativePath}: update the documented public API list when exports change`,
      );
      for (const name of expectedNames) assertCallableContract(source, relativePath, name);
    });
  }
});

test("public HID session methods keep adjacent formal JSDoc contracts", async () => {
  const file = "scripts/lib/hid-device.mjs";
  const source = await readFile(path.join(REPOSITORY_ROOT, file), "utf8");

  assertDocumentedMember(source, file, "DeviceError", "constructor", "export async function loadHid");
  for (const member of ["constructor", "open", "onNotification", "call", "close"]) {
    assertDocumentedMember(source, file, "DeviceSession", member);
  }
});
