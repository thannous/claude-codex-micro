import assert from "node:assert/strict";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveClaudeBinary } from "../scripts/lib/claude-binary.mjs";
import { enrichRoster, readRoster, readRosters } from "../scripts/lib/roster-source.mjs";
import { TERMINAL_APPS, focusTerminal, parseProcessTable, terminalFor } from "../scripts/lib/terminals.mjs";

// A stand-in for `claude` that answers `agents --json` from the directory it
// was asked about, the way the real one lists one configuration directory.
async function fakeClaude(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-micro-claude-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const binary = path.join(directory, "claude");
  await writeFile(
    binary,
    `#!${process.execPath}
const dir = process.env.CLAUDE_CONFIG_DIR;
if (process.argv.slice(2).join(" ") !== "agents --json") process.exit(64);
if (dir === "/broken") { process.stderr.write("config unreadable"); process.exit(1); }
if (dir === "/garbled") { process.stdout.write('{"not":"an array"}'); process.exit(0); }
process.stdout.write(JSON.stringify([{ sessionId: dir ? "in-" + dir : "in-default", status: "idle" }]));
`,
  );
  await chmod(binary, 0o755);
  return binary;
}

test("the launcher on PATH wins over a pinned version, which wins over the bundled copies", () => {
  const exists = (candidate) => candidate !== "/gone/claude";
  const lookup = (which, env) => resolveClaudeBinary({ which: () => which, env, exists, home: "/nowhere" });

  assert.equal(lookup("/bin/claude", { CLAUDE_CODE_EXECPATH: "/versions/2.1.322" }), "/bin/claude");
  assert.equal(lookup("", { CLAUDE_CODE_EXECPATH: "/versions/2.1.322" }), "/versions/2.1.322");
  // A launcher that no longer exists is not returned just because PATH names it.
  assert.equal(lookup("/gone/claude", { CLAUDE_CODE_EXECPATH: "/versions/2.1.322" }), "/versions/2.1.322");
  assert.equal(lookup("", {}), null);
});

test("each configuration directory is asked on its own, the default one by leaving the variable unset", async (t) => {
  const binary = await fakeClaude(t);
  const inherited = { ...process.env, CLAUDE_CONFIG_DIR: "/inherited" };

  assert.deepEqual(readRoster(binary, null, inherited), [{ sessionId: "in-default", status: "idle" }]);
  assert.deepEqual(readRoster(binary, "/profiles/work", inherited), [{ sessionId: "in-/profiles/work", status: "idle" }]);
  assert.throws(() => readRoster(binary, "/broken"), /`claude agents --json` failed: config unreadable/);
  assert.throws(() => readRoster(binary, "/garbled"), /did not return an array/);
});

test("one directory that fails does not take the others down", async (t) => {
  const binary = await fakeClaude(t);
  const results = readRosters(binary, [null, "/broken", "/profiles/work"]);
  assert.deepEqual(results.map((result) => [result.configDir, result.rows?.length ?? result.error]), [
    [null, 1],
    ["/broken", "`claude agents --json` failed: config unreadable"],
    ["/profiles/work", 1],
  ]);
});

const PS_OUTPUT = `
    1     0 ??       /sbin/launchd
  500     1 ??       /Applications/iTerm.app/Contents/MacOS/iTerm2
  510   500 ttys004  -zsh
  520   510 ttys004  claude
  600     1 ??       /Applications/Claude.app/Contents/MacOS/Claude
  610   600 ??       /Users/someone/Library/Application Support/Claude/claude-code/2.1.322/claude
  700     1 ??       /Applications/Ghostty.app/Contents/MacOS/ghostty
  710   700 ttys009  claude
not a process line
`;

test("the process table gives each session its tty and the terminal hosting it", () => {
  const table = parseProcessTable(PS_OUTPUT);
  assert.equal(table.size, 8);
  assert.equal(table.get(610).comm.endsWith("2.1.322/claude"), true, "paths with spaces are kept whole");

  assert.equal(terminalFor(table, 520).name, "iTerm2");
  assert.equal(terminalFor(table, 710).name, "Ghostty");
  assert.equal(terminalFor(table, 610), null, "hosted by Claude Desktop: no terminal");
  assert.equal(terminalFor(table, 999), null);

  assert.deepEqual(
    enrichRoster([{ sessionId: "a", pid: 520 }, { sessionId: "b", pid: 610 }, { sessionId: "c", pid: 999 }], table),
    [
      { sessionId: "a", pid: 520, tty: "/dev/ttys004", terminalApp: "iTerm2" },
      { sessionId: "b", pid: 610, tty: null, terminalApp: null },
      { sessionId: "c", pid: 999, tty: null, terminalApp: null },
    ],
  );
});

// These two refusals happen before any AppleScript runs, which is the point:
// a tty is interpolated into a script, and only a known driver gets one.
test("no script is run for an unexpected tty or a terminal that cannot be driven", () => {
  const injected = focusTerminal({ tty: '/dev/ttys001" then\nactivate', app: "iTerm2" });
  assert.deepEqual({ ok: injected.ok, refused: /unexpected terminal path/.test(injected.output) }, { ok: false, refused: true });

  const ghostty = focusTerminal({ tty: "/dev/ttys009", app: "Ghostty" });
  assert.deepEqual(ghostty, { ok: false, output: "terminal not scriptable: Ghostty. Slot is on /dev/ttys009." });
  assert.match(focusTerminal({ tty: "/dev/ttys009", app: null }).output, /^terminal not scriptable\. Slot is on/);

  assert.deepEqual(
    TERMINAL_APPS.filter((app) => app.driver).map((app) => app.name),
    ["iTerm2", "Terminal"],
  );
});
