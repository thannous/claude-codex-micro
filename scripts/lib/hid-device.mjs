// Transport HID du Codex Micro au-dessus de node-hid (dépendance optionnelle,
// chargée paresseusement : le reste du dépôt fonctionne sans elle).
//
// Réimplémentation originale d'après le format observé et documenté dans
// docs/research/hid-lighting-protocol.md :
//
//   - interface vendeur : VID 0x303a, usage page 0xFF00 ;
//   - ouverture non exclusive sur macOS : les lectures sont diffusées à tous
//     les lecteurs, les écritures se disputent (dernière écriture gagnante) ;
//   - une requête en vol à la fois, 50 ms de pause entre appels, 10 s de
//     garde-fou par réponse ;
//   - une réponse dont l'identifiant n'est pas le nôtre est le signe qu'un
//     autre écrivain (l'app ChatGPT) vient de pousser : elle sert de
//     déclencheur de réapplication au mode --hold.

import {
  CHANNEL_DEBUG,
  CHANNEL_RPC,
  buildRequest,
  createLineAssembler,
  createRpcAccumulator,
  createRpcId,
  encodeFrames,
} from "./hid-frame.mjs";
import { METHODS } from "./hid-lighting.mjs";

export const VENDOR_ID = 0x303a;
export const PRODUCT_ID = 0x8360;
export const VENDOR_USAGE_PAGE = 0xff00;

const CALL_TIMEOUT_MS = 10000;
const CALL_SPACING_MS = 50;

export class DeviceError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "DeviceError";
    this.code = code;
  }
}

// Import paresseux : node-hid est une optionalDependency native. Le message
// d'erreur doit dire quoi faire, pas seulement que ça manque.
export async function loadHid() {
  try {
    return await import("node-hid");
  } catch {
    throw new DeviceError(
      "HID_UNAVAILABLE",
      "node-hid est absente : lancer `npm install` (optionalDependencies) pour activer le pilotage HID.",
    );
  }
}

// Énumère les interfaces vendeur du Codex Micro. Le clavier expose plusieurs
// collections HID ; seule la page d'usage 0xFF00 transporte le canal RPC.
export async function listInterfaces() {
  const hid = await loadHid();
  return hid
    .devices()
    .filter(
      (device) =>
        device.vendorId === VENDOR_ID &&
        device.productId === PRODUCT_ID &&
        device.usagePage === VENDOR_USAGE_PAGE,
    );
}

async function openHandle(path) {
  const hid = await loadHid();
  // Non exclusif sur macOS : coexister avec Input et l'app ChatGPT, qui
  // tiennent le même périphérique. Ailleurs, ouverture standard.
  if (process.platform === "darwin") return hid.HIDAsync.open(path, { nonExclusive: true });
  return hid.HIDAsync.open(path);
}

// Session RPC : file séquentielle cadencée, corrélation des réponses par
// identifiant, distribution des notifications, détection des écritures
// étrangères. Une session = une requête en vol, comme le firmware l'attend.
export class DeviceSession {
  #handle;
  #assembler = createLineAssembler();
  #accumulator = createRpcAccumulator();
  #resolvers = new Map();
  #notifyHandlers = new Map();
  #onForeignWrite;
  #onDebugLine;
  #queue = [];
  #running = false;
  #closed = false;

