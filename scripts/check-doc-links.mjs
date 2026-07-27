#!/usr/bin/env node

import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirectories = new Set([".git", "node_modules", "outputs", "work"]);
const markdownFiles = [];
const errors = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await collect(entryPath);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      markdownFiles.push(entryPath);
    }
  }
}

await collect(root);

for (const markdownPath of markdownFiles) {
  const contents = await readFile(markdownPath, "utf8");
  const links = contents.matchAll(/\[[^\]]*]\(([^)]+)\)/g);

  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      rawTarget.startsWith("#") ||
      rawTarget.startsWith("http://") ||
      rawTarget.startsWith("https://") ||
      rawTarget.startsWith("mailto:")
    ) {
      continue;
    }

    const fileTarget = decodeURIComponent(rawTarget.split("#", 1)[0]);
    if (!fileTarget) continue;

    const resolvedTarget = path.resolve(path.dirname(markdownPath), fileTarget);
    try {
      await access(resolvedTarget);
    } catch {
      errors.push(
        `${path.relative(root, markdownPath)} -> missing ${rawTarget}`,
      );
    }
  }
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR: ${error}`);
  process.exitCode = 1;
} else {
  console.log(`OK: local links checked in ${markdownFiles.length} Markdown files`);
}
