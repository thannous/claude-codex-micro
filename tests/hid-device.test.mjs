import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  DeviceSession,
  PRODUCT_ID,
  VENDOR_ID,
  VENDOR_USAGE_PAGE,
  isCodexVendorInterface,
} from "../scripts/lib/hid-device.mjs";
import {
  CHANNEL_DEBUG,
  REPORT_ID,
  REPORT_SIZE,
  decodeReport,
  encodeFrames,
} from "../scripts/lib/hid-frame.mjs";
import { METHODS } from "../scripts/lib/hid-lighting.mjs";

class FakeHandle extends EventEmitter {
  writes = [];
  writeError = null;
  closed = false;

  async write(frame) {
    if (this.writeError) throw this.writeError;
    this.writes.push(frame);
  }

  async close() {
    this.closed = true;
    this.emit("close");
  }
}

function emitRpc(handle, payload) {
  for (const frame of encodeFrames(`${JSON.stringify(payload)}\n`)) {
    handle.emit("data", frame);
  }
}

function emitDebug(handle, line) {
  const bytes = Buffer.from(`${line}\n`, "utf8");
  const frame = Buffer.alloc(REPORT_SIZE);
  frame[0] = REPORT_ID;
  frame[1] = CHANNEL_DEBUG;
  frame[2] = bytes.length;
  bytes.copy(frame, 3);
  handle.emit("data", frame);
}

async function waitFor(predicate, message = "condition") {
  const deadline = Date.now() + 500;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail(`Timed out waiting for ${message}`);
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

test("filters the vendor RPC collection without touching unrelated HID interfaces", () => {
  const match = {
    vendorId: VENDOR_ID,
    productId: PRODUCT_ID,
    usagePage: VENDOR_USAGE_PAGE,
  };
  assert.equal(isCodexVendorInterface(match), true);
  assert.equal(isCodexVendorInterface({ ...match, usagePage: 1 }), false);
  assert.equal(isCodexVendorInterface({ ...match, productId: 1 }), false);
  assert.equal(isCodexVendorInterface(null), false);
});

test("writes an RPC request and resolves the matching response", async () => {
  const handle = new FakeHandle();
  const session = new DeviceSession(handle);
  const response = session.call("sys.version", null, 41);

  await waitFor(() => handle.writes.length === 1, "the first HID write");
  const request = JSON.parse(decodeReport(handle.writes[0]).payload);
  assert.deepEqual(request, { method: "sys.version", params: null, id: 41 });

  emitRpc(handle, { result: { version: "0.4.1" }, id: 41 });
  assert.deepEqual(await response, { result: { version: "0.4.1" }, id: 41 });
  await session.close();
  assert.equal(handle.closed, true);
});

test("keeps exactly one request in flight and starts the next after its response", async () => {
  const handle = new FakeHandle();
  const session = new DeviceSession(handle);
  const first = session.call("first", null, 1);
  const second = session.call("second", null, 2);

  await waitFor(() => handle.writes.length === 1, "the first queued request");
  await new Promise((resolve) => setTimeout(resolve, 65));
  assert.equal(handle.writes.length, 1, "the second request must wait for the first response");

  emitRpc(handle, { result: "one", id: 1 });
  assert.equal((await first).result, "one");
  await waitFor(() => handle.writes.length === 2, "the second queued request");
  emitRpc(handle, { result: "two", id: 2 });
  assert.equal((await second).result, "two");
  await session.close();
});

test("dispatches debug lines, notifications, and foreign lighting writes", async () => {
  const handle = new FakeHandle();
  const debugLines = [];
  const foreignWrites = [];
  const notifications = [];
  const session = new DeviceSession(handle, {
    onDebugLine: (line) => debugLines.push(line),
    onForeignWrite: (method, message) => foreignWrites.push({ method, message }),
  });

  const oldHandler = () => notifications.push("old");
  const removeOld = session.onNotification(METHODS.notifyHid, oldHandler);
  const removeCurrent = session.onNotification(METHODS.notifyHid, (params) => {
    notifications.push(params);
  });
  removeOld();

  handle.emit("data", Buffer.alloc(2));
  emitDebug(handle, "ready");
  emitRpc(handle, { method: METHODS.notifyHid, params: { key: 3 } });
  emitRpc(handle, { method: METHODS.threadsLighting, result: { ok: true }, id: 999 });

  assert.deepEqual(debugLines, ["ready"]);
  assert.deepEqual(notifications, [{ key: 3 }]);
  assert.equal(foreignWrites.length, 1);
  assert.equal(foreignWrites[0].method, METHODS.threadsLighting);

  removeCurrent();
  emitRpc(handle, { method: METHODS.notifyHid, params: { key: 4 } });
  assert.deepEqual(notifications, [{ key: 3 }]);
  await session.close();
});

test("turns RPC, write, and device failures into stable DeviceError codes", async () => {
  const rpcHandle = new FakeHandle();
  const rpcSession = new DeviceSession(rpcHandle);
  const rpcFailure = assert.rejects(rpcSession.call("broken", null, 5), {
    name: "DeviceError",
    code: "RPC_ERROR",
  });
  await waitFor(() => rpcHandle.writes.length === 1, "the failing RPC request");
  emitRpc(rpcHandle, { error: { message: "bad request" }, id: 5 });
  await rpcFailure;
  await rpcSession.close();

  const writeHandle = new FakeHandle();
  writeHandle.writeError = new Error("write refused");
  const writeSession = new DeviceSession(writeHandle);
  await assert.rejects(writeSession.call("write", null, 6), {
    name: "DeviceError",
    code: "WRITE_FAILED",
  });
  await writeSession.close();

  const disconnectedHandle = new FakeHandle();
  const disconnectedSession = new DeviceSession(disconnectedHandle);
  const current = assert.rejects(disconnectedSession.call("current", null, 7), {
    name: "DeviceError",
    code: "DEVICE_ERROR",
  });
  const queued = assert.rejects(disconnectedSession.call("queued", null, 8), {
    name: "DeviceError",
    code: "DEVICE_ERROR",
  });
  await waitFor(() => disconnectedHandle.writes.length === 1, "the active request");
  disconnectedHandle.emit("error", new Error("transport failed"));
  await Promise.all([current, queued]);
  await disconnectedSession.close();
});
