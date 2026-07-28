import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export function ensureGuiDependencies(guiDirectory) {
  const packageJson = resolve(guiDirectory, "package.json");
  const viteExecutable = resolve(
    guiDirectory,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "vite.cmd" : "vite",
  );

  if (!existsSync(packageJson)) {
    throw new Error("Interface introuvable : prototype/package.json est absent.");
  }

  if (existsSync(viteExecutable)) {
    return { installed: false };
  }

  console.log("Préparation des dépendances verrouillées de l’interface…");
  const install = spawnSync(
    npmCommand,
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: guiDirectory,
      stdio: "inherit",
    },
  );

  if (install.error) {
    throw new Error(`Impossible de préparer l’interface : ${install.error.message}`);
  }

  if (install.status !== 0) {
    const error = new Error(`La préparation de l’interface a échoué avec le code ${install.status ?? 1}.`);
    error.exitCode = install.status ?? 1;
    throw error;
  }

  return { installed: true };
}
