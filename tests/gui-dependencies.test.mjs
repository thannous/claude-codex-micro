import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { ensureGuiDependencies } from "../scripts/lib/gui-dependencies.mjs";

const guiDirectory = path.resolve("/tmp", "codex-micro-prototype");

function dependencyPaths(platform = "linux") {
  return {
    packageJson: path.join(guiDirectory, "package.json"),
    vite: path.join(
      guiDirectory,
      "node_modules",
      ".bin",
      platform === "win32" ? "vite.cmd" : "vite",
    ),
  };
}

test("skips installation when the locked GUI dependencies are already present", () => {
  const { packageJson, vite } = dependencyPaths();
  let spawned = false;
  const result = ensureGuiDependencies(guiDirectory, {
    exists: (candidate) => candidate === packageJson || candidate === vite,
    spawn: () => {
      spawned = true;
    },
    log: () => assert.fail("an existing install should not log preparation"),
    platform: "linux",
  });

  assert.deepEqual(result, { installed: false });
  assert.equal(spawned, false);
});

test("installs with the platform-specific npm command and locked options", () => {
  const { packageJson } = dependencyPaths("win32");
  const calls = [];
  const logs = [];
  const result = ensureGuiDependencies(guiDirectory, {
    exists: (candidate) => candidate === packageJson,
    spawn: (...args) => {
      calls.push(args);
      return { status: 0 };
    },
    log: (message) => logs.push(message),
    platform: "win32",
  });

  assert.deepEqual(result, { installed: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "npm.cmd");
  assert.deepEqual(calls[0][1], ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);
  assert.deepEqual(calls[0][2], { cwd: guiDirectory, stdio: "inherit" });
  assert.equal(logs.length, 1);
});

test("reports missing files, spawn failures, and non-zero install exits", () => {
  assert.throws(
    () => ensureGuiDependencies(guiDirectory, { exists: () => false }),
    /prototype\/package\.json is missing/,
  );

  const { packageJson } = dependencyPaths();
  const exists = (candidate) => candidate === packageJson;
  assert.throws(
    () =>
      ensureGuiDependencies(guiDirectory, {
        exists,
        spawn: () => ({ error: new Error("spawn failed") }),
        log: () => {},
      }),
    /spawn failed/,
  );

  assert.throws(
    () =>
      ensureGuiDependencies(guiDirectory, {
        exists,
        spawn: () => ({ status: 17 }),
        log: () => {},
      }),
    (error) => error.exitCode === 17 && /code 17/.test(error.message),
  );

  assert.throws(
    () =>
      ensureGuiDependencies(guiDirectory, {
        exists,
        spawn: () => ({ status: null }),
        log: () => {},
      }),
    (error) => error.exitCode === 1 && /code 1/.test(error.message),
  );
});
