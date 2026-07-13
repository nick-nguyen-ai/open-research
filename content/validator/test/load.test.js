import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/load.js";

const root = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));

test("loads contributions with parsed frontmatter and body", () => {
  const content = loadContent(root);
  assert.equal(content.errors.length, 0);
  assert.equal(content.contributions.length, 1);
  const c = content.contributions[0];
  assert.equal(c.dirName, "prompt-cache-evals");
  assert.equal(c.frontmatter.tier, "finding");
  assert.match(c.body, /## Summary/);
});

test("normalizes unquoted YAML dates to strings", () => {
  const content = loadContent(root);
  assert.equal(content.contributions[0].frontmatter.created, "2026-07-13");
});

test("loads replication and benchmark records", () => {
  const content = loadContent(root);
  assert.equal(content.replications.length, 1);
  assert.equal(content.replications[0].data.outcome, "replicated");
  assert.equal(content.benchmarks.length, 1);
  assert.equal(content.benchmarks[0].data.id, "internal-eval-suite");
});

test("missing directories yield empty arrays, not errors", () => {
  const content = loadContent(root);
  assert.deepEqual(content.endorsements, []);
});
