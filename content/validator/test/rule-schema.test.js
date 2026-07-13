import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/rules/schema.js";

const goodFm = {
  id: "prompt-cache-evals",
  title: "Prompt caching cut our eval suite cost by 60%",
  tier: "finding",
  authors: [{ name: "Nick", team: "Model Validation" }],
  category: "evals",
  tags: ["caching"],
  status: "published",
  created: "2026-07-13",
  updated: "2026-07-13"
};

function content(overrides = {}) {
  return {
    root: "/fake",
    contributions: [],
    replications: [],
    endorsements: [],
    benchmarks: [],
    errors: [],
    ...overrides
  };
}

test("valid content produces no findings", () => {
  const c = content({
    contributions: [
      { dirName: "prompt-cache-evals", dir: "d", file: "f", frontmatter: goodFm, body: "", raw: "" }
    ]
  });
  assert.deepEqual(check(c), []);
});

test("flags frontmatter that fails the schema", () => {
  const c = content({
    contributions: [
      { dirName: "x", dir: "d", file: "f", frontmatter: { ...goodFm, tier: "paper" }, body: "", raw: "" }
    ]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "schema");
});

test("flags id/directory mismatch", () => {
  const c = content({
    contributions: [
      { dirName: "wrong-name", dir: "d", file: "f", frontmatter: goodFm, body: "", raw: "" }
    ]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /must match directory name/);
});

test("validates records against their schemas", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "x" } }],
    benchmarks: [{ file: "b.yaml", data: { id: "not valid caps" } }]
  });
  const findings = check(c);
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.rule === "schema"));
});
