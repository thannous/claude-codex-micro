#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildInputProfile } from "../shared/input-profile.mjs";

const [inputArgument, outputArgument] = process.argv.slice(2);

if (!inputArgument || !outputArgument) {
  console.error(
    "Usage: node scripts/build-input-profile.mjs <sauvegarde-profile.json> <sortie-profile.json>",
  );
  process.exit(1);
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const source = JSON.parse(await readFile(inputPath, "utf8"));
const { profile, report } = buildInputProfile(source);

await writeFile(outputPath, `${JSON.stringify(profile, null, 2)}\n`, {
  flag: "wx",
});

console.log(`OK: profil Input créé dans ${outputPath}`);
console.log(
  `Layer ${report.layerName}; ${report.preservedLayers} layer(s) préservé(s); AppSense préservé`,
);
