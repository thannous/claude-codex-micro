import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readSchema(relativePath) {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8"));
}

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
});

const manifestValidator = ajv.compile(
  readSchema("profiles/schema/v1/preset-manifest.schema.json"),
);
const mappingValidator = ajv.compile(
  readSchema("profiles/schema/v1/layer-mapping.schema.json"),
);
const logicalProfileValidator = ajv.compile(
  readSchema("profiles/claude-shortcuts/schema.json"),
);

function formatErrors(label, errors = []) {
  return errors.map((error) => {
    const location = error.instancePath || "/";
    return `${label}${location} ${error.message}`;
  });
}

function run(validator, label, value) {
  return validator(value) ? [] : formatErrors(label, validator.errors);
}

export function validatePresetSchemas(manifest, mapping) {
  return [
    ...run(manifestValidator, "manifest", manifest),
    ...run(mappingValidator, "mapping", mapping),
  ];
}

export function validateLogicalProfileSchema(profile) {
  return run(logicalProfileValidator, "logical profile", profile);
}
