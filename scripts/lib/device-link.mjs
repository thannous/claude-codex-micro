// Keeps the lighting bridge attached to a keyboard that comes and goes.
//
// Measured on 12 November 2026: the keyboard left USB while the bridge was
// running as a launchd agent. Every write then failed with "Device is
// disconnected", the bridge logged it every ten seconds — 1,746 times — and
// never noticed that its handle was dead. It did not exit, so launchd did not
// restart it, and plugging the keyboard back in would have changed nothing.
//
// The link has three states:
//
//   searching  no usable device: try to open one every `retryMs`;
//   connected  a session is open and handed to the bridge;
//   stopped    the bridge is shutting down.
//
// A failed call is how a lost device shows itself, so the bridge reports its
// failures to `lost`. Colours are volatile on the keyboard: `onConnect` is
// where the bridge puts them back.

import { defineMachine } from "./state-machine.mjs";

/** The three states of the link between the bridge and the keyboard. */
export const DEVICE_LINK_MACHINE = defineMachine({
  id: "device-link",
  initial: "searching",
  events: ["opened", "lost", "stop"],
  states: {
    searching: { on: { opened: "connected", stop: "stopped" } },
    connected: { on: { lost: "searching", stop: "stopped" } },
    stopped: {},
  },
});

/**
 * Error codes of `DeviceError` that mean the handle is dead. A timeout or an
 * RPC error is not one of them: the device answered late, or said no.
 */
export const LOSS_CODES = Object.freeze(["WRITE_FAILED", "DEVICE_DISCONNECTED", "DEVICE_ERROR"]);

/**
 * Opens a device session and reopens it whenever it is lost.
 *
 * @param {object} options Collaborators.
 * @param {() => Promise<{close: () => Promise<void>}>} options.open Opens a session; rejects while no device is usable.
 * @param {(session: object) => unknown|Promise<unknown>} [options.onConnect] Called with each new session.
 * @param {(error: Error) => void} [options.onMissing] Called once per search, with the first reason no device could be opened.
 * @param {(error: Error) => void} [options.onLost] Called when a connected device is lost.
 * @param {number} [options.retryMs] Delay between two attempts to open a device.
 * @returns {{start: () => void, stop: () => Promise<void>, session: () => object|null, state: () => string, lost: (error: unknown) => boolean}}
 * `session` is the open session or null; `lost` takes the error of a failed
 * call and returns whether it meant the device is gone, in which case the link
 * is already searching again.
 */
export function createDeviceLink({ open, onConnect = () => {}, onMissing = () => {}, onLost = () => {}, retryMs = 3000 }) {
  let state = DEVICE_LINK_MACHINE.initial;
  let session = null;
  let timer = null;
  let reported = false;
  let started = false;

  const send = (event) => {
    state = DEVICE_LINK_MACHINE.transition(state, event);
  };

  const search = async () => {
    timer = null;
    if (state !== "searching") return;
    let opened;
    try {
      opened = await open();
    } catch (error) {
      if (state !== "searching") return;
      if (!reported) {
        reported = true;
        onMissing(error);
      }
      timer = setTimeout(search, retryMs);
      return;
    }
    // Stopped while the open was under way: nobody will use this session.
    if (state !== "searching") {
      await opened.close().catch(() => {});
      return;
    }
    session = opened;
    reported = false;
    send("opened");
    try {
      await onConnect(opened);
    } catch (error) {
      // A device lost between the open and its first use is lost all the same.
      lost(error);
    }
  };

  const lost = (error) => {
    if (state !== "connected" || !LOSS_CODES.includes(error?.code)) return false;
    const dead = session;
    session = null;
    send("lost");
    onLost(error);
    void dead.close().catch(() => {});
    timer = setTimeout(search, retryMs);
    return true;
  };

  return {
    start() {
      if (started) return;
      started = true;
      void search();
    },
    async stop() {
      const open = session;
      session = null;
      send("stop");
      if (timer !== null) clearTimeout(timer);
      timer = null;
      if (open) await open.close().catch(() => {});
    },
    session: () => session,
    state: () => state,
    lost,
  };
}
