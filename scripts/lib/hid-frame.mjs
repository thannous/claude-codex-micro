// HID framing of the Codex Micro RPC channel, reimplemented from the format
// observed and documented in docs/research/hid-lighting-protocol.md. Original
// code, with nothing taken from the Work Louder SDK: only the facts of the
// format (constants, byte positions, JSON fields) are used.
//
// The module is deliberately pure: no I/O, no dependency on the device. All the
// logic is testable without hardware.

import { randomInt } from "node:crypto";

/** Size in bytes of every vendor HID report, including its three-byte header. */
export const REPORT_SIZE = 64;

/** Report identifier used by the Codex Micro vendor channel. */
export const REPORT_ID = 0x06;

/** Channel identifier carrying firmware debug lines. */
export const CHANNEL_DEBUG = 1;

/** Channel identifier carrying JSON-RPC traffic. */
export const CHANNEL_RPC = 2;

/** Maximum UTF-8 payload carried by one report after the three-byte header. */
export const CHUNK_PAYLOAD = REPORT_SIZE - 3; // 61 bytes per report

/**
 * Exclusive upper bound for RPC identifiers accepted by the firmware.
 * Short identifiers also keep small requests inside a single HID report.
 */
export const RPC_ID_LIMIT = 999;

/**
 * Creates an RPC identifier inside the firmware-supported range `[0, 999)`.
 *
 * @returns {number} A random integer suitable for a request envelope.
 */
export function createRpcId() {
  return randomInt(0, RPC_ID_LIMIT);
}

/**
 * Escapes every non-ASCII code point using the representation expected by the
 * vendor channel, including surrogate pairs beyond the BMP.
 *
 * @param {string} text Text to encode inside a request.
 * @returns {string} ASCII-only text containing `\\uXXXX` escapes.
 */
export function escapeUnicode(text) {
  return text.replace(/[^\x00-\x7F]/gu, (char) => {
    const codePoint = char.codePointAt(0);
    if (codePoint > 0xffff) {
      const high = 0xd800 + ((codePoint - 0x10000) >> 10);
      const low = 0xdc00 + ((codePoint - 0x10000) & 0x3ff);
      return `\\u${high.toString(16).padStart(4, "0")}\\u${low.toString(16).padStart(4, "0")}`;
    }
    return `\\u${codePoint.toString(16).padStart(4, "0")}`;
  });
}

/**
 * Builds and validates the minified JSON-RPC request envelope sent over HID.
 *
 * @param {{method: string, params?: unknown, id: number}} request Request data.
 * @returns {string} An ASCII-only serialized `{method, params, id}` envelope.
 * @throws {Error} When the method is empty or the id is outside `[0, 999)`.
 */
export function buildRequest({ method, params = null, id }) {
  if (typeof method !== "string" || !method) throw new Error("Expected an RPC method name.");
  if (!Number.isInteger(id) || id < 0 || id >= RPC_ID_LIMIT) {
    throw new Error(`Expected an RPC id between 0 and ${RPC_ID_LIMIT - 1}.`);
  }
  return escapeUnicode(JSON.stringify({ method, params, id }));
}

/**
 * Splits a UTF-8 RPC message into fixed-size vendor HID reports.
 * Consecutive fragments repeat the same header; an empty message emits none.
 *
 * @param {string} message Serialized request to frame.
 * @returns {Buffer[]} Ordered 64-byte reports ready for `node-hid`.
 */
export function encodeFrames(message) {
  const buffer = Buffer.from(message, "utf8");
  const frames = [];
  let offset = 0;
  while (offset < buffer.length) {
    const chunkSize = Math.min(CHUNK_PAYLOAD, buffer.length - offset);
    const report = Buffer.alloc(REPORT_SIZE);
    report[0] = REPORT_ID;
    report[1] = CHANNEL_RPC;
    report[2] = chunkSize;
    buffer.copy(report, 3, offset, offset + chunkSize);
    frames.push(report);
    offset += chunkSize;
  }
  return frames;
}

/**
 * Decodes the header and UTF-8 payload of one incoming vendor report.
 *
 * @param {Buffer|Uint8Array|number[]} report Report including its id byte.
 * @returns {{channel: number, length: number, payload: string}} Decoded fragment.
 * @throws {Error} When the report is shorter than the three-byte header.
 */
export function decodeReport(report) {
  const data = Buffer.isBuffer(report) ? report : Buffer.from(report);
  if (data.length < 3) throw new Error(`HID report too short: ${data.length} byte(s).`);
  const channel = data[1];
  const length = data[2];
  return {
    channel,
    length,
    payload: data.subarray(3, 3 + length).toString("utf8"),
  };
}

/**
 * Creates a stateful assembler that separates channels and emits complete,
 * trimmed lines only after the firmware's newline delimiter is received.
 *
 * @returns {(report: Buffer|Uint8Array|number[]) => Array<{channel: number, line: string}>}
 * A report consumer whose buffers are private to this assembler instance.
 */
export function createLineAssembler() {
  const buffers = new Map();
  return function push(report) {
    const { channel, payload } = decodeReport(report);
    const pending = (buffers.get(channel) ?? "") + payload;
    const lines = pending.split(/\r?\n/);
    buffers.set(channel, lines.pop() ?? "");
    return lines.filter((line) => line.trim()).map((line) => ({ channel, line: line.trim() }));
  };
}

/**
 * Creates a stateful JSON accumulator for response, notification, and invalid
 * messages. Indented JSON is retained until parsing succeeds; stray prefixes
 * before the first object are discarded.
 *
 * @returns {(text: string) => ({kind: "response", id: string, method: string|null, raw: string, parsed: object}|{kind: "notification", method: string, params: unknown, raw: string, parsed: object}|{kind: "invalid", raw: string, parsed: object}|null)}
 * A line consumer that returns `null` while a JSON document is incomplete.
 */
export function createRpcAccumulator() {
  let pending = "";
  return function push(text) {
    if (pending.length === 0) {
      const start = text.indexOf("{");
      if (start === -1) return null;
      pending = text.slice(start);
    } else {
      pending += text;
    }

    let parsed;
    try {
      parsed = JSON.parse(pending);
    } catch {
      return null; // Fragment : il manque la suite.
    }
    const raw = pending;
    pending = "";

    let id = parsed.id ?? parsed.i;
    if (typeof id === "number") id = String(id);
    const method = parsed.method ?? parsed.m;

    if (!id && !method) return { kind: "invalid", raw, parsed };
    if (method && !id) {
      return { kind: "notification", method, params: parsed.params ?? parsed.p ?? null, raw, parsed };
    }
    return { kind: "response", id, method: method ?? null, raw, parsed };
  };
}
