import assert from "node:assert/strict";
import test from "node:test";
import {
  SLOT_COUNT,
  STATES,
  applyHookEvent,
  applyRoster,
  emptySnapshot,
  normalizeSnapshot,
  resolveNavigation,
  slotView,
  stateFromHookEvent,
  ttyDevice,
} from "../scripts/lib/thread-slots.mjs";

function rosterRow(index, overrides = {}) {
  return {
    sessionId: `session-${index}`,
    pid: 1000 + index,
    cwd: "/tmp/projet",
    kind: "interactive",
    name: `projet-${index}`,
    startedAt: index,
    ...overrides,
  };
}

function withRoster(rows, snapshot = emptySnapshot(), now = 1) {
  return applyRoster(snapshot, rows, now);
}

test("les événements de hook se traduisent en états", () => {
  assert.equal(stateFromHookEvent({ event: "SessionStart" }), STATES.idle);
  assert.equal(stateFromHookEvent({ event: "UserPromptSubmit" }), STATES.running);
  assert.equal(stateFromHookEvent({ event: "Stop" }), STATES.done);
  assert.equal(stateFromHookEvent({ event: "SessionEnd" }), STATES.ended);
});

test("seules les notifications qui attendent une personne bloquent", () => {
  for (const notificationType of ["permission_prompt", "agent_needs_input", "elicitation_dialog"]) {
    assert.equal(stateFromHookEvent({ event: "Notification", notificationType }), STATES.blocked);
  }
  assert.equal(
    stateFromHookEvent({ event: "Notification", notificationType: "idle_prompt" }),
    STATES.idle,
  );
  // Un témoin rouge doit signifier « on t'attend » : ces types ne changent rien.
  for (const notificationType of ["auth_success", "elicitation_complete", "agent_completed"]) {
    assert.equal(stateFromHookEvent({ event: "Notification", notificationType }), null);
  }
});

test("le roster ouvre les emplacements dans l'ordre et rafraîchit les métadonnées", () => {
  const first = withRoster([rosterRow(1), rosterRow(2)]);
  const view = slotView(first.snapshot);

  assert.equal(first.changed, true);
  assert.equal(view[0].entry.sessionId, "session-1");
  assert.equal(view[1].entry.sessionId, "session-2");
  assert.equal(view[2].state, STATES.free);
  assert.equal(view[0].state, STATES.idle);

  const renamed = withRoster([rosterRow(1, { name: "renommé" }), rosterRow(2)], first.snapshot, 2);
  assert.equal(renamed.snapshot.slots[0].name, "renommé");
  assert.equal(renamed.snapshot.slots[0].sessionId, "session-1", "l'emplacement reste collant");
});

test("un état reçu avant le roster est mis en attente puis promu", () => {
  const early = applyHookEvent(emptySnapshot(), { event: "UserPromptSubmit", sessionId: "session-1" }, 1);
  assert.equal(early.changed, false, "aucun emplacement n'est ouvert par un hook seul");
  assert.equal(early.snapshot.pending["session-1"], STATES.running);
  assert.equal(slotView(early.snapshot)[0].state, STATES.free);

  const confirmed = withRoster([rosterRow(1)], early.snapshot, 2);
  assert.equal(confirmed.snapshot.slots[0].state, STATES.running);
  assert.equal("session-1" in confirmed.snapshot.pending, false);
});

test("une session absente du roster ne prend jamais d'emplacement", () => {
  // Mesuré : les sessions `claude -p` et les sous-agents émettent des hooks sans
  // apparaître dans `claude agents --json`.
  let snapshot = emptySnapshot();
  for (let index = 0; index < 50; index += 1) {
    snapshot = applyHookEvent(snapshot, { event: "Stop", sessionId: `fantome-${index}` }, index).snapshot;
  }
  assert.equal(slotView(snapshot).every((row) => row.state === STATES.free), true);
  assert.ok(Object.keys(snapshot.pending).length <= 32, "la file d'attente est bornée");
  assert.ok(snapshot.dropped > 0, "les abandons sont comptés, pas silencieux");
});

test("un hook manqué est rattrapé par la disparition du roster", () => {
  const live = withRoster([rosterRow(1)]);
  const busy = applyHookEvent(live.snapshot, { event: "UserPromptSubmit", sessionId: "session-1" }, 2);
  assert.equal(busy.snapshot.slots[0].state, STATES.running);

  // Le processus meurt sans émettre Stop ni SessionEnd.
  const gone = withRoster([], busy.snapshot, 3);
  assert.equal(gone.changed, true);
  assert.equal(gone.snapshot.slots[0].state, STATES.ended);
  assert.equal(gone.snapshot.slots[0].sessionId, "session-1", "l'emplacement reste consultable");
});

