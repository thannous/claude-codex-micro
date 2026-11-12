// A table-driven finite state machine, small enough to read in one sitting.
//
// Why a table rather than conditionals: a state that lives in three flags and
// five `if`s cannot be enumerated, so nobody can say what happens on an event
// that the author did not think about. Here every state lists the events that
// move it, anything unlisted leaves it where it is, and the whole graph can be
// walked — by a test that checks every state is reachable, or by `toMermaid`,
// which draws it.
//
// The module is pure and holds no state of its own: `transition` is a lookup,
// and the caller keeps the current state wherever it likes.

/**
 * @typedef {object} MachineDefinition
 * @property {string} id Name used in error messages and in the diagram.
 * @property {string} initial State a new subject starts in.
 * @property {readonly string[]} events Every event the machine understands.
 * @property {Record<string, {on?: Record<string, string>} & Record<string, unknown>>} states
 * One entry per state. `on` maps an event to its target state; any other key is
 * metadata, returned as is by `describe`.
 */

/**
 * @typedef {object} Machine
 * @property {string} id Name of the machine.
 * @property {string} initial State a new subject starts in.
 * @property {readonly string[]} states Declared states, in declaration order.
 * @property {readonly string[]} events Declared events, in declaration order.
 * @property {(state: string, event: string) => string} transition Next state.
 * @property {(state: string) => Readonly<Record<string, unknown>>} describe Metadata of a state.
 * @property {() => Array<{from: string, event: string, to: string}>} transitions
 * Every declared transition, self-loops included.
 * @property {() => string[]} unreachable States no event sequence leads to.
 * @property {(options?: {label?: (state: string) => string, filter?: (transition: {from: string, event: string, to: string}) => boolean}) => string} toMermaid
 * `stateDiagram-v2` source of the graph, or of the part of it `filter` keeps.
 */

/**
 * Builds a machine from a transition table, and refuses a table that does not
 * hold together: an unknown initial state, a transition on an undeclared event,
 * or one that leads to an undeclared state. Those are typos, and a typo in a
 * transition table is otherwise a transition that silently never fires.
 *
 * An event a state does not list leaves that state unchanged. An event or a
 * state the machine does not declare at all is a programming error and throws.
 *
 * @param {MachineDefinition} definition Transition table.
 * @returns {Machine} Frozen machine; it keeps no current state.
 * @throws {Error} When the table is inconsistent.
 */
export function defineMachine({ id, initial, events, states }) {
  const stateNames = Object.keys(states);
  const known = new Set(stateNames);
  const eventNames = [...events];
  const understood = new Set(eventNames);
  if (!known.has(initial)) throw new Error(`${id}: initial state "${initial}" is not declared`);

  const table = new Map();
  const metadata = new Map();
  for (const name of stateNames) {
    const { on = {}, ...rest } = states[name];
    for (const [event, target] of Object.entries(on)) {
      if (!understood.has(event)) throw new Error(`${id}: state "${name}" reacts to undeclared event "${event}"`);
      if (!known.has(target)) throw new Error(`${id}: "${name}" on "${event}" leads to undeclared state "${target}"`);
    }
    table.set(name, new Map(Object.entries(on)));
    metadata.set(name, Object.freeze(rest));
  }

  const rowOf = (state) => {
    const row = table.get(state);
    if (!row) throw new Error(`${id}: unknown state "${state}"`);
    return row;
  };

  const transition = (state, event) => {
    const row = rowOf(state);
    if (!understood.has(event)) throw new Error(`${id}: unknown event "${event}"`);
    return row.get(event) ?? state;
  };

  const transitions = () =>
    stateNames.flatMap((from) => [...table.get(from)].map(([event, to]) => ({ from, event, to })));

  const unreachable = () => {
    const seen = new Set([initial]);
    const queue = [initial];
    while (queue.length > 0) {
      for (const to of table.get(queue.shift()).values()) {
        if (!seen.has(to)) {
          seen.add(to);
          queue.push(to);
        }
      }
    }
    return stateNames.filter((name) => !seen.has(name));
  };

  // Mermaid state ids cannot hold dots; the readable name goes in the label.
  // Events sharing a source and a target are drawn as one arrow. With a
  // `filter`, only the states the kept transitions touch are drawn: a machine
  // too dense for one picture is shown as several views of the same table.
  const toMermaid = ({ label = (state) => state, filter = () => true } = {}) => {
    const idOf = (state) => state.replace(/[^A-Za-z0-9]/g, "_");
    const kept = transitions().filter((entry) => entry.from !== entry.to && filter(entry));
    const drawn = new Set(kept.flatMap(({ from, to }) => [from, to]));
    const lines = ["stateDiagram-v2"];
    for (const name of stateNames) {
      if (drawn.has(name)) lines.push(`  state "${label(name)}" as ${idOf(name)}`);
    }
    if (drawn.has(initial)) lines.push(`  [*] --> ${idOf(initial)}`);
    const arrows = new Map();
    for (const { from, event, to } of kept) {
      const key = `${idOf(from)} --> ${idOf(to)}`;
      arrows.set(key, [...(arrows.get(key) ?? []), event]);
    }
    for (const [arrow, labels] of arrows) lines.push(`  ${arrow}: ${labels.join(", ")}`);
    return `${lines.join("\n")}\n`;
  };

  return Object.freeze({
    id,
    initial,
    states: Object.freeze(stateNames),
    events: Object.freeze(eventNames),
    transition,
    describe: (state) => {
      rowOf(state);
      return metadata.get(state);
    },
    transitions,
    unreachable,
    toMermaid,
  });
}
