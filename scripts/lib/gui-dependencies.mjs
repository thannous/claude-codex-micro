import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

export function ensureGuiDependencies(
  guiDirectory,
  {
    exists = existsSync,
    spawn = spawnSync,
    platform = process.platform,
    log = console.log,
  } = {},
) {
  const npmCommand = platform === "win32" ? "npm.cmd" : "npm";
  const packageJson = resolve(guiDirectory, "package.json");
  const viteExecutable = resolve(
    guiDirectory,
    "node_modules",
    ".bin",
    platform === "win32" ? "vite.cmd" : "vite",
  );

  if (!exists(packageJson)) {
    throw new Error("Interface not found: prototype/package.json is missing.");
  }

  if (exists(viteExecutable)) {
    return { installed: false };
  }

  log("Preparing the interface's locked dependencies…");
  const install = spawn(
    npmCommand,
    ["ci", "--ignore-scripts", "--no-audit", "--no-fund"],
    {
      cwd: guiDirectory,
      stdio: "inherit",
    },
  );

  if (install.error) {
    throw new Error(`Could not prepare the interface: ${install.error.message}`);
  }

  if (install.status !== 0) {
    const error = new Error(`Preparing the interface failed with code ${install.status ?? 1}.`);
    error.exitCode = install.status ?? 1;
    throw error;
  }

  return { installed: true };
}
