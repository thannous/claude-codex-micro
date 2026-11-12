// docs/architecture.md and its French counterpart embed diagrams and tables
// generated from the state machines. This keeps them from drifting: change a
// transition, and the page that describes it has to change with it.

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { GENERATED } from "../scripts/lib/machine-docs.mjs";
import { SESSION_MACHINE } from "../scripts/lib/session-machine.mjs";

const PAGES = ["docs/architecture.md", "docs/fr/architecture.md"];
const read = (page) => readFile(new URL(`../${page}`, import.meta.url), "utf8");

test("both languages embed what the machines generate, verbatim", async (t) => {
  for (const page of PAGES) {
    await t.test(page, async () => {
      const text = await read(page);
      for (const [name, generate] of Object.entries(GENERATED)) {
        const block = name.endsWith("-diagram") ? `\`\`\`mermaid\n${generate()}\`\`\`` : generate();
        assert.ok(
          text.includes(block),
          `${page} is out of date for "${name}": paste the output of \`node scripts/machine-docs.mjs ${name}\``,
        );
      }
    });
  }
});

test("the two tables together cover every phase and every event", () => {
  const tables = GENERATED["session-roster-table"]() + GENERATED["session-hook-table"]();
  for (const phase of SESSION_MACHINE.states) assert.ok(tables.includes(`| \`${phase}\` |`), phase);
  for (const event of SESSION_MACHINE.events) assert.ok(tables.includes(`\`${event.split(".")[1]}\``), event);
});

test("the page states the size of the machine it describes", async () => {
  const stated = `${SESSION_MACHINE.states.length} phases, ${SESSION_MACHINE.events.length}`;
  for (const page of PAGES) assert.ok((await read(page)).includes(stated), `${page}: expected "${stated}"`);
});
