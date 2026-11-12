// The parts of the documentation that are generated from the transition
// tables, so that the documents cannot drift from the code.
//
// The session machine is too dense for one picture — every phase has a way
// into the hooks-only family and back — so the documents carry the whole table
// as two matrices, and one diagram of the everyday path.

import { RUN_LOOP_MACHINE } from "./run-loop.mjs";
import { SESSION_MACHINE, displayState } from "./session-machine.mjs";

const everyday = new Set(["idle", "idle.prompted", "running", "running.prompted", "running.stopping", "waiting", "done"]);

// One row per phase, one column per event; `·` is "stays where it is".
function matrix(prefix) {
  const events = SESSION_MACHINE.events.filter((event) => event.startsWith(prefix));
  const header = ["phase", "shows", ...events.map((event) => `\`${event.slice(prefix.length)}\``)];
  const rows = SESSION_MACHINE.states.map((phase) => [
    `\`${phase}\``,
    displayState(phase),
    ...events.map((event) => {
      const target = SESSION_MACHINE.transition(phase, event);
      return target === phase ? "·" : `\`${target}\``;
    }),
  ]);
  return `${[header, header.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n")}\n`;
}

/**
 * Generated documentation blocks by name, each a function returning the exact
 * text the architecture documents embed: Mermaid `stateDiagram-v2` sources and
 * Markdown tables.
 */
export const GENERATED = Object.freeze({
  // The roster publishes a status and nobody is asking a question: what a
  // session goes through all day.
  "session-diagram": () =>
    SESSION_MACHINE.toMermaid({ filter: ({ from, to }) => everyday.has(from) && everyday.has(to) }),
  "session-roster-table": () => matrix("roster."),
  "session-hook-table": () => matrix("hook."),
  "run-loop-diagram": () => RUN_LOOP_MACHINE.toMermaid(),
});
