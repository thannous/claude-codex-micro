import assert from "node:assert/strict";
import test from "node:test";
import { defineMachine } from "../scripts/lib/state-machine.mjs";

const door = () =>
  defineMachine({
    id: "door",
    initial: "closed",
    events: ["open", "close", "lock", "unlock"],
    states: {
      closed: { on: { open: "opened", lock: "locked" }, passable: false },
      opened: { on: { close: "closed" }, passable: true },
      locked: { on: { unlock: "closed" }, passable: false },
    },
  });

test("a listed event moves the state, an unlisted one leaves it alone", () => {
  const machine = door();
  assert.equal(machine.transition("closed", "open"), "opened");
  assert.equal(machine.transition("locked", "open"), "locked", "a locked door does not open");
  assert.equal(machine.transition("opened", "lock"), "opened");
});

test("an event or a state the machine does not declare is an error, not a no-op", () => {
  const machine = door();
  assert.throws(() => machine.transition("closed", "kick"), /unknown event "kick"/);
  assert.throws(() => machine.transition("ajar", "open"), /unknown state "ajar"/);
  assert.throws(() => machine.describe("ajar"), /unknown state "ajar"/);
});

// A typo in a table is otherwise a transition that silently never fires.
test("a table that does not hold together is refused when it is defined", () => {
  const base = { id: "broken", initial: "a", events: ["go"], states: { a: { on: { go: "b" } }, b: {} } };
  assert.doesNotThrow(() => defineMachine(base));
  assert.throws(() => defineMachine({ ...base, initial: "z" }), /initial state "z"/);
  assert.throws(
    () => defineMachine({ ...base, states: { a: { on: { go: "c" } }, b: {} } }),
    /"a" on "go" leads to undeclared state "c"/,
  );
  assert.throws(
    () => defineMachine({ ...base, states: { a: { on: { run: "b" } }, b: {} } }),
    /"a" reacts to undeclared event "run"/,
  );
});

test("metadata is returned as declared, without the transitions", () => {
  assert.deepEqual(door().describe("opened"), { passable: true });
});

test("the graph can be walked: transitions are listed and dead states found", () => {
  const machine = door();
  assert.deepEqual(machine.unreachable(), []);
  assert.equal(machine.transitions().length, 4);

  const orphaned = defineMachine({
    id: "orphaned",
    initial: "a",
    events: ["go"],
    states: { a: {}, b: { on: { go: "a" } } },
  });
  assert.deepEqual(orphaned.unreachable(), ["b"]);
});

test("the diagram draws one arrow per pair of states and no self-loop", () => {
  const machine = defineMachine({
    id: "lamp",
    initial: "off",
    events: ["press", "hold", "tick"],
    states: {
      off: { on: { press: "lit.dim", hold: "lit.dim", tick: "off" } },
      "lit.dim": { on: { press: "off" } },
    },
  });
  assert.equal(
    machine.toMermaid(),
    [
      "stateDiagram-v2",
      '  state "off" as off',
      '  state "lit.dim" as lit_dim',
      "  [*] --> off",
      "  off --> lit_dim: press, hold",
      "  lit_dim --> off: press",
      "",
    ].join("\n"),
  );
  assert.match(machine.toMermaid({ label: (state) => state.toUpperCase() }), /state "LIT.DIM" as lit_dim/);
});
