import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/load.js";
import { runValidation } from "../src/runner.js";

const root = fileURLToPath(new URL("./fixtures/review-root/", import.meta.url));

test("loader exposes content.reviews as an additive array", () => {
  const content = loadContent(root);
  assert.ok(Array.isArray(content.reviews), "content.reviews must exist");
  assert.equal(content.reviews.length, 2);
  const judge = content.reviews.find((r) => r.data.reviewer.kind === "llm-judge");
  assert.equal(judge.data.reviewer.model, "claude-fable-5");
});

test("loader still returns the frozen keys unchanged", () => {
  const content = loadContent(root);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "adoptions", "watchlist", "errors"]) {
    assert.ok(k in content, `content.${k} must still exist`);
  }
});

test("crossref flags a review pointing at an unknown contribution", () => {
  const findings = runValidation(root);
  const ghost = findings.find((f) => f.rule === "crossref" && /ghost-contribution/.test(f.message));
  assert.ok(ghost, "expected a crossref finding for the ghost review");
});

test("the valid judge review produces no schema or review finding", () => {
  const findings = runValidation(root);
  const onJudge = findings.filter(
    (f) => (f.rule === "schema" || f.rule === "review") && /reviews[\\/]prompt-cache-evals/.test(f.file)
  );
  assert.deepEqual(onJudge, []);
});
