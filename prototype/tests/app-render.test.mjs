import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { entryFingerprint } from "../src/configurator-state.js";
import { LOCALES } from "../src/i18n/index.js";
import { createProfileSession } from "../src/profile-session.js";

const values = new Map();
const storage = {
  getItem(key) {
    return values.get(key) ?? null;
  },
  setItem(key, value) {
    values.set(key, value);
  },
};

let server;
let App;
let createJoystickDialGeometry;
let presenter;
let ProfileExportPanel;
let KeyAssignmentEditor;
let keyActions;

before(async () => {
  globalThis.window = { localStorage: storage };
  server = await createServer({
    root: new URL("..", import.meta.url).pathname,
    server: { middlewareMode: true },
    appType: "custom",
    logLevel: "error",
  });
  ({ App } = await server.ssrLoadModule("/src/App.jsx"));
  ({ createJoystickDialGeometry } = await server.ssrLoadModule(
    "/src/components/JoystickDial.jsx",
  ));
  presenter = await server.ssrLoadModule("/src/configurator-presenter.js");
  ({ ProfileExportPanel } = await server.ssrLoadModule(
    "/src/components/ProfileExportPanel.jsx",
  ));
  ({ KeyAssignmentEditor } = await server.ssrLoadModule(
    "/src/components/KeyAssignmentEditor.jsx",
  ));
  ({ ACTIONS_BY_CONTROL_TYPE: { key: keyActions } } = await server.ssrLoadModule(
    "/src/configurator-catalog.jsx",
  ));
});

after(async () => {
  await server?.close();
  delete globalThis.window;
});

test("renders the complete configurator from the default state", () => {
  values.clear();
  const html = renderToString(React.createElement(App));

  assert.match(html, /Codex Micro/);
  assert.ok(html.includes(LOCALES.en.hero.subtitle));
  assert.equal((html.match(/class="key-hotspot /g) ?? []).length, 15);
  assert.match(html, /class="mapping-dialog "/);
  assert.match(html, /aria-hidden="true"/);
});

test("renders a saved locale while malformed mapping storage fails closed", () => {
  values.clear();
  values.set("codex-micro-locale", "fr");
  values.set("codex-micro-mapping", "not-json");

  const html = renderToString(React.createElement(App));
  assert.ok(html.includes(LOCALES.fr.hero.subtitle));
  assert.ok(html.includes(LOCALES.fr.buttons.configureKeys));
});

test("precomputes stable joystick paths for supported direction counts", () => {
  const four = createJoystickDialGeometry(4);
  const eight = createJoystickDialGeometry(8);
  assert.equal(four.sectors.length, 4);
  assert.equal(eight.sectors.length, 8);
  assert.match(four.close.path, /^M /);
  assert.equal(four.close.centroid.length, 2);
  assert.notEqual(four.sectors[0].path, four.sectors[1].path);
});

test("presents catalogue, custom, joystick, and fallback entries consistently", () => {
  const t = (key, values) => values ? `${key}:${JSON.stringify(values)}` : key;
  const custom = { type: "custom", keys: ["Command", "Shift", "K"] };
  const joystick = { directions: 4, sectors: ["none", "none", "none", "none"] };
  assert.equal(presenter.entryFor({ "key-1": "voice" }, "key-1"), "voice");
  assert.equal(presenter.entryFor({}, "key-1"), "none");
  assert.equal(presenter.entryExportLabel(custom), "⌘⇧K");
  assert.equal(presenter.entryExportLabel(joystick), "4 DIR");
  assert.equal(presenter.entryExportLabel("unknown"), "NONE");
  assert.equal(presenter.entryExportLabel("toString"), "NONE");
  assert.equal(presenter.entryLabel(custom, t), "actions.custom.label");
  assert.equal(presenter.entryLabel(joystick, t), "actions.joystickCustom.label");
  assert.equal(presenter.entryShortcut(custom, t), "⌘⇧K");
  assert.match(presenter.entryShortcut(joystick, t), /^actions\.joystickCustom\.shortcut:/);
  assert.ok(presenter.entryIcon(custom));
  assert.ok(presenter.entryIcon(joystick));
  assert.ok(presenter.entryIcon("unknown"));
  assert.equal(presenter.entryLabel("constructor", t), "actions.none.label");
  assert.equal(presenter.entryShortcut("toString", t), "actions.none.shortcut");
  const control = { id: "key-1", shortLabel: "C1" };
  assert.equal(presenter.controlLabel(control, t), "controls.key-1");
  assert.equal(presenter.controlBadgeLabel(control, "none"), "C1");
  assert.equal(presenter.controlBadgeLabel(control, "voice"), "VOICE");
});

test("shows duplicate custom shortcuts while editing a joystick sector", () => {
  const custom = { type: "custom", keys: ["Command", "D"] };
  const html = renderToString(
    React.createElement(KeyAssignmentEditor, {
      t: (key) => key,
      selectedControl: { id: "joystick", type: "joystick" },
      selectedEntry: {
        directions: 4,
        sectors: [custom, "none", "none", "none"],
      },
      activeEntry: custom,
      editingJoystickSlot: true,
      joystickSlot: 0,
      pickerActions: keyActions,
      duplicateKeyControls: new Map([
        [entryFingerprint(custom), { id: "key-1" }],
      ]),
      customNeedsModifier: false,
      onSetJoystickMode() {},
      onSelectJoystickSlot() {},
      onAssignEntry() {},
      onToggleModifier() {},
      onChangeFinalKey() {},
    }),
  );

  assert.match(html, /picker\.alreadyOn/);
});

test("renders the deferred export workflow independently", () => {
  const profile = createProfileSession();
  const ref = { current: null };
  const html = renderToString(
    React.createElement(ProfileExportPanel, {
      t: (key) => key,
      refs: { loader: ref, profileInput: ref, review: ref },
      profile,
      onLoadSourceProfile() {},
      onResolveMappingConflict() {},
      onAppSenseChange() {},
      onRunReview() {},
      onDownloadReview() {},
    }),
  );
  assert.match(html, /wizard-step-1-title/);
  assert.match(html, /wizard-step-3-title/);
  assert.match(html, /review.needProfile/);
});
