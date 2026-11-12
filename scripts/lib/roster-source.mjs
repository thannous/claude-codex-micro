// Asks Claude Code who is alive: `claude agents --json`, once per configuration
// directory, plus one read of the process table to find each session's terminal.

import { spawnSync } from "node:child_process";
import { parseProcessTable, terminalFor } from "./terminals.mjs";
import { ttyDevice } from "./thread-slots.mjs";

/**
 * Reads the roster of one configuration directory.
 *
 * @param {string} binary Path of the `claude` binary.
 * @param {string|null} [configDir] Directory to list; `null` is the default
 * one, requested by leaving `CLAUDE_CONFIG_DIR` unset rather than by naming it.
 * @param {Record<string, string|undefined>} [env] Environment to run under.
 * @returns {object[]} Rows of `claude agents --json`.
 * @throws {Error} When the command fails or does not print an array.
 */
export function readRoster(binary, configDir = null, env = process.env) {
  const childEnv = { ...env };
  if (configDir === null) delete childEnv.CLAUDE_CONFIG_DIR;
  else childEnv.CLAUDE_CONFIG_DIR = configDir;
  const result = spawnSync(binary, ["agents", "--json"], { encoding: "utf8", timeout: 15000, env: childEnv });
  if (result.status !== 0) {
    throw new Error(`\`claude agents --json\` failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  const parsed = JSON.parse(result.stdout);
  if (!Array.isArray(parsed)) throw new Error("`claude agents --json` did not return an array.");
  return parsed;
}

/**
 * Reads one roster per configuration directory. A directory that fails does
 * not take the others down with it: its error is reported alongside, and
 * `mergeRosters` carries its sessions forward.
 *
 * @param {string} binary Path of the `claude` binary.
 * @param {Array<string|null>} configDirs Directories to query.
 * @param {Record<string, string|undefined>} [env] Environment to run under.
 * @returns {Array<{configDir: string|null, rows?: object[], error?: string}>} One result per directory.
 */
export function readRosters(binary, configDirs, env = process.env) {
  return configDirs.map((configDir) => {
    try {
      return { configDir, rows: readRoster(binary, configDir, env) };
    } catch (error) {
      return { configDir, error: error.message };
    }
  });
}

function processTable() {
  const result = spawnSync("ps", ["-Ao", "pid=,ppid=,tty=,comm="], { encoding: "utf8" });
  return parseProcessTable(result.status === 0 ? result.stdout : "");
}

/**
 * Adds to each row the session's tty and the terminal hosting it, from one
 * single read of the process table.
 *
 * @param {object[]} roster Rows with a `pid`.
 * @param {Map<number, {ppid: number, tty: string, comm: string}>} [table] Process table; read from `ps` when omitted.
 * @returns {object[]} Rows with `tty` (device path or null) and `terminalApp` (name or null).
 */
export function enrichRoster(roster, table = processTable()) {
  return roster.map((row) => ({
    ...row,
    tty: ttyDevice(table.get(row.pid)?.tty) ?? null,
    terminalApp: terminalFor(table, row.pid)?.name ?? null,
  }));
}
