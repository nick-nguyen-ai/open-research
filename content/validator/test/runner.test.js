import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { runValidation } from "../src/runner.js";

const validRoot = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));
const brokenRoot = fileURLToPath(new URL("./fixtures/broken-root/", import.meta.url));

test("valid fixture tree produces no findings", () => {
  assert.deepEqual(runValidation(validRoot), []);
});

test("broken fixture tree reports each expected rule", () => {
  const rules = new Set(runValidation(brokenRoot).map((f) => f.rule));
  for (const expected of ["schema", "template", "crossref", "links", "secrets"]) {
    assert.ok(rules.has(expected), `expected a "${expected}" finding`);
  }
});

test("real repo content validates clean", () => {
  const realRoot = fileURLToPath(new URL("../..", import.meta.url));
  assert.deepEqual(runValidation(realRoot), []);
});
