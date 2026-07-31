import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = fileURLToPath(new URL("../src", import.meta.url));
const sourceExtensions = new Set([".js", ".jsx"]);

async function sourceFiles(directory = sourceRoot) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(target);
    return sourceExtensions.has(path.extname(entry.name)) ? [target] : [];
  }));
  return nested.flat();
}

function localDependencies(file, source) {
  const dependencies = [];
  const imports = source.matchAll(/(?:from\s+|import\s*\()(["'])(\.\.?\/[^"']+)\1/g);
  for (const match of imports) {
    const resolved = path.resolve(path.dirname(file), match[2]);
    dependencies.push(resolved);
  }
  return dependencies;
}

test("the configurator source graph stays acyclic", async () => {
  const files = await sourceFiles();
  const knownFiles = new Set(files);
  const graph = new Map();

  for (const file of files) {
    const source = await readFile(file, "utf8");
    graph.set(
      file,
      localDependencies(file, source).filter((dependency) => knownFiles.has(dependency)),
    );
  }

  const visiting = new Set();
  const visited = new Set();
  function visit(file, ancestry = []) {
    if (visiting.has(file)) {
      assert.fail(`Circular dependency: ${[...ancestry, file].map(path.basename).join(" -> ")}`);
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of graph.get(file) ?? []) visit(dependency, [...ancestry, file]);
    visiting.delete(file);
    visited.add(file);
  }

  for (const file of files) visit(file);
  assert.equal(visited.size, files.length);
});

test("hardware profile mutation remains behind the profile workflow boundary", async () => {
  const files = await sourceFiles();
  const forbiddenOutsideWorkflow =
    /\b(?:addClaudeLayer|buildInputProfile|deriveMappingFromProfile|inspectInputProfile)\b/;
  const violations = [];

  for (const file of files) {
    if (path.basename(file) === "profile-workflow.js") continue;
    const source = await readFile(file, "utf8");
    if (forbiddenOutsideWorkflow.test(source)) {
      violations.push(path.relative(sourceRoot, file));
    }
  }

  assert.deepEqual(violations, []);
});
