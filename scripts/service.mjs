#!/usr/bin/env node

// Keeps the two watchers running across logins, as launchd user agents.
//
// Without this, `thread-status watch` and `lighting watch` live in two terminal
// tabs and the keys go dark the first time one is closed. It installs nothing
// outside `~/Library/LaunchAgents` and `~/Library/Logs/claude-codex-micro`, and
// `uninstall` removes both agents again. Nothing is written to the keyboard.

import { spawnSync } from "node:child_process";
import { existsSync, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveClaudeBinary } from "./lib/claude-binary.mjs";
import { redactHome } from "./lib/input-export.mjs";
import { AGENTS, describeAgent } from "./lib/launch-agent.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function usage() {
  return `Usage: node scripts/service.mjs <command>

Commands
  install [--dry-run]   write and start the two launchd agents
                        (--dry-run prints the property lists and changes nothing)
  uninstall             stop and remove them
  status                show whether each agent is loaded and running

The agents inherit CLAUDE_THREAD_STATUS_DIR and CLAUDE_THREAD_STATUS_CONFIG_DIRS
from the shell that runs \`install\`.
`;
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function descriptions() {
  const claudePath = resolveClaudeBinary();
  return AGENTS.map((agent) =>
    describeAgent({
      agent,
      repoRoot,
      nodePath: process.execPath,
      home: os.homedir(),
      claudePath,
      env: process.env,
    }),
  );
}

const domain = () => `gui/${process.getuid()}`;

function launchctl(...args) {
  return spawnSync("launchctl", args, { encoding: "utf8", timeout: 20000 });
}

// `launchctl print` is the only way to tell "loaded" from "running": the pid
// line is absent while launchd is waiting out the throttle interval.
function agentState(label) {
  const printed = launchctl("print", `${domain()}/${label}`);
  if (printed.status !== 0) return { loaded: false };
  const pid = printed.stdout.match(/^\s*pid = (\d+)/m)?.[1];
  const exit = printed.stdout.match(/^\s*last exit code = (.+)$/m)?.[1];
  return { loaded: true, pid: pid ? Number(pid) : null, lastExit: exit ?? null };
}

function pause(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// `bootout` returns before launchd has torn the job down — the lighting bridge
// still has the keyboard open — and a `bootstrap` in that window fails with
// "5: Input/output error". Wait for the label to disappear, then allow a few
// attempts for the case where it lingers past the wait.
function replaceAgent(agent) {
  launchctl("bootout", `${domain()}/${agent.label}`);
  const deadline = Date.now() + 10000;
  while (agentState(agent.label).loaded && Date.now() < deadline) pause(200);

  let started;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt > 0) pause(1000);
    started = launchctl("bootstrap", domain(), agent.plistPath);
    if (started.status === 0) break;
  }
  return started;
}

async function install(dryRun) {
  if (process.platform !== "darwin") return fail("launchd agents are macOS only.");
  const agents = descriptions();

  if (dryRun) {
    for (const agent of agents) process.stdout.write(`# ${redactHome(agent.plistPath)}\n${agent.plist}\n`);
    return undefined;
  }

  for (const agent of agents) {
    await fs.mkdir(path.dirname(agent.plistPath), { recursive: true });
    await fs.mkdir(path.dirname(agent.logPath), { recursive: true });
    // Replacing a loaded agent in place leaves launchd running the old
    // definition: unload first, and ignore "not loaded".
    await fs.writeFile(agent.plistPath, agent.plist);
    const started = replaceAgent(agent);
    if (started.status !== 0) {
      return fail(`Could not start ${agent.label}: ${(started.stderr || started.stdout).trim()}`);
    }
    process.stdout.write(`✔ ${agent.label}\n    ${redactHome(agent.plistPath)}\n    log: ${redactHome(agent.logPath)}\n`);
  }
  process.stdout.write("Both watchers now start at login. Check them with `node scripts/service.mjs status`.\n");
  return undefined;
}

async function uninstall() {
  for (const agent of descriptions()) {
    launchctl("bootout", `${domain()}/${agent.label}`);
    await fs.rm(agent.plistPath, { force: true });
    process.stdout.write(`✔ removed ${agent.label}\n`);
  }
  process.stdout.write("Logs are kept under ~/Library/Logs/claude-codex-micro.\n");
}

function status() {
  let healthy = true;
  for (const agent of descriptions()) {
    const state = agentState(agent.label);
    const installed = existsSync(agent.plistPath);
    const ok = state.loaded && state.pid !== null;
    healthy = healthy && ok;
    const detail = !installed
      ? "not installed"
      : !state.loaded
        ? "installed but not loaded"
        : state.pid !== null
          ? `running, pid ${state.pid}`
          : `loaded but not running (last exit: ${state.lastExit ?? "unknown"}) — see ${redactHome(agent.logPath)}`;
    process.stdout.write(`  ${ok ? "✔" : "✘"} ${agent.label}: ${detail}\n`);
  }
  if (!healthy) process.exitCode = 1;
}

async function main(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(usage());
    return undefined;
  }
  if (command === "install") return install(rest.includes("--dry-run"));
  if (command === "uninstall") return uninstall();
  if (command === "status") return status();
  return fail(`Unknown command: ${command}\n\n${usage()}`);
}

main(process.argv.slice(2)).catch((error) => {
  fail(error.stack ?? String(error));
});
