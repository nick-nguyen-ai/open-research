import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { check } from "../src/rules/secrets.js";

const leakyRoot = fileURLToPath(new URL("./fixtures/secrets-root/", import.meta.url));
const cleanRoot = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));

const bare = (root) => ({
  root, contributions: [], replications: [], endorsements: [], benchmarks: [], errors: []
});

test("clean tree produces no findings", () => {
  assert.deepEqual(check(bare(cleanRoot)), []);
});

test("AWS key and assigned api_key are flagged with line numbers", () => {
  const findings = check(bare(leakyRoot));
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.rule === "secrets"));
  assert.match(findings[0].message, /aws-access-key/);
  assert.match(findings[0].message, /line 5/);
  assert.match(findings[1].message, /assigned-secret/);
  assert.match(findings[1].message, /line 7/);
});
