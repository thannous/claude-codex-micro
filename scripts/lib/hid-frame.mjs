// Cadrage HID du canal RPC du Codex Micro, réimplémenté d'après le format
// observé et documenté dans docs/research/hid-lighting-protocol.md. Code
// original, sans aucune reprise du SDK Work Louder : seuls les faits du
// format (constantes, positions d'octets, champs JSON) sont exploités.
//
// Le module est volontairement pur : aucun I/O, aucune dépendance au
// périphérique. Toute la logique est testable sans matériel.

import { randomInt } from "node:crypto";

// Rapport de 64 octets : [0] identifiant de rapport, [1] canal, [2] longueur
// du fragment transporté par CE rapport, [3..63] charge utile UTF-8.
export const REPORT_SIZE = 64;
export const REPORT_ID = 0x06;
export const CHANNEL_DEBUG = 1;
export const CHANNEL_RPC = 2;
export const CHUNK_PAYLOAD = REPORT_SIZE - 3; // 61 octets par rapport

// L'identifiant d'appel est borné par le firmware, qui refuse les valeurs hors
// de [0, 999). Des identifiants courts évitent aussi de faire passer une
// requête d'un rapport à deux pour quelques octets.
export const RPC_ID_LIMIT = 999;

export function createRpcId() {
  return randomInt(0, RPC_ID_LIMIT);
}

// Le canal remplace tout caractère non ASCII par son échappement \uXXXX (ou la
// paire de substitution au-delà du BMP). Les charges d'éclairage sont en
// pratique déjà ASCII ; l'échappement est appliqué pour coller au format.
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

// Enveloppe JSON-RPC du canal : { method, params, id }. `params` vaut null
// quand la méthode n'en attend pas.
export function buildRequest({ method, params = null, id }) {
  if (typeof method !== "string" || !method) throw new Error("Nom de méthode RPC attendu.");
  if (!Number.isInteger(id) || id < 0 || id >= RPC_ID_LIMIT) {
    throw new Error(`Identifiant RPC attendu entre 0 et ${RPC_ID_LIMIT - 1}.`);
  }
  return escapeUnicode(JSON.stringify({ method, params, id }));
}

// Découpe un message en rapports de 64 octets. Un message plus long que
// CHUNK_PAYLOAD est fragmenté en rapports consécutifs qui répètent le même
// en-tête ; seul l'octet de longueur varie. Un message vide n'émet rien.
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

// Extrait canal et charge utile d'un rapport entrant. Le tampon livré par la
// pile HID inclut l'identifiant de rapport en octet 0, comme à l'émission.
export function decodeReport(report) {
  const data = Buffer.isBuffer(report) ? report : Buffer.from(report);
  if (data.length < 3) throw new Error(`Rapport HID trop court : ${data.length} octet(s).`);
  const channel = data[1];
  const length = data[2];
  return {
    channel,
    length,
    payload: data.subarray(3, 3 + length).toString("utf8"),
  };
}

// Réassemble le flux de rapports en lignes. Le périphérique termine chaque
// message par un saut de ligne ; un message long arrive fragmenté sur
// plusieurs rapports et n'est complet qu'au saut de ligne final. Chaque canal
// a son propre tampon : les journaux de débogage ne se mélangent pas au RPC.
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

// Reconstitue les messages JSON-RPC à partir des lignes du canal RPC. Un
// document peut lui-même arriver en plusieurs lignes (JSON indenté) : on
// accumule jusqu'à ce que l'analyse réussisse. Trois formes sur le canal :
//
//   - réponse :      { "result": …, "id": n }          (id aussi sous « i »)
//   - notification : { "method": "v.oai.hid", "params": … }  (aussi « m »/« p »)
//   - invalide :     ni id ni méthode — tampon abandonné
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
