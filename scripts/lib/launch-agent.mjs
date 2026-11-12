// launchd user agents for the two watchers. Pure: builds property lists and
// names, and leaves writing files and calling `launchctl` to scripts/service.mjs.
//
// Two agents rather than one, because the two halves fail independently: the
// companion needs only `claude`, the lighting bridge needs the keyboard. A pad
// that is unplugged must not stop slots.json from being kept up to date.

import path from "node:path";

/** Reverse-DNS prefix shared by both agents; also the uninstall selector. */
export const LABEL_PREFIX = "io.github.thannous.claude-codex-micro";

/**
 * The two watchers, in start order.
 *
 * `--hold` reapplies the colours when another writer pushes its own, and
 * `--focus` turns an Agent key press into navigation to its session.
 */
export const AGENTS = Object.freeze([
  Object.freeze({ name: "thread-status", script: "scripts/thread-status.mjs", args: Object.freeze(["watch"]) }),
  Object.freeze({ name: "lighting", script: "scripts/lighting.mjs", args: Object.freeze(["watch", "--hold", "--focus"]) }),
]);

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function plistValue(value, indent) {
  const pad = "  ".repeat(indent);
  if (value === true || value === false) return `${pad}<${value}/>`;
  if (Number.isInteger(value)) return `${pad}<integer>${value}</integer>`;
  if (typeof value === "string") return `${pad}<string>${escapeXml(value)}</string>`;
  if (Array.isArray(value)) {
    return [`${pad}<array>`, ...value.map((item) => plistValue(item, indent + 1)), `${pad}</array>`].join("\n");
  }
  if (value && typeof value === "object") {
    const lines = [`${pad}<dict>`];
    for (const [key, item] of Object.entries(value)) {
      lines.push(`${pad}  <key>${escapeXml(key)}</key>`, plistValue(item, indent + 1));
    }
    lines.push(`${pad}</dict>`);
    return lines.join("\n");
  }
  throw new Error(`Unsupported property list value: ${value}`);
}

/**
 * Serialises a plain object to an XML property list.
 *
 * @param {Record<string, unknown>} dict Strings, integers, booleans, arrays and nested objects.
 * @returns {string} Complete property list document.
 * @throws {Error} When a value has no property list representation.
 */
export function toPlist(dict) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
    '<plist version="1.0">',
    plistValue(dict, 0),
    "</plist>",
    "",
  ].join("\n");
}

/**
 * Describes one launchd agent: where its property list goes and what it holds.
 *
 * launchd starts agents with a minimal environment — no shell profile, a bare
 * `PATH` — so everything the watcher resolves at run time is pinned here: the
 * Node binary by absolute path, the `claude` binary through
 * `CLAUDE_CODE_EXECPATH`, and the state and profile variables of the installing
 * shell. `KeepAlive` restarts a watcher that exits (a crash, `slots.json` not
 * written yet); `ThrottleInterval` keeps that from becoming a spin. An unplugged
 * keyboard is not such an exit: the lighting bridge waits for it.
 *
 * @param {object} input Installation facts.
 * @param {{name: string, script: string, args: readonly string[]}} input.agent One of {@link AGENTS}.
 * @param {string} input.repoRoot Absolute path of the repository.
 * @param {string} input.nodePath Absolute path of the Node binary.
 * @param {string} input.home Home directory.
 * @param {string|null} [input.claudePath] Absolute path of the `claude` binary.
 * @param {Record<string, string|undefined>} [input.env] Environment to copy the path contract from.
 * @returns {{label: string, plistPath: string, logPath: string, plist: string}} Agent description.
 * @throws {Error} When a path that launchd needs absolute is not.
 */
export function describeAgent({ agent, repoRoot, nodePath, home, claudePath = null, env = {} }) {
  for (const [name, value] of Object.entries({ repoRoot, nodePath, home })) {
    if (typeof value !== "string" || !path.isAbsolute(value)) {
      throw new Error(`launchd needs an absolute ${name}: ${value}`);
    }
  }
  const label = `${LABEL_PREFIX}.${agent.name}`;
  const logPath = path.join(home, "Library", "Logs", "claude-codex-micro", `${agent.name}.log`);

  const searchPath = [path.dirname(nodePath)];
  if (claudePath) searchPath.push(path.dirname(claudePath));
  searchPath.push("/usr/bin", "/bin", "/usr/sbin", "/sbin");

  const environment = { PATH: [...new Set(searchPath)].join(":"), HOME: home };
  if (claudePath) environment.CLAUDE_CODE_EXECPATH = claudePath;
  for (const name of ["CLAUDE_THREAD_STATUS_DIR", "CLAUDE_THREAD_STATUS_CONFIG_DIRS"]) {
    if (env[name]) environment[name] = env[name];
  }

  return {
    label,
    plistPath: path.join(home, "Library", "LaunchAgents", `${label}.plist`),
    logPath,
    plist: toPlist({
      Label: label,
      ProgramArguments: [nodePath, path.join(repoRoot, agent.script), ...agent.args],
      WorkingDirectory: repoRoot,
      EnvironmentVariables: environment,
      RunAtLoad: true,
      KeepAlive: true,
      ThrottleInterval: 10,
      ProcessType: "Background",
      StandardOutPath: logPath,
      StandardErrorPath: logPath,
    }),
  };
}
