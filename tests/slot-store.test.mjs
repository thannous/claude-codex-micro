import assert from "node:assert/strict";
import { appendFile, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createSlotStore } from "../scripts/lib/slot-store.mjs";
import { statePaths } from "../scripts/lib/state-paths.mjs";
import { STATES, applyRoster, emptySnapshot } from "../scripts/lib/thread-slots.mjs";

async function temporaryStore(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), "codex-micro-store-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return createSlotStore(statePaths({ CLAUDE_THREAD_STATUS_DIR: path.join(directory, "state") }, directory));
}

const oneSession = (status) =>
  applyRoster(emptySnapshot(), [{ sessionId: "session-1", name: "projet", cwd: `${os.homedir()}/projet`, status }], 1).snapshot;

test("the state directory follows the environment, then the home directory", () => {
  assert.deepEqual(statePaths({}, "/home/someone"), {
    stateDir: "/home/someone/.claude/thread-status",
    journalPath: "/home/someone/.claude/thread-status/events.ndjson",
    slotsPath: "/home/someone/.claude/thread-status/slots.json",
  });
  assert.equal(statePaths({ CLAUDE_THREAD_STATUS_DIR: "/elsewhere" }, "/home/someone").slotsPath, "/elsewhere/slots.json");
});

test("a first start reads as six free slots, and prepare makes the journal watchable", async (t) => {
  const store = await temporaryStore(t);
  const state = await store.load();
  assert.deepEqual(state, { snapshot: emptySnapshot(), journalOffset: 0, configDirs: [] });
  assert.deepEqual(await store.readJournalSince(0), { events: [], offset: 0 });

  await store.prepare();
  assert.equal((await stat(store.paths.journalPath)).size, 0);
});

test("what is saved is what is loaded, and the published rows hide the home directory", async (t) => {
  const store = await temporaryStore(t);
  const snapshot = oneSession("busy");
  assert.equal(await store.save(snapshot, 42, ["/profiles/work"]), true);

  const written = JSON.parse(await readFile(store.paths.slotsPath, "utf8"));
  assert.equal(written.slots.length, 6);
  assert.deepEqual(
    { state: written.slots[0].state, name: written.slots[0].name, cwd: written.slots[0].cwd },
    { state: STATES.running, name: "projet", cwd: "$HOME/projet" },
  );
  assert.equal(written.slots[1].state, STATES.free);

  const reloaded = await createSlotStore(store.paths).load();
  assert.deepEqual(reloaded, { snapshot, journalOffset: 42, configDirs: ["/profiles/work"] });
});

// slots.json is followed by the lighting bridge: rewriting it on every poll
// would push HID reports continuously while nothing moved.
test("nothing is written when no key and no profile changed", async (t) => {
  const store = await temporaryStore(t);
  const snapshot = oneSession("busy");
  await store.save(snapshot, 10, []);
  const before = await readFile(store.paths.slotsPath, "utf8");

  assert.equal(await store.save({ ...snapshot, overflow: 3, dropped: 1 }, 999, []), false);
  assert.equal(await readFile(store.paths.slotsPath, "utf8"), before);

  assert.equal(await store.save(oneSession("idle"), 999, []), true);
  assert.equal(await store.save(oneSession("idle"), 999, ["/profiles/work"]), true, "a newly learnt profile is persisted");

  // A fresh process compares against what it loaded, not against nothing.
  const restarted = createSlotStore(store.paths);
  const state = await restarted.load();
  assert.equal(await restarted.save(state.snapshot, state.journalOffset, state.configDirs), false);
});

test("the journal is read from the last offset, one whole line at a time", async (t) => {
  const store = await temporaryStore(t);
  await store.prepare();
  const first = `${JSON.stringify({ event: "Stop", sessionId: "a" })}\n`;
  await appendFile(store.paths.journalPath, `${first}{"event":"UserPrompt`);

  const one = await store.readJournalSince(0);
  assert.deepEqual(one.events, [{ event: "Stop", sessionId: "a" }]);
  assert.equal(one.offset, Buffer.byteLength(first), "the incomplete line is left for the next pass");

  await appendFile(store.paths.journalPath, 'Submit","sessionId":"é"}\nnot json\n');
  const two = await store.readJournalSince(one.offset);
  assert.deepEqual(two.events, [{ event: "UserPromptSubmit", sessionId: "é" }], "a corrupt line is skipped");
  assert.deepEqual(await store.readJournalSince(two.offset), { events: [], offset: two.offset });
});

test("a journal shorter than the offset was rotated: it is read again from the start", async (t) => {
  const store = await temporaryStore(t);
  await store.prepare();
  await writeFile(store.paths.journalPath, `${JSON.stringify({ event: "Stop", sessionId: "after-rotation" })}\n`);
  const read = await store.readJournalSince(10_000);
  assert.deepEqual(read.events, [{ event: "Stop", sessionId: "after-rotation" }]);
});
