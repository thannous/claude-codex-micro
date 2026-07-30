#!/usr/bin/env node

// Assigne les keycodes Agent natifs aux six positions vides du layer `Claude`,
// ce qui **débloque l'éclairage par thread sur ce layer**.
//
// Le fait, confirmé sur matériel : l'éclairage par thread (`v.oai.thstatus`) ne
// rend que sur les touches dont le keycode est `KV_OAI_AG00` à `KV_OAI_AG05`. Le
// prédicat du firmware est le keycode, pas l'index du layer : c'est le keycode qui
// dit au firmware quelle touche physique est l'emplacement N. Sur un layer où ces
// positions valent `KC_NONE`, il n'y a aucun emplacement à peindre, et les
// écritures sont acquittées sans effet visible.
//
// L'indice se lisait dans le bundle d'Input, où le layer natif définit exactement
// `base[0] = [AG00, AG01]` et `base[1] = [AG02..AG05]`, soit deux puis quatre
// touches — la géométrie confirmée à l'œil sur ce matériel. Ces keycodes
// n'apparaissent qu'une fois chacun dans l'`app.asar` : Input ne les propose pas
// dans son sélecteur, d'où ce script.
//
// Coût sur ce mapping : nul. Les six positions sont `no-action` dans le preset
// Claude, et les raccourcis vivent sur la rangée suivante. La seule contrepartie
// est qu'un appui sur ces touches émet désormais l'action Agent native au lieu de
// rien.
//
// Ce script ne touche jamais le layer d'index 0, n'écrit pas dans le stockage
// d'Input et n'écrit pas sur le périphérique. Il produit un fichier à importer
// par le flux officiel **Import Profile**, et `--revert` défait l'opération.

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactHome } from "./lib/input-export.mjs";

// Relevés dans /Applications/Input.app/Contents/Resources/app.asar, définition
// câblée du layer Codex natif. Ils n'apparaissent qu'une seule fois dans le
// bundle : Input ne les propose pas dans son sélecteur de touches, d'où ce script.
const AGENT_KEYCODES = Object.freeze([
  ["KV_OAI_AG00", "KV_OAI_AG01"],
  ["KV_OAI_AG02", "KV_OAI_AG03", "KV_OAI_AG04", "KV_OAI_AG05"],
]);

const CLAUDE_LAYER_NAME = "Claude";

function usage() {
  return `Usage: node scripts/enable-agent-keys.mjs <export-profile.json> [sortie.json] [--revert]

Assigne les keycodes Agent natifs aux six positions vides du layer Claude, pour
éprouver le rendu de l'éclairage par thread hors du layer Codex.

  --revert    remet KC_NONE sur les six positions

Sans destination, le fichier est écrit dans ~/Downloads, là où Input ouvre sa
boîte de dialogue Import Profile, en conservant le suffixe « -profile.json »
qu'Input attend.

Le layer d'index 0 n'est jamais modifié.
`;
}

// Input ouvre Import Profile sur ~/Downloads et reconnaît le suffixe
// « -profile.json » de ses propres exports : la destination par défaut respecte
// les deux.
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

// Les six cellules visées, et rien d'autre : deux rangées, aux longueurs
// attendues. Une disposition inattendue est refusée plutôt qu'interprétée.
function patchAgentRows(layer, { revert }) {
  const changes = [];
  AGENT_KEYCODES.forEach((row, rowIndex) => {
    const cells = layer.layout?.base?.[rowIndex];
    assert(
      Array.isArray(cells) && cells.length === row.length,
      `Disposition inattendue pour la rangée ${rowIndex} : ${row.length} cellules attendues.`,
    );
    row.forEach((keycode, columnIndex) => {
      const target = revert ? "KC_NONE" : keycode;
      const cell = cells[columnIndex];
      assert(
        cell && typeof cell === "object",
        `Cellule ${rowIndex}/${columnIndex} illisible dans le layer Claude.`,
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
  assert(Array.isArray(layers) && layers.length > 1, "Cet export ne contient pas de liste de layers exploitable.");

  const matching = layers.filter((layer) => layer?.name === CLAUDE_LAYER_NAME);
  assert(
    matching.length === 1,
    matching.length === 0
      ? `Aucun layer « ${CLAUDE_LAYER_NAME} » dans cet export.`
      : `Plusieurs layers « ${CLAUDE_LAYER_NAME} » : n'en garder qu'un avant l'expérience.`,
  );

  const index = layers.indexOf(matching[0]);
  assert(index > 0, "Le layer Claude est à l'index 0 : refus, ce layer est protégé.");

  const before = JSON.stringify(layers[0]);
  const changes = patchAgentRows(matching[0], { revert });
  assert(JSON.stringify(layers[0]) === before, "Le layer d'index 0 a été modifié : abandon.");

  await fs.mkdir(path.dirname(path.resolve(destination)), { recursive: true });
  const output = `${JSON.stringify(raw, null, 2)}\n`;
  await fs.writeFile(destination, output);

  process.stdout.write(
    `Layer « ${CLAUDE_LAYER_NAME} » à l'index ${index}, lien AppSense ${matching[0].linkedAppId ?? "absent"} conservé.\n`,
  );
  process.stdout.write(changes.length ? `${changes.join("\n")}\n` : "  aucune modification nécessaire\n");
  process.stdout.write(
    `\n${redactHome(path.resolve(destination))}\n` +
      `SHA-256 ${createHash("sha256").update(output).digest("hex")}\n\n` +
      "Importer par Input > Import Profile, puis vérifier sur le layer Claude :\n" +
      "  npm run lighting -- set all #00FF00 --effect=solid\n",
  );
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(`${error.stack ?? String(error)}\n`);
  process.exitCode = 1;
});