  constructor(handle, { onForeignWrite, onDebugLine } = {}) {
    this.#handle = handle;
    this.#onForeignWrite = onForeignWrite ?? null;
    this.#onDebugLine = onDebugLine ?? null;
    handle.on("data", (data) => this.#dispatch(data));
    handle.on("error", (error) => this.#failAll(new DeviceError("DEVICE_ERROR", error.message)));
    handle.on("close", () => {
      this.#closed = true;
      this.#failAll(new DeviceError("DEVICE_DISCONNECTED", "Périphérique déconnecté."));
    });
  }

  static async open({ path, ...options } = {}) {
    const target = path ?? (await listInterfaces()).at(0)?.path;
    if (!target) {
      throw new DeviceError(
        "DEVICE_NOT_FOUND",
        "Codex Micro introuvable sur l'interface vendeur (VID 0x303a, usage 0xFF00). Vérifier la connexion, puis `list`.",
      );
    }
    return new DeviceSession(await openHandle(target), options);
  }

  onNotification(method, handler) {
    this.#notifyHandlers.set(method, handler);
    return () => this.#notifyHandlers.delete(method);
  }

  // Enfile un appel et attend sa réponse. Les tâches s'exécutent une par une
  // avec CALL_SPACING_MS de pause, le firmware traitant les commandes au
  // compte-goutte.
  call(method, params = null, id = createRpcId()) {
    return new Promise((resolve, reject) => {
      this.#queue.push({ method, params, id, resolve, reject });
      void this.#drain();
    });
  }

  async #drain() {
    if (this.#running) return;
    this.#running = true;
    try {
      let task;
      while ((task = this.#queue.shift())) {
        await this.#run(task);
        await new Promise((resolve) => setTimeout(resolve, CALL_SPACING_MS));
      }
    } finally {
      this.#running = false;
    }
  }

  async #run({ method, params, id, resolve, reject }) {
    if (this.#closed) return reject(new DeviceError("DEVICE_DISCONNECTED", "Session fermée."));
    const key = String(id);
    const timer = setTimeout(() => {
      this.#resolvers.delete(key);
      reject(new DeviceError("TIMEOUT", `Pas de réponse à ${method} en ${CALL_TIMEOUT_MS / 1000} s.`));
    }, CALL_TIMEOUT_MS);
    this.#resolvers.set(key, { resolve, reject, timer });
    try {
      for (const frame of encodeFrames(buildRequest({ method, params, id }))) {
        await this.#handle.write(frame);
      }
    } catch (error) {
      clearTimeout(timer);
      this.#resolvers.delete(key);
      reject(new DeviceError("WRITE_FAILED", error.message));
    }
  }

  #dispatch(data) {
    let lines;
    try {
      lines = this.#assembler(data);
    } catch {
      return; // Rapport malformé : ignoré, le flux suivant resynchronisera.
    }
    for (const { channel, line } of lines) {
      if (channel === CHANNEL_DEBUG) {
        this.#onDebugLine?.(line);
        continue;
      }
      if (channel !== CHANNEL_RPC) continue;
      const message = this.#accumulator(line);
      if (!message) continue;
      if (message.kind === "response") this.#resolve(message);
      else if (message.kind === "notification") this.#notifyHandlers.get(message.method)?.(message.params);
      // Les messages sans id ni méthode sont abandonnés par l'accumulateur.
    }
  }

  #resolve(message) {
    const pending = this.#resolvers.get(message.id);
    if (pending) {
      this.#resolvers.delete(message.id);
      clearTimeout(pending.timer);
      if (message.parsed.error) {
        pending.reject(new DeviceError("RPC_ERROR", message.parsed.error.message ?? "Erreur RPC."));
      } else {
        pending.resolve(message.parsed);
      }
      return;
    }
    // Réponse orpheline sur une méthode d'éclairage : un autre écrivain vient
    // de pousser sa configuration. C'est le seul signal fiable de
    // coexistence, et il est gratuit — les rapports d'entrée sont diffusés à
    // tous les lecteurs.
    if (message.method === METHODS.threadsLighting || message.method === METHODS.rgbConfig) {
      this.#onForeignWrite?.(message.method, message.parsed);
    }
  }

  #failAll(error) {
    for (const [, pending] of this.#resolvers) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.#resolvers.clear();
    for (const task of this.#queue.splice(0)) task.reject(error);
  }

  async close() {
    this.#closed = true;
    this.#failAll(new DeviceError("DEVICE_DISCONNECTED", "Session fermée."));
    try {
      await this.#handle.close();
    } catch {
      // Fermeture déjà effective côté pile HID.
    }
  }
}
