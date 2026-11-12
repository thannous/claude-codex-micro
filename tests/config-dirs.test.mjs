import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  MAX_CONFIG_DIRS,
  collectConfigDirs,
  mergeRosters,
  normalizeConfigDir,
} from "../scripts/lib/config-dirs.mjs";

const home = "/Users/someone";

test("the default directory is null, however it is spelled", () => {
  assert.equal(normalizeConfigDir(undefined, home), null);
  assert.equal(normalizeConfigDir("", home), null);
  assert.equal(normalizeConfigDir("~/.claude", home), null);
  assert.equal(normalizeConfigDir("/Users/someone/.claude/", home), null);
});

test("a profile directory is kept absolute, and a relative one is refused", () => {
  assert.equal(normalizeConfigDir("~/.claude-accounts/work", home), "/Users/someone/.claude-accounts/work");
  assert.equal(normalizeConfigDir("/opt/claude/../claude-b", home), "/opt/claude-b");
  assert.equal(normalizeConfigDir("profiles/work", home), undefined);
  assert.equal(normalizeConfigDir(42, home), undefined);
});

test("directories are queried default first, then own, explicit and learnt, without duplicates", () => {
  const dirs = collectConfigDirs({
    env: {
      CLAUDE_CONFIG_DIR: "/profiles/own",
      CLAUDE_THREAD_STATUS_CONFIG_DIRS: ["/profiles/explicit", "/profiles/own", "relative"].join(path.delimiter),
    },
    known: ["/profiles/learnt", "/profiles/explicit", "~/.claude"],
    home,
  });
  assert.deepEqual(dirs, [null, "/profiles/own", "/profiles/explicit", "/profiles/learnt"]);
});

test("with nothing configured only the default directory is queried", () => {
  assert.deepEqual(collectConfigDirs({ env: {}, home }), [null]);
});

test("the remembered profile set is bounded", () => {
  const known = Array.from({ length: MAX_CONFIG_DIRS * 2 }, (_, index) => `/profiles/p${index}`);
  assert.equal(collectConfigDirs({ env: {}, known, home }).length, MAX_CONFIG_DIRS);
});

test("rosters are merged, tagged with their directory, and de-duplicated by session", () => {
  const { rows, errors } = mergeRosters([
    { configDir: null, rows: [{ sessionId: "a", status: "busy" }, { sessionId: "b", status: "idle" }] },
    { configDir: "/profiles/work", rows: [{ sessionId: "c", status: "idle" }, { sessionId: "a", status: "idle" }] },
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(rows, [
    { sessionId: "a", status: "busy", configDir: null },
    { sessionId: "b", status: "idle", configDir: null },
    { sessionId: "c", status: "idle", configDir: "/profiles/work" },
  ]);
});

// Counter-example for the naive merge: dropping a failed directory's rows would
// make `applyRoster` declare its sessions closed, and paint live keys dark.
test("a directory that fails to answer keeps its live sessions, without a status", () => {
  const slots = [
    { sessionId: "work-live", state: "running", configDir: "/profiles/work" },
    { sessionId: "work-closed", state: "ended", configDir: "/profiles/work" },
    { sessionId: "default-live", state: "idle", configDir: null },
    null,
  ];
  const { rows, errors } = mergeRosters(
    [
      { configDir: null, rows: [{ sessionId: "default-live", status: "idle" }] },
      { configDir: "/profiles/work", error: "spawn timed out" },
    ],
    slots,
  );
  assert.deepEqual(rows, [
    { sessionId: "default-live", status: "idle", configDir: null },
    { sessionId: "work-live", configDir: "/profiles/work" },
  ]);
  assert.deepEqual(errors, ["/profiles/work: spawn timed out"]);
});
