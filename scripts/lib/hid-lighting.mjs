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

/**
 * @typedef {object} ThreadLightingInput
 * @property {number} id Firmware slot identifier.
 * @property {string|number} [color] Packed RGB integer or `#RRGGBB` string.
 * @property {number} [brightness] Brightness in the inclusive range `[0, 1]`.
 * @property {number} [effect] One of the numeric values in {@link EFFECTS}.
 * @property {number} [speed] Animation speed in the inclusive range `[0, 1]`.
 * @property {boolean} [syncKeysLighting] Whether the slot follows the key zone.
 * @property {boolean} [syncAmbientLighting] Whether the slot follows the ambient zone.
 */

/**
 * @typedef {object} ZoneLightingInput
 * @property {number} effect Firmware effect identifier.
 * @property {number} brightness Brightness in the inclusive range `[0, 1]`.
 * @property {number} speed Animation speed in the inclusive range `[0, 1]`.
 * @property {unknown} magic Firmware field preserved verbatim.
 * @property {string|number} color Packed RGB integer or `#RRGGBB` string.
 */

/** Vendor RPC method names used by lighting and HID notifications. */
export const METHODS = Object.freeze({
  threadsLighting: "v.oai.thstatus",
  rgbConfig: "v.oai.rgbcfg",
  notifyHid: "v.oai.hid",
  notifyJoystick: "v.oai.rad",
});

/**
 * Firmware animation effect identifiers. `solid` is the stable-state effect;
 * the other values are available for explicit free-form lighting commands.
 */
export const EFFECTS = Object.freeze({
  off: 0,
  solid: 1,
  snake: 2,
  rainbow: 3,
  breath: 4,
  gradient: 5,
  shallowBreath: 6,
});

/**
 * Slot-to-thread-id mapping confirmed on hardware. The sequence `0..5` follows
 * {@link SLOT_CONTROLS}: two top-row keys, then four keys on the next row.
 */
export const SLOT_THREAD_IDS = Object.freeze(SLOT_CONTROLS.map((_, index) => index));

/**
 * Converts a CSS-style colour or validates an existing packed RGB integer.
 *
 * @param {string|number} color `#RRGGBB`, `RRGGBB`, or an integer in `[0, 0xFFFFFF]`.
 * @returns {number} Packed RGB value expected by the firmware.
 * @throws {Error} When the value is outside the supported colour format.
 */
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

/**
 * Builds one partial `v.oai.thstatus` entry. Omitted optional fields remain
 * unchanged on the device; returned keys use the firmware's minified format.
 *
 * @param {ThreadLightingInput} input Slot update in repository-facing names.
 * @returns {{id: number, c?: number, b?: number, e?: number, s?: number, sk?: number, sa?: number}}
 * Firmware-facing partial update.
 * @throws {Error} When an id, colour, effect, brightness, or speed is invalid.
 */
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

/**
 * Builds the parameter array for `v.oai.thstatus`.
 *
 * @param {ThreadLightingInput[]} entries Repository-facing slot updates.
 * @returns {Array<object>} Firmware-facing entries in the original order.
 */
export function threadsLightingParams(entries) {
  return entries.map(threadEntry);
}

/**
 * Builds one complete `v.oai.rgbcfg` zone; unlike thread entries, no field is
 * optional because the method replaces the whole zone configuration.
 *
 * @param {ZoneLightingInput} input Complete zone description.
 * @returns {{e: number, b: number, s: number, m: unknown, c: number}} Minified zone.
 * @throws {Error} When colour, brightness, or speed is invalid.
 */
export function zoneSide({ effect, brightness, speed, magic, color }) {
  return {
    e: effect,
    b: clampUnit("brightness", brightness),
    s: clampUnit("speed", speed),
    m: magic,
    c: colorToInt(color),
  };
}

/**
 * Builds the two-zone parameter object for `v.oai.rgbcfg`.
 *
 * @param {{ambient: ZoneLightingInput, keys: ZoneLightingInput}} input Zone inputs.
 * @returns {{ambient: object, keys: object}} Firmware-facing complete configuration.
 */
export function rgbConfigParams({ ambient, keys }) {
  return { ambient: zoneSide(ambient), keys: zoneSide(keys) };
}

/**
 * Translates the six session slots into solid lighting entries. Free slots are
 * explicitly unlit; known states use the shared repository palette.
 *
 * @param {Array<{state?: string}|null>} rows Exactly six session-slot rows.
 * @param {{brightness?: number}} [options] Brightness for non-free slots.
 * @returns {Array<object>} Six `v.oai.thstatus` entries in physical key order.
 * @throws {Error} When the slot count or brightness is invalid.
 */
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

/**
 * Builds partial entries that turn all six Agent slots off without changing
 * their colours, effects, speeds, or zone synchronization.
 *
 * @returns {Array<object>} Six brightness-only `v.oai.thstatus` entries.
 */
export function allOffParams() {
  return SLOT_THREAD_IDS.map((id) => threadEntry({ id, brightness: 0 }));
}
