import assert from "node:assert/strict";
import test from "node:test";
import {
  EFFECTS,
  SLOT_THREAD_IDS,
  allOffParams,
  colorToInt,
  rgbConfigParams,
  slotsToThreadEntries,
  threadEntry,
  threadsLightingParams,
  zoneSide,
} from "../scripts/lib/hid-lighting.mjs";
import { SLOT_CONTROLS, STATE_COLORS, STATES } from "../scripts/lib/thread-slots.mjs";

test("la table thread provisoire suit l'ordre physique des six touches Agent", () => {
  assert.deepEqual([...SLOT_THREAD_IDS], [0, 1, 2, 3, 4, 5]);
  assert.equal(SLOT_THREAD_IDS.length, SLOT_CONTROLS.length);
});

test("les couleurs #RRGGBB deviennent des entiers RGB compactés", () => {
  assert.equal(colorToInt("#D97757"), 0xd97757);
  assert.equal(colorToInt("d97757"), 0xd97757);
  assert.equal(colorToInt(0x123456), 0x123456);
  assert.throws(() => colorToInt("#123"), /#RRGGBB/);
  assert.throws(() => colorToInt("rouge"), /#RRGGBB/);
  assert.throws(() => colorToInt(0x1000000), /#RRGGBB/);
});

test("une entrée thread est minimisée et n'exige que l'identifiant", () => {
  assert.deepEqual(threadEntry({ id: 3 }), { id: 3 });
  assert.deepEqual(
    threadEntry({ id: 3, color: "#C2483D", brightness: 0.5, effect: EFFECTS.breath, speed: 1 }),
    { id: 3, c: 0xc2483d, b: 0.5, e: 4, s: 1 },
  );
  assert.deepEqual(
    threadEntry({ id: 0, syncKeysLighting: true, syncAmbientLighting: false }),
    { id: 0, sk: 1, sa: 0 },
  );
});

test("les entrées thread valident leurs bornes", () => {
  assert.throws(() => threadEntry({}), /Identifiant/);
  assert.throws(() => threadEntry({ id: -1 }), /Identifiant/);
  assert.throws(() => threadEntry({ id: 0, brightness: 1.5 }), /brightness/);
  assert.throws(() => threadEntry({ id: 0, speed: -0.1 }), /speed/);
  assert.throws(() => threadEntry({ id: 0, effect: 99 }), /Effet/);
});

test("threadsLightingParams compose un tableau d'entrées", () => {
  const params = threadsLightingParams([
    { id: 0, color: "#D97757" },
    { id: 1, brightness: 0 },
  ]);
  assert.deepEqual(params, [{ id: 0, c: 0xd97757 }, { id: 1, b: 0 }]);
});

test("une zone rgbcfg porte les cinq champs minimisés", () => {
  assert.deepEqual(
    zoneSide({ effect: EFFECTS.solid, brightness: 1, speed: 0.5, magic: 1, color: "#D97757" }),
    { e: 1, b: 1, s: 0.5, m: 1, c: 0xd97757 },
  );
  const config = rgbConfigParams({
    ambient: { effect: EFFECTS.rainbow, brightness: 1, speed: 0.55, magic: 1, color: "#FFFFFF" },
    keys: { effect: EFFECTS.solid, brightness: 1, speed: 0.5, magic: 1, color: "#D97757" },
  });
  assert.equal(config.ambient.e, 3);
  assert.equal(config.keys.c, 0xd97757);
});

test("les six emplacements deviennent des entrées d'éclairage d'état", () => {
  const rows = [
    { state: STATES.running },
    { state: STATES.blocked },
    { state: STATES.idle },
    { state: STATES.done },
    { state: STATES.ended },
    { state: STATES.free },
  ];
  const entries = slotsToThreadEntries(rows);
  assert.equal(entries.length, 6);
  assert.deepEqual(entries[0], { id: 0, c: 0xd97757, b: 1, e: EFFECTS.solid });
  assert.deepEqual(entries[1], { id: 1, c: 0xc2483d, b: 1, e: EFFECTS.solid });
  assert.deepEqual(entries[4], { id: 4, c: 0x2f2927, b: 1, e: EFFECTS.solid });
  // Un emplacement libre est éteint, sans toucher à la couleur.
  assert.deepEqual(entries[5], { id: 5, b: 0 });
  // La couleur d'état utilisée est bien celle de la palette thread-status.
  assert.equal(entries[2].c, colorToInt(STATE_COLORS.idle));
});

test("slotsToThreadEntries exige exactement six lignes", () => {
  assert.throws(() => slotsToThreadEntries([{ state: STATES.free }]), /6 emplacements/);
  assert.throws(() => slotsToThreadEntries(null), /6 emplacements/);
});

test("allOffParams éteint les six emplacements sans autre champ", () => {
  assert.deepEqual(allOffParams(), [0, 1, 2, 3, 4, 5].map((id) => ({ id, b: 0 })));
});
