// Which Claude Code configuration directories to ask for a roster.
//
// `claude agents --json` only lists the sessions of the configuration directory
// it runs under (`CLAUDE_CONFIG_DIR`, or `~/.claude` when unset). Measured on
// 2.1.322 with three profiles on one machine: the default directory listed five
// sessions, and each profile directory listed only its own. A companion that
// asks once therefore sees one profile and shows the others' keys as dark.
//
// The module is pure: it resolves and merges, and leaves spawning to the caller.

import os from "node:os";
import path from "node:path";

/** Upper bound on remembered directories: a profile set, not a history. */
export const MAX_CONFIG_DIRS = 16;

/**
 * Normalises one configuration directory. The default directory is represented
 * by `null`, because that is how it is requested: by leaving the variable unset.
 *
 * @param {unknown} dir Candidate directory, absolute or `~`-relative.
 * @param {string} [home] Home directory used to resolve `~` and the default.
 * @returns {string|null|undefined} Absolute path, `null` for the default
 * directory, or `undefined` when the candidate is unusable.
 */
export function normalizeConfigDir(dir, home = os.homedir()) {
  if (dir === null || dir === undefined) return null;
  if (typeof dir !== "string") return undefined;
  const trimmed = dir.trim();
  if (!trimmed) return null;
  const expanded = trimmed === "~" || trimmed.startsWith("~/") ? path.join(home, trimmed.slice(1)) : trimmed;
  if (!path.isAbsolute(expanded)) return undefined;
  const resolved = path.resolve(expanded);
  return resolved === path.join(home, ".claude") ? null : resolved;
}

/**
 * Builds the ordered, de-duplicated list of directories to query: the default
 * first, then the caller's own, then the explicit list, then those learnt from
 * the hook journal.
 *
 * @param {object} [input] Sources of directories.
 * @param {Record<string, string|undefined>} [input.env] Process environment.
 * @param {Array<string|null>} [input.known] Directories recorded by the hooks.
 * @param {string} [input.home] Home directory.
 * @returns {Array<string|null>} Directories to query; `null` is the default.
 */
export function collectConfigDirs({ env = process.env, known = [], home = os.homedir() } = {}) {
  const explicit = (env.CLAUDE_THREAD_STATUS_CONFIG_DIRS ?? "").split(path.delimiter).filter(Boolean);
  const ordered = [null, env.CLAUDE_CONFIG_DIR, ...explicit, ...known];
  const seen = new Set();
  const result = [];
  for (const candidate of ordered) {
    const normalized = normalizeConfigDir(candidate, home);
    if (normalized === undefined || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
    if (result.length >= MAX_CONFIG_DIRS) break;
  }
  return result;
}

/**
 * Merges per-directory rosters into one. Each row is tagged with the directory
 * that listed it; a session listed twice keeps its first occurrence.
 *
 * A directory whose query failed must not make its sessions look closed: the
 * sessions last seen there are carried forward, without a `status`, until the
 * directory answers again.
 *
 * @param {Array<{configDir: string|null, rows?: object[], error?: string}>} results
 * One entry per queried directory.
 * @param {Array<{sessionId: string, state?: string, configDir?: string|null}|null>} [slots]
 * Current slot entries, used to carry sessions across a failed query.
 * @returns {{rows: object[], errors: string[]}} Merged roster and one message per failure.
 */
export function mergeRosters(results, slots = []) {
  const rows = [];
  const errors = [];
  const seen = new Set();
  const add = (row) => {
    if (typeof row?.sessionId !== "string" || seen.has(row.sessionId)) return;
    seen.add(row.sessionId);
    rows.push(row);
  };

  for (const result of results) {
    if (Array.isArray(result.rows)) {
      for (const row of result.rows) add({ ...row, configDir: result.configDir });
      continue;
    }
    errors.push(`${result.configDir ?? "default configuration"}: ${result.error ?? "no roster"}`);
    for (const entry of slots) {
      if (!entry || entry.state === "ended" || (entry.configDir ?? null) !== result.configDir) continue;
      add({ sessionId: entry.sessionId, configDir: result.configDir });
    }
  }
  return { rows, errors };
}
