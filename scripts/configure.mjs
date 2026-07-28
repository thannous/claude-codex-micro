import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureGuiDependencies } from "./lib/gui-dependencies.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const guiDirectory = resolve(repositoryRoot, "prototype");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

try {
  ensureGuiDependencies(guiDirectory);
} catch (error) {
  console.error(error.message);
  process.exit(error.exitCode ?? 1);
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
