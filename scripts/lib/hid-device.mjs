// Codex Micro HID transport on top of node-hid (an optional dependency, loaded
// lazily: the rest of the repository works without it).
//
// Original reimplementation from the format observed and documented in
// docs/research/hid-lighting-protocol.md:
//
//   - vendor interface: VID 0x303a, usage page 0xFF00;
//   - non-exclusive open on macOS: reads are broadcast to every reader, writes
//     compete (last write wins);
//   - one request in flight at a time, 50ms of spacing between calls, a 10s
//     guard per response;
//   - a response whose id is not ours is the sign that another writer (the
//     ChatGPT app) has just pushed: it serves as the reapply trigger in --hold
//     mode.

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
export const CALL_SPACING_MS = 50;

export class DeviceError extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.name = "DeviceError";
    this.code = code;
  }
}

// Lazy import: node-hid is a native optionalDependency. The error message has to
// say what to do, not only that it is missing.
export async function loadHid() {
  try {
    return await import("node-hid");
  } catch {
    throw new DeviceError(
      "HID_UNAVAILABLE",
      "node-hid is missing: run `npm install` (optionalDependencies) to enable HID control.",
    );
  }
}

// Lists the Codex Micro vendor interfaces. The keyboard exposes several HID
// collections; only usage page 0xFF00 carries the RPC channel.
export function isCodexVendorInterface(device) {
  return (
    device?.vendorId === VENDOR_ID &&
    device?.productId === PRODUCT_ID &&
    device?.usagePage === VENDOR_USAGE_PAGE
  );
}

export async function listInterfaces() {
  const hid = await loadHid();
  return hid.devices().filter(isCodexVendorInterface);
}

async function openHandle(path) {
  const hid = await loadHid();
  // Non-exclusive on macOS: coexist with Input and the ChatGPT app, which hold
  // the same device. Elsewhere, a standard open.
  if (process.platform === "darwin") return hid.HIDAsync.open(path, { nonExclusive: true });
  return hid.HIDAsync.open(path);
}

// RPC session: paced sequential queue, responses correlated by id, notifications
// dispatched, foreign writes detected. One session = one request in flight, the
// way the firmware expects it.
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
  #lastCallStartedAt = 0;

  constructor(handle, { onForeignWrite, onDebugLine } = {}) {
    this.#handle = handle;
    this.#onForeignWrite = onForeignWrite ?? null;
    this.#onDebugLine = onDebugLine ?? null;
    handle.on("data", (data) => this.#dispatch(data));
    handle.on("error", (error) => this.#failAll(new DeviceError("DEVICE_ERROR", error.message)));
    handle.on("close", () => {
      this.#closed = true;
      this.#failAll(new DeviceError("DEVICE_DISCONNECTED", "Device disconnected."));
    });
  }

  static async open({ path, ...options } = {}) {
    const target = path ?? (await listInterfaces()).at(0)?.path;
    if (!target) {
      throw new DeviceError(
        "DEVICE_NOT_FOUND",
        "Codex Micro not found on the vendor interface (VID 0x303a, usage 0xFF00). Check the connection, then run `list`.",
      );
    }
    return new DeviceSession(await openHandle(target), options);
  }

  onNotification(method, handler) {
    this.#notifyHandlers.set(method, handler);
    return () => {
      if (this.#notifyHandlers.get(method) === handler) this.#notifyHandlers.delete(method);
    };
  }

  // Queues a call and waits for its response. Tasks run one at a time with
  // CALL_SPACING_MS of spacing, since the firmware handles commands in a
  // trickle.
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
        const remainingSpacing =
          CALL_SPACING_MS - (Date.now() - this.#lastCallStartedAt);
        if (remainingSpacing > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingSpacing));
        }
        try {
          task.resolve(await this.#run(task));
        } catch (error) {
          task.reject(error);
        }
      }
    } finally {
      this.#running = false;
    }
  }

  async #run({ method, params, id }) {
    if (this.#closed) throw new DeviceError("DEVICE_DISCONNECTED", "Session closed.");
    this.#lastCallStartedAt = Date.now();
    const key = String(id);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#resolvers.delete(key);
        reject(new DeviceError("TIMEOUT", `No answer to ${method} within ${CALL_TIMEOUT_MS / 1000}s.`));
      }, CALL_TIMEOUT_MS);
      this.#resolvers.set(key, { resolve, reject, timer });

      const write = async () => {
        for (const frame of encodeFrames(buildRequest({ method, params, id }))) {
          await this.#handle.write(frame);
        }
      };
      void write().catch((error) => {
        clearTimeout(timer);
        this.#resolvers.delete(key);
        reject(new DeviceError("WRITE_FAILED", error.message));
      });
    });
  }

  #dispatch(data) {
    let lines;
    try {
      lines = this.#assembler(data);
    } catch {
      return; // Malformed report: ignored; the next valid report resynchronizes the stream.
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
      // Messages with neither id nor method are dropped by the accumulator.
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
    // Orphan response on a lighting method: another writer has just pushed its
    // configuration. This is the only reliable coexistence signal, and it is
    // free — input reports are broadcast to every reader.
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
    this.#failAll(new DeviceError("DEVICE_DISCONNECTED", "Session closed."));
    try {
      await this.#handle.close();
    } catch {
      // Already closed on the HID stack side.
    }
  }
}
