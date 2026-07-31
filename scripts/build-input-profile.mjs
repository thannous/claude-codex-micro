#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildInputProfile } from "../shared/input-profile.mjs";

const positional = [];
const options = {};

for (const argument of process.argv.slice(2)) {
  const match = /^--(app-sense-id|base-layer-app-sense-id)=(.*)$/.exec(argument);
  if (!match) {
    positional.push(argument);
    continue;
  }
  const value = Number(match[2]);
  if (!Number.isInteger(value) || value < 0) {
    console.error(`Invalid value for --${match[1]}: ${match[2]}`);
    process.exit(1);
  }
  options[match[1] === "app-sense-id" ? "appSenseId" : "baseLayerAppSenseId"] = value;
}

const [inputArgument, outputArgument] = positional;

if (!inputArgument || !outputArgument) {
  console.error(
    `Usage: node scripts/build-input-profile.mjs <sauvegarde-profile.json> <sortie-profile.json> [options]

Options:
  --app-sense-id=<n>             Force la référence AppSense du layer Claude au
                                 lieu de reprendre celle de la source. Dispense
                                 d'exiger un lien dans la sauvegarde : sert à
                                 réparer un lien perdu.
  --base-layer-app-sense-id=<n>  Lie le layer natif à une seconde application,
                                 pour pouvoir quitter le layer Claude. Le keymap
                                 natif reste intact.

Ces deux options écrivent une référence, jamais une entrée : l'entrée linkedApps
correspondante doit déjà exister sur la carte, créée dans l'UI d'Input. Une
référence vers une entrée absente s'importe sans erreur et laisse AppSense mort.`,
  );
  process.exit(1);
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const source = JSON.parse(await readFile(inputPath, "utf8"));
const { profile, report } = buildInputProfile(source, undefined, options);

await writeFile(outputPath, `${JSON.stringify(profile, null, 2)}\n`, {
  flag: "wx",
});

console.log(`OK: Input profile written to ${outputPath}`);
console.log(
  `Layer ${report.layerName}; ${report.preservedLayers} layer(s) preserved; AppSense preserved`,
);
console.log(
  `Claude layer AppSense link: ${report.appSenseId ?? "none"}` +
    `${report.appSenseForced ? " (forced)" : ""}`,
);
if (report.baseLayerAppSenseId !== null) {
  console.log(
    `Lien AppSense du layer natif : ${report.baseLayerAppSenseId} — permet de quitter le layer Claude`,
  );
}
