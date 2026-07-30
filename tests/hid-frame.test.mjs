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

test("l'identifiant RPC reste dans la borne firmware [0, 999)", () => {
  for (let index = 0; index < 200; index += 1) {
    const id = createRpcId();
    assert.ok(Number.isInteger(id));
    assert.ok(id >= 0 && id < RPC_ID_LIMIT);
  }
});

test("l'enveloppe de requête est {method, params, id}, params null par défaut", () => {
  assert.equal(buildRequest({ method: "sys.version", id: 42 }), '{"method":"sys.version","params":null,"id":42}');
  assert.equal(
    buildRequest({ method: "v.oai.thstatus", params: [{ id: 0, c: 1 }], id: 7 }),
    '{"method":"v.oai.thstatus","params":[{"id":0,"c":1}],"id":7}',
  );
});

test("l'enveloppe valide la méthode et la borne de l'identifiant", () => {
  assert.throws(() => buildRequest({ method: "", id: 1 }), /méthode/);
  assert.throws(() => buildRequest({ method: "x", id: -1 }), /entre 0/);
  assert.throws(() => buildRequest({ method: "x", id: RPC_ID_LIMIT }), /entre 0/);
});

test("les caractères non ASCII sont échappés, y compris hors BMP", () => {
  assert.equal(escapeUnicode("aéb"), "a\\u00e9b");
  assert.equal(escapeUnicode("🎹"), "\\ud83c\\udfb9");
  assert.equal(escapeUnicode("ascii"), "ascii");
});

test("un message court tient en un rapport de 64 octets avec en-tête 06/02/longueur", () => {
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

test("la frontière de 61 octets découpe exactement", () => {
  assert.equal(encodeFrames("x".repeat(CHUNK_PAYLOAD)).length, 1);
  const frames = encodeFrames("x".repeat(CHUNK_PAYLOAD + 1));
  assert.equal(frames.length, 2);
  assert.equal(frames[0][2], CHUNK_PAYLOAD);
  assert.equal(frames[1][2], 1);
  // Même en-tête sur les rapports de continuation, seule la longueur varie.
  assert.equal(frames[1][0], REPORT_ID);
  assert.equal(frames[1][1], CHANNEL_RPC);
});

test("un message vide n'émet aucun rapport", () => {
  assert.equal(encodeFrames("").length, 0);
});

test("un rapport se décode : canal, longueur, charge utile", () => {
  const [frame] = encodeFrames("bonjour");
  const decoded = decodeReport(frame);
  assert.equal(decoded.channel, CHANNEL_RPC);
  assert.equal(decoded.length, 7);
  assert.equal(decoded.payload, "bonjour");
  assert.throws(() => decodeReport(Buffer.alloc(2)), /trop court/);
});

test("l'assembleur réunit les fragments et découpe aux sauts de ligne", () => {
  const assemble = createLineAssembler();
  const frames = encodeFrames('{"a":"' + "x".repeat(80) + '"}\n');
  assert.ok(frames.length > 1);
  let lines = [];
  for (const frame of frames) lines = lines.concat(assemble(frame));
  assert.equal(lines.length, 1);
  assert.equal(lines[0].channel, CHANNEL_RPC);
  assert.equal(JSON.parse(lines[0].line).a, "x".repeat(80));
});

test("l'assembleur gère \\r\\n, plusieurs lignes et la séparation des canaux", () => {
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

test("l'accumulateur classe réponses, notifications et messages invalides", () => {
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

test("l'accumulateur attend la fin d'un JSON fragmenté et saute les préfixes parasites", () => {
  const accumulate = createRpcAccumulator();
  assert.equal(accumulate('bruit sans json'), null);
  assert.equal(accumulate('{"id":12,"res'), null);
  const message = accumulate('ult":{"ok":1}}');
  assert.equal(message.kind, "response");
  assert.equal(message.id, "12");

  // Après un message complet, l'accumulateur repart à zéro.
  const next = accumulate('{"i":3,"result":2}');
  assert.equal(next.kind, "response");
  assert.equal(next.id, "3");
});
