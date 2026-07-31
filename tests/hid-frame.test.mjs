import assert from "node:assert/strict";
import test from "node:test";
import {
  CHANNEL_RPC,
  CHUNK_PAYLOAD,
  REPORT_ID,
  REPORT_SIZE,
  RPC_ID_LIMIT,
  buildRequest,
  createLineAssembler,
  createRpcAccumulator,
  createRpcId,
  decodeReport,
  encodeFrames,
  escapeUnicode,
} from "../scripts/lib/hid-frame.mjs";

test("the RPC id stays within the firmware bound [0, 999)", () => {
  for (let index = 0; index < 200; index += 1) {
    const id = createRpcId();
    assert.ok(Number.isInteger(id));
    assert.ok(id >= 0 && id < RPC_ID_LIMIT);
  }
});

test("the request envelope is {method, params, id}, params null by default", () => {
  assert.equal(buildRequest({ method: "sys.version", id: 42 }), '{"method":"sys.version","params":null,"id":42}');
  assert.equal(
    buildRequest({ method: "v.oai.thstatus", params: [{ id: 0, c: 1 }], id: 7 }),
    '{"method":"v.oai.thstatus","params":[{"id":0,"c":1}],"id":7}',
  );
});

test("the envelope validates the method and the id bound", () => {
  assert.throws(() => buildRequest({ method: "", id: 1 }), /RPC method name/);
  assert.throws(() => buildRequest({ method: "x", id: -1 }), /between 0/);
  assert.throws(() => buildRequest({ method: "x", id: RPC_ID_LIMIT }), /between 0/);
});

test("non-ASCII characters are escaped, including beyond the BMP", () => {
  assert.equal(escapeUnicode("aéb"), "a\\u00e9b");
  assert.equal(escapeUnicode("🎹"), "\\ud83c\\udfb9");
  assert.equal(escapeUnicode("ascii"), "ascii");
});

test("a short message fits one 64-byte report with a 06/02/length header", () => {
  const frames = encodeFrames('{"a":1}');
  assert.equal(frames.length, 1);
  const frame = frames[0];
  assert.equal(frame.length, REPORT_SIZE);
  assert.equal(frame[0], REPORT_ID);
  assert.equal(frame[1], CHANNEL_RPC);
  assert.equal(frame[2], 7);
  assert.equal(frame.subarray(3, 10).toString("utf8"), '{"a":1}');
  assert.equal(frame.subarray(10).every((byte) => byte === 0), true);
});

test("the 61-byte boundary splits exactly", () => {
  assert.equal(encodeFrames("x".repeat(CHUNK_PAYLOAD)).length, 1);
  const frames = encodeFrames("x".repeat(CHUNK_PAYLOAD + 1));
  assert.equal(frames.length, 2);
  assert.equal(frames[0][2], CHUNK_PAYLOAD);
  assert.equal(frames[1][2], 1);
  // Same header on the continuation reports, only the length varies.
  assert.equal(frames[1][0], REPORT_ID);
  assert.equal(frames[1][1], CHANNEL_RPC);
});

test("an empty message emits no report", () => {
  assert.equal(encodeFrames("").length, 0);
});

test("a report decodes into channel, length and payload", () => {
  const [frame] = encodeFrames("bonjour");
  const decoded = decodeReport(frame);
  assert.equal(decoded.channel, CHANNEL_RPC);
  assert.equal(decoded.length, 7);
  assert.equal(decoded.payload, "bonjour");
  assert.throws(() => decodeReport(Buffer.alloc(2)), /too short/);
});

test("the assembler joins fragments and splits on newlines", () => {
  const assemble = createLineAssembler();
  const frames = encodeFrames('{"a":"' + "x".repeat(80) + '"}\n');
  assert.ok(frames.length > 1);
  let lines = [];
  for (const frame of frames) lines = lines.concat(assemble(frame));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].channel, CHANNEL_RPC);
  assert.equal(JSON.parse(lines[0].line).a, "x".repeat(80));
});

test("the assembler handles \\r\\n, several lines and channel separation", () => {
  const assemble = createLineAssembler();
  const rpcFrame = Buffer.alloc(REPORT_SIZE);
  rpcFrame[0] = REPORT_ID;
  rpcFrame[1] = CHANNEL_RPC;
  const rpcText = '{"id":1}\r\n{"id":2}\n';
  rpcFrame[2] = Buffer.byteLength(rpcText);
  rpcFrame.write(rpcText, 3, "utf8");
  const debugFrame = Buffer.alloc(REPORT_SIZE);
  debugFrame[0] = REPORT_ID;
  debugFrame[1] = 1; // CHANNEL_DEBUG
  debugFrame[2] = 4;
  debugFrame.write("log\n", 3, "utf8");

  const lines = [...assemble(rpcFrame), ...assemble(debugFrame)];
  assert.deepEqual(
    lines.map((entry) => [entry.channel, entry.line]),
    [
      [CHANNEL_RPC, '{"id":1}'],
      [CHANNEL_RPC, '{"id":2}'],
      [1, "log"],
    ],
  );
});

test("the accumulator sorts responses, notifications and invalid messages", () => {
  const accumulate = createRpcAccumulator();
  const response = accumulate('{"result":{"ok":1},"id":475,"method":"v.oai.thstatus"}');
  assert.equal(response.kind, "response");
  assert.equal(response.id, "475");
  assert.equal(response.method, "v.oai.thstatus");

  const notification = accumulate('{"m":"v.oai.hid","p":{"k":"a"}}');
  assert.equal(notification.kind, "notification");
  assert.equal(notification.method, "v.oai.hid");
  assert.deepEqual(notification.params, { k: "a" });

  const invalid = accumulate('{"foo":1}');
  assert.equal(invalid.kind, "invalid");
});

test("the accumulator waits for the end of a fragmented JSON and skips stray prefixes", () => {
  const accumulate = createRpcAccumulator();
  assert.equal(accumulate('bruit sans json'), null);
  assert.equal(accumulate('{"id":12,"res'), null);
  const message = accumulate('ult":{"ok":1}}');
  assert.equal(message.kind, "response");
  assert.equal(message.id, "12");

  // After a complete message, the accumulator starts over.
  const next = accumulate('{"i":3,"result":2}');
  assert.equal(next.kind, "response");
  assert.equal(next.id, "3");
});
