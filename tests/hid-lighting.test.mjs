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

test("the thread id table follows the physical order of the six Agent keys", () => {
  assert.deepEqual([...SLOT_THREAD_IDS], [0, 1, 2, 3, 4, 5]);
  assert.equal(SLOT_THREAD_IDS.length, SLOT_CONTROLS.length);
});

test("#RRGGBB colours become packed RGB integers", () => {
  assert.equal(colorToInt("#D97757"), 0xd97757);
  assert.equal(colorToInt("d97757"), 0xd97757);
  assert.equal(colorToInt(0x123456), 0x123456);
  assert.throws(() => colorToInt("#123"), /#RRGGBB/);
  assert.throws(() => colorToInt("rouge"), /#RRGGBB/);
  assert.throws(() => colorToInt(0x1000000), /#RRGGBB/);
});

test("a thread entry is minified and requires only the id", () => {
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

test("thread entries validate their bounds", () => {
  assert.throws(() => threadEntry({}), /thread id/);
  assert.throws(() => threadEntry({ id: -1 }), /thread id/);
  assert.throws(() => threadEntry({ id: 0, brightness: 1.5 }), /brightness/);
  assert.throws(() => threadEntry({ id: 0, speed: -0.1 }), /speed/);
  assert.throws(() => threadEntry({ id: 0, effect: 99 }), /Unknown effect/);
});

test("threadsLightingParams composes an array of entries", () => {
  const params = threadsLightingParams([
    { id: 0, color: "#D97757" },
    { id: 1, brightness: 0 },
  ]);
  assert.deepEqual(params, [{ id: 0, c: 0xd97757 }, { id: 1, b: 0 }]);
});

test("an rgbcfg zone carries all five minified fields", () => {
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

test("the six slots become state lighting entries", () => {
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
  // A free slot is unlit, without touching the colour.
  assert.deepEqual(entries[5], { id: 5, b: 0 });
  // The state colour used is the one from the thread-status palette.
  assert.equal(entries[2].c, colorToInt(STATE_COLORS.idle));
});

test("slotsToThreadEntries exige exactement six lignes", () => {
  assert.throws(() => slotsToThreadEntries([{ state: STATES.free }]), /Expected 6 slots/);
  assert.throws(() => slotsToThreadEntries(null), /Expected 6 slots/);
});

test("allOffParams turns the six slots off with no other field", () => {
  assert.deepEqual(allOffParams(), [0, 1, 2, 3, 4, 5].map((id) => ({ id, b: 0 })));
});
