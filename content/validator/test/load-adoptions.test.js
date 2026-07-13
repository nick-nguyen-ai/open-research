import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/load.js";
import { runValidation } from "../src/runner.js";

const root = fileURLToPath(new URL("./fixtures/adoption-root/", import.meta.url));

test("loader exposes content.adoptions as an additive array", () => {
  const content = loadContent(root);
  assert.ok(Array.isArray(content.adoptions), "content.adoptions must exist");
  assert.equal(content.adoptions.length, 2);
  const active = content.adoptions.find((a) => a.data.status === "active");
  assert.equal(active.data.adopter.team, "markets-analytics");
});

test("loader still returns the frozen keys unchanged", () => {
  const content = loadContent(root);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "errors"]) {
    assert.ok(k in content, `content.${k} must still exist`);
  }
});

test("crossref flags an adoption pointing at an unknown contribution", () => {
  const findings = runValidation(root);
  const ghost = findings.find((f) => f.rule === "crossref" && /ghost-contribution/.test(f.message));
  assert.ok(ghost, "expected a crossref finding for the ghost adoption");
});

test("the valid adoption produces no schema finding", () => {
  const findings = runValidation(root);
  const schemaOnAdoption = findings.find(
    (f) => f.rule === "schema" && /adoptions[\\/]prompt-cache-evals/.test(f.file)
  );
  assert.equal(schemaOnAdoption, undefined);
});
