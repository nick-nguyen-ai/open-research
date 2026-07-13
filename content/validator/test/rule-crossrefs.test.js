import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/rules/crossrefs.js";

function content(overrides = {}) {
  return {
    root: "/fake",
    contributions: [
      {
        dirName: "prompt-cache-evals", dir: "d", file: "contrib.md",
        frontmatter: { id: "prompt-cache-evals", benchmarks: ["internal-eval-suite"], related: { internal: [] } },
        body: "", raw: ""
      }
    ],
    replications: [],
    endorsements: [],
    benchmarks: [{ file: "b.yaml", data: { id: "internal-eval-suite" } }],
    errors: [],
    ...overrides
  };
}

test("all references resolving produces no findings", () => {
  assert.deepEqual(check(content()), []);
});

test("replication pointing at unknown contribution is flagged", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "ghost", benchmark_id: "internal-eval-suite" } }]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "crossref");
  assert.match(findings[0].message, /ghost/);
});

test("unknown benchmark refs are flagged from records and frontmatter", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "prompt-cache-evals", benchmark_id: "nope" } }]
  });
  c.contributions[0].frontmatter.benchmarks = ["also-nope"];
  const findings = check(c);
  assert.equal(findings.length, 2);
});

test("unknown related.internal id is flagged", () => {
  const c = content();
  c.contributions[0].frontmatter.related.internal = ["missing-friend"];
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /missing-friend/);
});
