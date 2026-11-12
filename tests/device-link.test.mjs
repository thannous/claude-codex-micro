import assert from "node:assert/strict";
import test from "node:test";
import { DEVICE_LINK_MACHINE, LOSS_CODES, createDeviceLink } from "../scripts/lib/device-link.mjs";
import { DeviceError } from "../scripts/lib/hid-device.mjs";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

// A keyboard that can be unplugged and plugged back in.
function fakeKeyboard() {
  const keyboard = { present: true, opened: 0, sessions: [] };
  keyboard.open = async () => {
    if (!keyboard.present) throw new DeviceError("DEVICE_NOT_FOUND", "Codex Micro not found");
    keyboard.opened += 1;
    const session = { id: keyboard.opened, closed: false, close: async () => { session.closed = true; } };
    keyboard.sessions.push(session);
    return session;
  };
  return keyboard;
}

test("the link has three states, and a stopped link stays stopped", () => {
  assert.deepEqual(DEVICE_LINK_MACHINE.states, ["searching", "connected", "stopped"]);
  assert.deepEqual(DEVICE_LINK_MACHINE.unreachable(), []);
  for (const event of DEVICE_LINK_MACHINE.events) {
    assert.equal(DEVICE_LINK_MACHINE.transition("stopped", event), "stopped", event);
  }
  assert.equal(DEVICE_LINK_MACHINE.transition("searching", "lost"), "searching");
});

test("a keyboard that is there is opened once and handed over", async (t) => {
  const keyboard = fakeKeyboard();
  const connected = [];
  const link = createDeviceLink({ open: keyboard.open, onConnect: (session) => connected.push(session.id), retryMs: 1 });
  t.after(() => link.stop());

  assert.equal(link.state(), "searching");
  assert.equal(link.session(), null);
  link.start();
  link.start();
  await tick();
  assert.equal(link.state(), "connected");
  assert.deepEqual(connected, [1]);
  assert.equal(link.session().id, 1);
  assert.equal(keyboard.opened, 1, "starting twice opens once");
});

test("with no keyboard the link waits, says so once, and connects when it appears", async (t) => {
  const keyboard = fakeKeyboard();
  keyboard.present = false;
  const missing = [];
  const connected = [];
  const link = createDeviceLink({
    open: keyboard.open,
    onMissing: (error) => missing.push(error.code),
    onConnect: (session) => connected.push(session.id),
    retryMs: 1,
  });
  t.after(() => link.stop());

  link.start();
  await tick(20);
  assert.equal(link.state(), "searching");
  assert.deepEqual(missing, ["DEVICE_NOT_FOUND"], "many attempts, one message");

  keyboard.present = true;
  await tick(20);
  assert.equal(link.state(), "connected");
  assert.deepEqual(connected, [1]);
});

// The regression this module exists for: 1,746 failed writes on a dead handle,
// and a bridge that would not have seen the keyboard come back.
test("a keyboard unplugged mid-run is dropped, then picked up again when it returns", async (t) => {
  const keyboard = fakeKeyboard();
  const events = [];
  const link = createDeviceLink({
    open: keyboard.open,
    onConnect: (session) => events.push(`connect ${session.id}`),
    onLost: (error) => events.push(`lost ${error.code}`),
    onMissing: () => events.push("missing"),
    retryMs: 1,
  });
  t.after(() => link.stop());
  link.start();
  await tick();

  keyboard.present = false;
  const failure = new DeviceError("WRITE_FAILED", "Cannot write to hid device: Device is disconnected");
  assert.equal(link.lost(failure), true);
  assert.equal(link.state(), "searching");
  assert.equal(link.session(), null);
  assert.equal(keyboard.sessions[0].closed, true, "the dead handle is closed");
  assert.equal(link.lost(failure), false, "a second failure of the same loss is not a new loss");

  await tick(20);
  assert.equal(link.state(), "searching");
  keyboard.present = true;
  await tick(20);
  assert.equal(link.state(), "connected");
  assert.equal(link.session().id, 2);
  assert.deepEqual(events, ["connect 1", "lost WRITE_FAILED", "missing", "connect 2"]);
});

test("a late or refused answer is not a lost keyboard", async (t) => {
  const keyboard = fakeKeyboard();
  const link = createDeviceLink({ open: keyboard.open, retryMs: 1 });
  t.after(() => link.stop());
  link.start();
  await tick();

  for (const code of ["TIMEOUT", "RPC_ERROR"]) {
    assert.equal(link.lost(new DeviceError(code, code)), false, code);
  }
  assert.equal(link.lost(new Error("something else")), false);
  assert.equal(link.lost(undefined), false);
  assert.equal(link.state(), "connected");
  assert.deepEqual(LOSS_CODES, ["WRITE_FAILED", "DEVICE_DISCONNECTED", "DEVICE_ERROR"]);
});

test("a keyboard lost before its first use is lost all the same", async (t) => {
  const keyboard = fakeKeyboard();
  let attempts = 0;
  const link = createDeviceLink({
    open: keyboard.open,
    onConnect: async () => {
      attempts += 1;
      if (attempts === 1) throw new DeviceError("DEVICE_DISCONNECTED", "Session closed.");
    },
    retryMs: 1,
  });
  t.after(() => link.stop());
  link.start();
  await tick(20);
  assert.equal(attempts, 2);
  assert.equal(link.state(), "connected");
  assert.equal(keyboard.sessions[0].closed, true);
});

test("stopping closes the session, cancels the search, and is final", async () => {
  const keyboard = fakeKeyboard();
  const link = createDeviceLink({ open: keyboard.open, retryMs: 1 });
  link.start();
  await tick();
  await link.stop();
  assert.equal(link.state(), "stopped");
  assert.equal(link.session(), null);
  assert.equal(keyboard.sessions[0].closed, true);

  const absent = fakeKeyboard();
  absent.present = false;
  const searching = createDeviceLink({ open: absent.open, retryMs: 1 });
  searching.start();
  await tick();
  await searching.stop();
  absent.present = true;
  await tick(20);
  assert.equal(absent.opened, 0, "no attempt after stop");
  searching.start();
  await tick();
  assert.equal(searching.state(), "stopped");
});

test("a session opened while the link was being stopped is closed, not leaked", async () => {
  let release;
  const session = { closed: false, close: async () => { session.closed = true; } };
  const link = createDeviceLink({ open: () => new Promise((resolve) => { release = () => resolve(session); }), retryMs: 1 });
  link.start();
  await tick();
  await link.stop();
  release();
  await tick();
  assert.equal(session.closed, true);
  assert.equal(link.session(), null);
});