test("une session fermée est évincée avant toute session vivante", () => {
  let snapshot = emptySnapshot();
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1));
  snapshot = withRoster(rows, snapshot).snapshot;
  for (const row of rows) {
    snapshot = applyHookEvent(snapshot, { event: "UserPromptSubmit", sessionId: row.sessionId }, 2).snapshot;
  }

  // La troisième meurt, une septième arrive : elle doit prendre cet emplacement.
  const survivors = rows.filter((row) => row.sessionId !== "session-3");
  snapshot = withRoster(survivors, snapshot, 3).snapshot;
  assert.equal(snapshot.slots[2].state, STATES.ended);

  const crowded = withRoster([...survivors, rosterRow(7)], snapshot, 4);
  assert.equal(crowded.snapshot.slots[2].sessionId, "session-7");
  assert.equal(crowded.notes.length, 0);
  assert.equal(
    crowded.snapshot.slots.filter((entry) => entry?.state === STATES.running).length,
    SLOT_COUNT - 1,
    "aucune session au travail n'a été évincée",
  );
});

test("le débordement est signalé au lieu d'être tronqué en silence", () => {
  let snapshot = emptySnapshot();
  const rows = Array.from({ length: SLOT_COUNT }, (_, index) => rosterRow(index + 1));
  snapshot = withRoster(rows, snapshot).snapshot;
  for (const row of rows) {
    snapshot = applyHookEvent(snapshot, { event: "UserPromptSubmit", sessionId: row.sessionId }, 2).snapshot;
  }

  const overflow = withRoster([...rows, rosterRow(7)], snapshot, 3);
  assert.equal(overflow.snapshot.overflow, 1);
  assert.match(overflow.notes[0], /session-7/);
  assert.equal(overflow.snapshot.slots.some((entry) => entry?.sessionId === "session-7"), false);
});

test("la navigation ne suppose aucune route", () => {
  assert.equal(resolveNavigation(null).kind, "empty");

  const terminal = resolveNavigation({
    sessionId: "session-1",
    state: STATES.running,
    tty: "/dev/ttys004",
    terminalApp: "iTerm2",
  });
  assert.deepEqual({ kind: terminal.kind, app: terminal.app }, { kind: "terminal", app: "iTerm2" });

  const closed = resolveNavigation({ sessionId: "session-1", state: STATES.ended, cwd: "/tmp/projet" });
  assert.equal(closed.kind, "resume");
  assert.equal(closed.sessionId, "session-1");

  // Session hébergée par Claude Desktop : pas de tty. `claude://resume` la
  // désigne par le `sessionId` du roster — jamais par le `hostSessionId`, qui
  // regroupe plusieurs sessions.
  const hosted = resolveNavigation({
    sessionId: "6f2d3f4a-8c11-4b2e-9a77-0d5e1c8b4a30",
    state: STATES.running,
    entrypoint: "claude-desktop",
    hostSessionId: "local_f92b6e6a",
  });
  assert.equal(hosted.kind, "desktop");
  assert.equal(hosted.url, "claude://resume?session=6f2d3f4a-8c11-4b2e-9a77-0d5e1c8b4a30");
  assert.equal(hosted.hostSessionId, "local_f92b6e6a");

  // L'application valide la cible par une regex UUID stricte. Un identifiant
  // d'une autre forme ne donne pas lieu à une URL que le handler refuserait.
  const opaque = resolveNavigation({
    sessionId: "session-1",
    state: STATES.running,
    entrypoint: "claude-desktop",
  });
  assert.equal(opaque.kind, "unsupported");
  assert.equal(opaque.url, undefined);
});

test("le tty de `ps` devient un chemin de périphérique qui existe", () => {
  // La forme que renvoie macOS. Un préfixe `/dev/tty` inconditionnel donnait
  // `/dev/ttyttys001`, et le focus AppleScript ne trouvait jamais la fenêtre.
  assert.equal(ttyDevice("ttys001"), "/dev/ttys001");
  // La forme courte des autres BSD, qui exige bien le préfixe complet.
  assert.equal(ttyDevice("s001"), "/dev/ttys001");
  // Déjà absolu : conservé tel quel, sans double préfixe.
  assert.equal(ttyDevice("/dev/ttys006"), "/dev/ttys006");
  // Sessions sans terminal : Claude Desktop, un IDE, un `claude -p`.
  for (const absent of ["??", "-", "", null, undefined]) {
    assert.equal(ttyDevice(absent), null);
  }
});

test("un instantané corrompu retombe sur six emplacements libres", () => {
  assert.equal(normalizeSnapshot(null).slots.length, SLOT_COUNT);
  assert.equal(normalizeSnapshot({ slots: "nope" }).slots.length, SLOT_COUNT);
  const partial = normalizeSnapshot({ slots: [{ sessionId: "session-1", state: STATES.done }, 42] });
  assert.equal(partial.slots[0].sessionId, "session-1");
  assert.equal(partial.slots[1], null);
});
