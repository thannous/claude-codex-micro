#!/usr/bin/env node

// Prints the blocks of docs/architecture.md and docs/fr/architecture.md that
// are generated from the state machines. The tables in scripts/lib are the
// source: when one changes, paste the new output into both documents —
// tests/architecture-docs.test.mjs fails until they match.

import { GENERATED } from "./lib/machine-docs.mjs";

const [name] = process.argv.slice(2);
if (!name || !(name in GENERATED)) {
  process.stdout.write(`Usage: node scripts/machine-docs.mjs <${Object.keys(GENERATED).join("|")}>\n`);
  process.exitCode = name ? 1 : 0;
} else {
  process.stdout.write(GENERATED[name]());
}
