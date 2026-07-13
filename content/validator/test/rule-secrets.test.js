import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { check } from "../src/rules/secrets.js";

const leakyRoot = fileURLToPath(new URL("./fixtures/secrets-root/", import.meta.url));
const cleanRoot = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));
const dotfileRoot = fileURLToPath(new URL("./fixtures/secrets-dotfile-root/", import.meta.url));

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

test("dot-prefixed file with a scannable extension is scanned (not skipped)", () => {
  const findings = check(bare(dotfileRoot));
  const dotfileFindings = findings.filter((f) =>
    f.file.replace(/\\/g, "/").endsWith("contributions/somedir/.env.yaml")
  );
  assert.equal(dotfileFindings.length, 1);
  assert.equal(dotfileFindings[0].rule, "secrets");
  assert.match(dotfileFindings[0].message, /aws-access-key/);
  assert.match(dotfileFindings[0].message, /line 2/);
});

test("dot-prefixed directory is still skipped entirely", () => {
  const findings = check(bare(dotfileRoot));
  const hiddenFindings = findings.filter((f) => f.file.replace(/\\/g, "/").includes("/.hidden/"));
  assert.equal(hiddenFindings.length, 0);
});

test("private key in a .pem file is detected", () => {
  const findings = check(bare(dotfileRoot));
  const pemFindings = findings.filter((f) =>
    f.file.replace(/\\/g, "/").endsWith("keys/server.pem")
  );
  assert.equal(pemFindings.length, 1);
  assert.equal(pemFindings[0].rule, "secrets");
  assert.match(pemFindings[0].message, /private-key/);
  assert.match(pemFindings[0].message, /line 1/);
});
