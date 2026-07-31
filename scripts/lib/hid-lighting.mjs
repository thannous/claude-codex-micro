// Codex Micro lighting model, reimplemented from the format observed and
// documented in docs/research/hid-lighting-protocol.md. Original code.
//
// Two vendor JSON-RPC methods cover the lighting:
//
//   v.oai.thstatus  per-slot ("thread") lighting: the six Agent keys, addressed
//                   by `id`, with partial updates possible — an omitted field
//                   stays unchanged on the device;
//   v.oai.rgbcfg    two global zones: `ambient` (outer ring) and `keys`
//                   (under the keycaps).
//
// The module is pure: it only produces parameter objects, with no I/O.

import { SLOT_CONTROLS, STATE_COLORS, STATES } from "./thread-slots.mjs";

export const METHODS = Object.freeze({
  threadsLighting: "v.oai.thstatus",
  rgbConfig: "v.oai.rgbcfg",
  notifyHid: "v.oai.hid",
  notifyJoystick: "v.oai.rad",
});

// Firmware animation effects. `solid` is the only useful one for a steady state
// light; the others are exposed for free-form use.
export const EFFECTS = Object.freeze({
  off: 0,
  solid: 1,
  snake: 2,
  rainbow: 3,
  breath: 4,
  gradient: 5,
  shallowBreath: 6,
});

// Slot → thread id mapping on the channel. CONFIRMED on hardware by
// `node scripts/lighting.mjs probe --delay=3000`, which lights the keys one by
// one: the sequence of ids 0 to 5 follows exactly the physical order of
// SLOT_CONTROLS — the two keys of the top row, left to right, then the four of
// the next row.
export const SLOT_THREAD_IDS = Object.freeze(SLOT_CONTROLS.map((_, index) => index));

// "#D97757" → 0xD97757. The channel expects a packed RGB integer.
export function colorToInt(color) {
  if (typeof color === "number" && Number.isInteger(color) && color >= 0 && color <= 0xffffff) {
    return color;
  }
  const match = typeof color === "string" && color.match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) throw new Error(`Expected a colour in #RRGGBB format: ${color}`);
  return Number.parseInt(match[1], 16);
}

function clampUnit(name, value) {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`${name} expected between 0 and 1: ${value}`);
  }
  return value;
}

// One per-slot lighting entry. Only `id` is required; every optional field
// omitted leaves the corresponding parameter unchanged. The minified keys
// (`c`, `b`, `e`, `s`, `sk`, `sa`) are the channel's own format.
export function threadEntry({ id, color, brightness, effect, speed, syncKeysLighting, syncAmbientLighting }) {
  if (!Number.isInteger(id) || id < 0) throw new Error(`Expected an integer thread id ≥ 0: ${id}`);
  const entry = { id };
  if (color !== undefined && color !== null) entry.c = colorToInt(color);
  if (brightness !== undefined) entry.b = clampUnit("brightness", brightness);
  if (effect !== undefined) {
    if (!Object.values(EFFECTS).includes(effect)) throw new Error(`Unknown effect: ${effect}`);
    entry.e = effect;
  }
  if (speed !== undefined) entry.s = clampUnit("speed", speed);
  if (syncKeysLighting !== undefined) entry.sk = syncKeysLighting ? 1 : 0;
  if (syncAmbientLighting !== undefined) entry.sa = syncAmbientLighting ? 1 : 0;
  return entry;
}

// v.oai.thstatus parameters: an array of entries, one per slot.
export function threadsLightingParams(entries) {
  return entries.map(threadEntry);
}

// One v.oai.rgbcfg zone. All five fields are required: the method describes a
// complete zone configuration, not a partial update.
export function zoneSide({ effect, brightness, speed, magic, color }) {
  return {
    e: effect,
    b: clampUnit("brightness", brightness),
    s: clampUnit("speed", speed),
    m: magic,
    c: colorToInt(color),
  };
}

export function rgbConfigParams({ ambient, keys }) {
  return { ambient: zoneSide(ambient), keys: zoneSide(keys) };
}

// Translates the six thread-status slots into thstatus entries. A free slot is
// unlit (brightness 0); the others carry their state colour from the repository
// palette, as a solid effect.
export function slotsToThreadEntries(rows, { brightness = 1 } = {}) {
  if (!Array.isArray(rows) || rows.length !== SLOT_CONTROLS.length) {
    throw new Error(`Expected ${SLOT_CONTROLS.length} slots.`);
  }
  return rows.map((row, index) => {
    const state = row?.state ?? STATES.free;
    const color = STATE_COLORS[state] ?? null;
    if (color === null) return threadEntry({ id: SLOT_THREAD_IDS[index], brightness: 0 });
    return threadEntry({ id: SLOT_THREAD_IDS[index], color, brightness, effect: EFFECTS.solid });
  });
}

// Turns the six slots off without touching the other parameters.
export function allOffParams() {
  return SLOT_THREAD_IDS.map((id) => threadEntry({ id, brightness: 0 }));
}
