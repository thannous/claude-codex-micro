// HID framing of the Codex Micro RPC channel, reimplemented from the format
// observed and documented in docs/research/hid-lighting-protocol.md. Original
// code, with nothing taken from the Work Louder SDK: only the facts of the
// format (constants, byte positions, JSON fields) are used.
//
// The module is deliberately pure: no I/O, no dependency on the device. All the
// logic is testable without hardware.

import { randomInt } from "node:crypto";

// 64-byte report: [0] report id, [1] channel, [2] length of the chunk carried by
// THIS report, [3..63] UTF-8 payload.
export const REPORT_SIZE = 64;
export const REPORT_ID = 0x06;
export const CHANNEL_DEBUG = 1;
export const CHANNEL_RPC = 2;
export const CHUNK_PAYLOAD = REPORT_SIZE - 3; // 61 bytes per report

// The call id is bounded by the firmware, which rejects values outside
// [0, 999). Short ids also avoid pushing a request from one report to two for
// the sake of a few bytes.
export const RPC_ID_LIMIT = 999;

export function createRpcId() {
  return randomInt(0, RPC_ID_LIMIT);
}

// The channel replaces every non-ASCII character with its \uXXXX escape (or the
// surrogate pair beyond the BMP). Lighting payloads are already ASCII in
// practice; the escaping is applied to match the format.
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

// The channel's JSON-RPC envelope: { method, params, id }. `params` is null when
// the method expects none.
export function buildRequest({ method, params = null, id }) {
  if (typeof method !== "string" || !method) throw new Error("Expected an RPC method name.");
  if (!Number.isInteger(id) || id < 0 || id >= RPC_ID_LIMIT) {
    throw new Error(`Expected an RPC id between 0 and ${RPC_ID_LIMIT - 1}.`);
  }
  return escapeUnicode(JSON.stringify({ method, params, id }));
}

// Splits a message into 64-byte reports. A message longer than CHUNK_PAYLOAD is
// fragmented into consecutive reports that repeat the same header; only the
// length byte varies. An empty message emits nothing.
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

// Extracts channel and payload from an incoming report. The buffer delivered by
// the HID stack includes the report id in byte 0, as it does on the way out.
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

// Reassembles the stream of reports into lines. The device terminates each
// message with a newline; a long message arrives fragmented over several
// reports and is only complete at the final newline. Each channel has its own
// buffer: debug logs do not mix into the RPC.
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

// Rebuilds JSON-RPC messages from the lines of the RPC channel. A document can
// itself arrive over several lines (indented JSON): accumulate until parsing
// succeeds. Three shapes on the channel:
//
//   - response:     { "result": …, "id": n }          (id also carried as "i")
//   - notification: { "method": "v.oai.hid", "params": … }  (also "m"/"p")
//   - invalid:      neither id nor method — buffer dropped
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
