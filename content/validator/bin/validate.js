#!/usr/bin/env node
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runValidation } from "../src/runner.js";

const defaultRoot = fileURLToPath(new URL("../..", import.meta.url)); // content/
const root = resolve(process.argv[2] ?? defaultRoot);

const findings = runValidation(root);

if (findings.length === 0) {
  console.log(`✓ content validation passed (${root})`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${relative(process.cwd(), f.file)}  [${f.rule}]  ${f.message}`);
}
console.error(`\n✗ ${findings.length} problem(s) found`);
process.exit(1);
