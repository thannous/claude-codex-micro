// What the companion knows about terminal applications: how to recognise the
// one hosting a session, and how to bring that session's tab to the front.

import { spawnSync } from "node:child_process";
import path from "node:path";

/**
 * Host terminals recognised from the executable name reported by `ps`. Only
 * iTerm2 and Terminal are scriptable here (`driver`); the others are named so
 * the error message is actionable instead of generic.
 */
export const TERMINAL_APPS = Object.freeze([
  { basename: "iTerm2", name: "iTerm2", driver: "iterm" },
  { basename: "Terminal", name: "Terminal", driver: "terminal" },
  { basename: "ghostty", name: "Ghostty", driver: null },
  { basename: "wezterm-gui", name: "WezTerm", driver: null },
  { basename: "alacritty", name: "Alacritty", driver: null },
  { basename: "kitty", name: "kitty", driver: null },
  { basename: "warp", name: "Warp", driver: null },
  { basename: "hyper", name: "Hyper", driver: null },
  { basename: "tmux", name: "tmux", driver: null },
]);

/**
 * Parses `ps -Ao pid=,ppid=,tty=,comm=` into a table keyed by pid.
 *
 * @param {string} text Output of `ps`.
 * @returns {Map<number, {ppid: number, tty: string, comm: string}>} One entry per process.
 */
export function parseProcessTable(text) {
  const table = new Map();
  for (const line of text.split("\n")) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/);
    if (!match) continue;
    table.set(Number(match[1]), { ppid: Number(match[2]), tty: match[3], comm: match[4].trim() });
  }
  return table;
}

/**
 * Finds the terminal hosting a process by walking up its parents.
 *
 * @param {Map<number, {ppid: number, comm: string}>} table Process table.
 * @param {number} pid Process to start from.
 * @returns {{basename: string, name: string, driver: string|null}|null} The
 * first recognised ancestor, or null within ten generations.
 */
export function terminalFor(table, pid) {
  let current = table.get(pid);
  for (let depth = 0; current && depth < 10; depth += 1) {
    const basename = path.basename(current.comm).toLowerCase();
    const known = TERMINAL_APPS.find((app) => basename === app.basename.toLowerCase());
    if (known) return known;
    current = table.get(current.ppid);
  }
  return null;
}

function runAppleScript(script) {
  const result = spawnSync("osascript", ["-e", script], { encoding: "utf8", timeout: 15000 });
  const output = (result.stdout || result.stderr || "").trim();
  // An AppleEvent that times out — `-1712`, or `osascript` killed by the
  // timeout — almost always means Automation consent was not granted to the
  // calling shell: macOS does not always show the prompt and simply lets the
  // event expire. Confusing it with "window not found" sends you looking at the
  // terminal, which is not where the problem is.
  if (result.error?.code === "ETIMEDOUT" || result.signal || output.includes("-1712")) {
    return { ok: false, reason: "automation-consent", output };
  }
  return { ok: result.status === 0, output };
}

/**
 * Brings the terminal tab on a given tty to the front.
 *
 * The tty comes from `ps`: it is revalidated before being interpolated into
 * AppleScript rather than trusted for where it came from. Nothing is run for a
 * terminal that is not scriptable.
 *
 * The order of operations decides the outcome when windows overlap. `activate`
 * first raises the window that is already frontmost, and reordering afterwards
 * does not hold: the target stays under the stack. So the tab is selected, its
 * window brought to the front of the z-order, and the app activated last. Side
 * benefit: a `tty` that cannot be found no longer steals focus for nothing.
 *
 * @param {{tty: string, app?: string|null}} target Device path and terminal name.
 * @returns {{ok: boolean, output: string, reason?: "automation-consent"}}
 * `output` is `"ok"`, `"not-found"`, or the explanation of a failure.
 */
export function focusTerminal(target) {
  if (!/^\/dev\/tty[a-z0-9.]+$/i.test(target.tty)) {
    return { ok: false, output: `unexpected terminal path: ${target.tty}` };
  }
  const app = TERMINAL_APPS.find((candidate) => candidate.name === target.app);
  if (!app?.driver) {
    return {
      ok: false,
      output: `terminal not scriptable${target.app ? `: ${target.app}` : ""}. Slot is on ${target.tty}.`,
    };
  }

  if (app.driver === "iterm") {
    return runAppleScript(`tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is "${target.tty}" then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "not-found"`);
  }

  return runAppleScript(`tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is "${target.tty}" then
        set selected tab of w to t
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "not-found"`);
}
