import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { AGENTS, LABEL_PREFIX, describeAgent, toPlist } from "../scripts/lib/launch-agent.mjs";

const base = {
  repoRoot: "/Users/someone/Projects/claude-codex-micro",
  nodePath: "/opt/node/bin/node",
  home: "/Users/someone",
};

test("there is one agent per watcher, and the lighting one holds and focuses", () => {
  assert.deepEqual(AGENTS.map((agent) => agent.name), ["thread-status", "lighting"]);
  assert.deepEqual([...AGENTS[1].args], ["watch", "--hold", "--focus"]);
});

test("an agent runs the script by absolute path, restarts, and logs to the user's Library", () => {
  const agent = describeAgent({ ...base, agent: AGENTS[0], claudePath: "/Users/someone/.local/bin/claude" });
  assert.equal(agent.label, `${LABEL_PREFIX}.thread-status`);
  assert.equal(agent.plistPath, `/Users/someone/Library/LaunchAgents/${LABEL_PREFIX}.thread-status.plist`);
  assert.equal(agent.logPath, "/Users/someone/Library/Logs/claude-codex-micro/thread-status.log");
  assert.match(agent.plist, /<string>\/opt\/node\/bin\/node<\/string>\n\s*<string>\/Users\/someone\/Projects\/claude-codex-micro\/scripts\/thread-status\.mjs<\/string>\n\s*<string>watch<\/string>/);
  assert.match(agent.plist, /<key>KeepAlive<\/key>\n\s*<true\/>/);
  assert.match(agent.plist, /<key>ThrottleInterval<\/key>\n\s*<integer>10<\/integer>/);
});

// launchd gives agents a bare environment. Counter-example: without the pinned
// PATH and CLAUDE_CODE_EXECPATH the companion starts, finds no `claude`, exits,
// and KeepAlive restarts it forever with an empty roster.
test("the environment pins node, claude and the path contract of the installing shell", () => {
  const agent = describeAgent({
    ...base,
    agent: AGENTS[0],
    claudePath: "/Users/someone/.local/bin/claude",
    env: {
      CLAUDE_THREAD_STATUS_DIR: "/Users/someone/state",
      CLAUDE_THREAD_STATUS_CONFIG_DIRS: "/Users/someone/.claude-accounts/work",
      SECRET_TOKEN: "must not leak",
    },
  });
  assert.match(agent.plist, /<key>PATH<\/key>\n\s*<string>\/opt\/node\/bin:\/Users\/someone\/\.local\/bin:\/usr\/bin:\/bin:\/usr\/sbin:\/sbin<\/string>/);
  assert.match(agent.plist, /<key>CLAUDE_CODE_EXECPATH<\/key>\n\s*<string>\/Users\/someone\/\.local\/bin\/claude<\/string>/);
  assert.match(agent.plist, /<key>CLAUDE_THREAD_STATUS_DIR<\/key>\n\s*<string>\/Users\/someone\/state<\/string>/);
  assert.match(agent.plist, /<key>CLAUDE_THREAD_STATUS_CONFIG_DIRS<\/key>/);
  assert.doesNotMatch(agent.plist, /SECRET_TOKEN|must not leak/);
});

test("without a claude binary the agent is still described, minus the pin", () => {
  const agent = describeAgent({ ...base, agent: AGENTS[1] });
  assert.doesNotMatch(agent.plist, /CLAUDE_CODE_EXECPATH/);
  assert.match(agent.plist, /<string>--hold<\/string>\n\s*<string>--focus<\/string>/);
});

test("relative paths are refused: launchd would resolve them against /", () => {
  assert.throws(() => describeAgent({ ...base, agent: AGENTS[0], repoRoot: "claude-codex-micro" }), /absolute repoRoot/);
  assert.throws(() => describeAgent({ ...base, agent: AGENTS[0], nodePath: "node" }), /absolute nodePath/);
});

test("property list text is escaped, and unsupported values are refused", () => {
  assert.match(toPlist({ Label: "a&b<c>" }), /<string>a&amp;b&lt;c&gt;<\/string>/);
  assert.throws(() => toPlist({ Value: 1.5 }), /Unsupported/);
  assert.throws(() => toPlist({ Value: null }), /Unsupported/);
});

// The format is Apple's, so Apple's own parser is the judge.
test("plutil accepts the generated property list", { skip: process.platform !== "darwin" }, () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "launch-agent-"));
  try {
    for (const agent of AGENTS) {
      const file = path.join(dir, `${agent.name}.plist`);
      writeFileSync(file, describeAgent({ ...base, agent, claudePath: "/usr/local/bin/claude", env: { CLAUDE_THREAD_STATUS_DIR: "/tmp/a & b" } }).plist);
      const lint = spawnSync("plutil", ["-lint", file], { encoding: "utf8" });
      assert.equal(lint.status, 0, lint.stdout + lint.stderr);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
