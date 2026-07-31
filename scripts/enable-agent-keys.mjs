#!/usr/bin/env node

// Assigns the native Agent keycodes to the six empty positions of the `Claude`
// layer, which **unlocks per-thread lighting on that layer**.
//
// The fact, confirmed on hardware: per-thread lighting (`v.oai.thstatus`) only
// renders on keys whose keycode is `KV_OAI_AG00` through `KV_OAI_AG05`. The
// firmware's predicate is the keycode, not the layer index: the keycode is what
// tells the firmware which physical key is slot N. On a layer where those
// positions are `KC_NONE`, there is no slot to paint, and the writes are
// acknowledged with no visible effect.
//
// The clue was in Input's bundle, where the native layer defines exactly
// `base[0] = [AG00, AG01]` and `base[1] = [AG02..AG05]`, so two keys then four —
// the geometry confirmed by eye on this hardware. These keycodes appear only
// once each in the `app.asar`: Input does not offer them in its picker, hence
// this script.
//
// No Claude shortcut is lost: the six positions are `no-action` in the Claude
// preset, and the shortcuts live on the next row.
//
// The cost is elsewhere, and it is worth knowing before importing: these
// keycodes make the firmware emit a `v.oai.hid` notification, which **the
// ChatGPT app reacts to by switching Codex thread**. It therefore contends for
// both halves of the feature — it rewrites the LEDs every 35 to 40s and it
// intercepts the presses. Quitting the ChatGPT app solves both at once, and
// that is the real condition of use.
//
// This script never touches the layer at index 0, does not write into Input's
// storage and does not write to the device. It produces a file to import through
// the official **Import Profile** flow, and `--revert` undoes the operation.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactHome } from "./lib/input-export.mjs";

// Read from /Applications/Input.app/Contents/Resources/app.asar, in the
// hard-wired definition of the native Codex layer. They appear only once in the
// bundle: Input does not offer them in its key picker, hence this script.
const AGENT_KEYCODES = Object.freeze([
  ["KV_OAI_AG00", "KV_OAI_AG01"],
  ["KV_OAI_AG02", "KV_OAI_AG03", "KV_OAI_AG04", "KV_OAI_AG05"],
]);

const CLAUDE_LAYER_NAME = "Claude";

function usage() {
  return `Usage: node scripts/enable-agent-keys.mjs <export-profile.json> [output.json] [--revert]

Assigns the native Agent keycodes to the six empty positions of the Claude
layer, so per-thread lighting can be exercised outside the Codex layer.

  --revert    put KC_NONE back on the six positions

With no destination, the file is written to ~/Downloads, where Input opens its
Import Profile dialog, keeping the "-profile.json" suffix Input expects.

The layer at index 0 is never modified.
`;
}

// Input opens Import Profile on ~/Downloads and recognises the "-profile.json"
// suffix of its own exports: the default destination honours both.
function defaultDestination(source, { revert }) {
  const suffix = revert ? "Revert" : "AgentKeys";
  const base = path.basename(source).replace(/(-profile)?\.json$/i, "");
  return path.join(os.homedir(), "Downloads", `${base} ${suffix}-profile.json`);
}

function assert(condition, message) {
  if (!condition) {
    process.stderr.write(`${message}\n`);
    process.exit(1);
  }
}

// The six targeted cells, and nothing else: two rows, at the expected lengths.
// An unexpected layout is refused rather than interpreted.
function patchAgentRows(layer, { revert }) {
  const changes = [];
  AGENT_KEYCODES.forEach((row, rowIndex) => {
    const cells = layer.layout?.base?.[rowIndex];
    assert(
      Array.isArray(cells) && cells.length === row.length,
      `Unexpected layout for row ${rowIndex}: ${row.length} cells expected.`,
    );
    row.forEach((keycode, columnIndex) => {
      const target = revert ? "KC_NONE" : keycode;
      const cell = cells[columnIndex];
      assert(
        cell && typeof cell === "object",
        `Cell ${rowIndex}/${columnIndex} is unreadable in the Claude layer.`,
      );
      if (cell.keycode !== target) {
        changes.push(`  base[${rowIndex}][${columnIndex}] : ${cell.keycode} → ${target}`);
        cell.keycode = target;
      }
    });
  });
  return changes;
}

async function main(argv) {
  const revert = argv.includes("--revert");
  const [source, explicit] = argv.filter((argument) => !argument.startsWith("--"));
  if (!source) {
    process.stdout.write(usage());
    return;
  }
  const destination = explicit ?? defaultDestination(source, { revert });

  const raw = JSON.parse(await fs.readFile(source, "utf8"));
  const layers = raw.profile?.layers;
  assert(Array.isArray(layers) && layers.length > 1, "This export has no usable list of layers.");

  const matching = layers.filter((layer) => layer?.name === CLAUDE_LAYER_NAME);
  assert(
    matching.length === 1,
    matching.length === 0
      ? `No "${CLAUDE_LAYER_NAME}" layer in this export.`
      : `Several "${CLAUDE_LAYER_NAME}" layers: keep only one before running this.`,
  );

  const index = layers.indexOf(matching[0]);
  assert(index > 0, "The Claude layer sits at index 0: refused, that layer is protected.");

  const before = JSON.stringify(layers[0]);
  const changes = patchAgentRows(matching[0], { revert });
  assert(JSON.stringify(layers[0]) === before, "The layer at index 0 was modified: aborting.");

  await fs.mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  const output = `${JSON.stringify(raw, null, 2)}\n`;
  await fs.writeFile(destination, output);

  process.stdout.write(
    `"${CLAUDE_LAYER_NAME}" layer at index ${index}, AppSense link ${matching[0].linkedAppId ?? "absent"} preserved.\n`,
  );
  process.stdout.write(changes.length ? `${changes.join("\n")}\n` : "  no change needed\n");
  process.stdout.write(
    `\n${redactHome(path.resolve(destination))}\n` +
      `SHA-256 ${createHash("sha256").update(output).digest("hex")}\n\n` +
      "Import through Input > Import Profile, then check on the Claude layer:\n" +
      "  npm run lighting -- set all #00FF00 --effect=solid\n",
  );
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.stack ?? String(error)}\n`);
  process.exitCode = 1;
});
