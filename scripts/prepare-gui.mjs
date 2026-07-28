#!/usr/bin/env node

import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureGuiDependencies } from "./lib/gui-dependencies.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDirectory = resolve(repositoryRoot, "prototype");

try {
  const result = ensureGuiDependencies(guiDirectory);
  console.log(result.installed ? "OK: dépendances GUI installées" : "OK: dépendances GUI déjà disponibles");
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode ?? 1;
}
