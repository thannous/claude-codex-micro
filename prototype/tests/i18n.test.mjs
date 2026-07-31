import assert from "node:assert/strict";
import test from "node:test";
import {
  LOCALES,
  createTranslator,
  detectLocale,
  saveLocale,
} from "../src/i18n/index.js";

test("detects a supported saved locale and otherwise falls back to English", () => {
  assert.equal(detectLocale({ getItem: () => "de" }), "de");
  assert.equal(detectLocale({ getItem: () => "unknown" }), "en");
  assert.equal(detectLocale({ getItem: () => null }), "en");
  assert.equal(
    detectLocale({
      getItem() {
        throw new Error("storage unavailable");
      },
    }),
    "en",
  );
});

test("saves the preference when storage is available and ignores storage failures", () => {
  const writes = [];
  saveLocale("es", { setItem: (...args) => writes.push(args) });
  assert.deepEqual(writes, [["codex-micro-locale", "es"]]);
  assert.doesNotThrow(() =>
    saveLocale("fr", {
      setItem() {
        throw new Error("private mode");
      },
    }),
  );
});

test("translates nested keys, interpolates values, and keeps deterministic fallbacks", () => {
  const english = createTranslator("en");
  assert.equal(english("meta.title"), LOCALES.en.meta.title);
  assert.equal(
    english("loader.meta", {
      file: "profile.json",
      layer: "Claude",
      appSense: "linked",
    }),
    LOCALES.en.loader.meta
      .replaceAll("{file}", "profile.json")
      .replaceAll("{layer}", "Claude")
      .replaceAll("{appSense}", "linked"),
  );

  const unknownLocale = createTranslator("xx");
  assert.equal(unknownLocale("meta.title"), LOCALES.fr.meta.title);
  assert.equal(english("missing.translation.key"), "missing.translation.key");
});
