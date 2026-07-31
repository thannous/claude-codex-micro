import assert from "node:assert/strict";
import test from "node:test";
import {
  detectTheme,
  nextTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from "../src/hooks/use-theme.js";

test("detects and cycles themes with storage failures isolated", () => {
  assert.equal(detectTheme({ getItem: (key) => key === THEME_STORAGE_KEY ? "dark" : null }), "dark");
  assert.equal(detectTheme({ getItem: () => "unknown" }), "auto");
  assert.equal(detectTheme({ getItem: () => { throw new Error("blocked"); } }), "auto");
  assert.equal(nextTheme("auto"), "light");
  assert.equal(nextTheme("light"), "dark");
  assert.equal(nextTheme("dark"), "auto");
  assert.equal(nextTheme("unknown"), "auto");
});

test("persists themes through an injectable, failure-safe storage boundary", () => {
  const writes = [];
  assert.equal(
    saveTheme("dark", { setItem: (...args) => writes.push(args) }),
    true,
  );
  assert.deepEqual(writes, [[THEME_STORAGE_KEY, "dark"]]);
  assert.equal(
    saveTheme("light", {
      setItem() {
        throw new Error("blocked");
      },
    }),
    false,
  );
});
