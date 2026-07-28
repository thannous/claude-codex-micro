import { existsSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDirectory = resolve(repositoryRoot, "prototype");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const viteExecutable = resolve(
  guiDirectory,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "vite.cmd" : "vite",
);

if (!existsSync(resolve(guiDirectory, "package.json"))) {
  console.error("Interface introuvable : prototype/package.json est absent.");
  process.exit(1);
}

if (!existsSync(viteExecutable)) {
  console.log("Première ouverture : préparation de l’interface…");
  const install = spawnSync(npmCommand, ["ci", "--no-audit", "--no-fund"], {
    cwd: guiDirectory,
    stdio: "inherit",
  });

  if (install.error) {
    console.error(`Impossible de préparer l’interface : ${install.error.message}`);
    process.exit(1);
  }

  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }
}

console.log("Ouverture du configurateur Codex Micro…");

const gui = spawn(
  npmCommand,
  [
    "run",
    "dev",
    "--",
    "--host",
    "127.0.0.1",
    "--open",
    ...process.argv.slice(2),
  ],
  {
    cwd: guiDirectory,
    stdio: "inherit",
  },
);

gui.on("error", (error) => {
  console.error(`Impossible de lancer l’interface : ${error.message}`);
  process.exit(1);
});

gui.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
