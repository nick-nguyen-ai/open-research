import { readFileSync, readdirSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const SCHEMA_DIR = new URL("../../schemas/", import.meta.url);

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validators = {};
for (const file of readdirSync(SCHEMA_DIR)) {
  if (!file.endsWith(".schema.json")) continue;
  const schema = JSON.parse(readFileSync(new URL(file, SCHEMA_DIR), "utf8"));
  validators[file.replace(".schema.json", "")] = ajv.compile(schema);
}

export function getValidator(name) {
  const v = validators[name];
  if (!v) throw new Error(`No schema named "${name}" in content/schemas/`);
  return v;
}

export function formatErrors(errors) {
  return (errors ?? [])
    .map((e) => `${e.instancePath || "/"} ${e.message}`)
    .join("; ");
}
