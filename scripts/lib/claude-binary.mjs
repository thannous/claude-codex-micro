// Finds the `claude` binary, for the companion that runs it and for the launchd
// agents that must be told where it is.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function launcherOnPath() {
  const found = spawnSync("/bin/sh", ["-c", "command -v claude"], { encoding: "utf8" });
  return found.status === 0 ? found.stdout.trim().split("\n")[0] : "";
}

function bundledVersions(home) {
  const bundled = path.join(home, "Library", "Application Support", "Claude", "claude-code");
  try {
    return readdirSync(bundled)
      .sort()
      .reverse()
      .map((version) => path.join(bundled, version, "claude.app", "Contents", "MacOS", "claude"));
  } catch {
    // Not bundled with Claude Desktop: the other candidates are enough.
    return [];
  }
}

/**
 * Resolves the `claude` binary to run.
 *
 * The launcher on `PATH` comes first: it survives Claude Code updates, whereas
 * `CLAUDE_CODE_EXECPATH` names one installed version and dies with it. The
 * copies bundled with Claude Desktop come last, newest first.
 *
 * @param {object} [options] Lookup sources, replaceable in tests.
 * @param {Record<string, string|undefined>} [options.env] Process environment.
 * @param {string} [options.home] Home directory.
 * @param {() => string} [options.which] Returns the launcher found on `PATH`, or an empty string.
 * @param {(candidate: string) => boolean} [options.exists] File existence check.
 * @returns {string|null} Absolute path of an existing binary, or null.
 */
export function resolveClaudeBinary({
  env = process.env,
  home = os.homedir(),
  which = launcherOnPath,
  exists = existsSync,
} = {}) {
  const candidates = [which(), env.CLAUDE_CODE_EXECPATH, ...bundledVersions(home)];
  return candidates.find((candidate) => candidate && exists(candidate)) ?? null;
}
