import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { derive } from "../scripts/derive.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));
const noGit = { rev: () => null, log: () => [] };

test("evidence carries reviews[] additively with both reviewer kinds", () => {
  const { evidence } = derive(contentRoot, noGit);

  const human = evidence["heading-aware-chunking"].reviews;
  assert.equal(human.length, 1);
  assert.deepEqual(human[0].reviewer, { kind: "human", name: "Wei", team: "Model Validation" });
  assert.equal(human[0].override, null);
  assert.deepEqual(Object.keys(human[0].verdicts).sort(), ["claims_vs_evidence", "clarity", "reproducibility"]);

  const judged = evidence["speculative-decoding-latency"].reviews;
  assert.equal(judged.length, 1);
  assert.equal(judged[0].reviewer.kind, "llm-judge");
  assert.equal(judged[0].reviewer.model, "claude-fable-5");
  assert.equal(judged[0].suggestions.length, 1);
});

test("an override surfaces with attribution and reason", () => {
  const { evidence } = derive(contentRoot, noGit);
  const [rv] = evidence["prompt-compression-long-context"].reviews;
  assert.equal(rv.verdicts.claims_vs_evidence, "needs-work");
  assert.equal(rv.override.by, "Priyanka Nair · ib-quant");
  assert.ok(rv.override.reason.includes("pre-registered"));
});

test("cards carry the reviewStatus ladder: human > machine > none", () => {
  const { cards } = derive(contentRoot, noGit);
  const status = (slug) => cards.find((c) => c.slug === slug).reviewStatus;
  assert.equal(status("heading-aware-chunking"), "human");
  assert.equal(status("speculative-decoding-latency"), "machine");
  assert.equal(status("prompt-cache-evals"), "none");
});
