import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator } from "../src/schemas.js";
import { check as reviewCheck } from "../src/rules/reviews.js";

const human = {
  contribution_id: "heading-aware-chunking",
  reviewer: { kind: "human", name: "Wei", team: "Model Validation" },
  verdicts: { clarity: "strong", claims_vs_evidence: "adequate", reproducibility: "strong" },
  statement: "Followed the bundle end to end; the chunker reproduced the headline on our corpus.",
  date: "2026-07-15"
};

const judge = {
  contribution_id: "speculative-decoding-latency",
  reviewer: { kind: "llm-judge", model: "claude-fable-5" },
  verdicts: { clarity: "strong", claims_vs_evidence: "strong", reproducibility: "adequate" },
  statement: "Clear result, well-evidenced claims; replication steps assume the internal eval queue.",
  suggestions: ["bundle/README.md · name the queue prerequisites · replicators outside Risk lack them"],
  date: "2026-07-15"
};

test("accepts a valid human review", () => {
  assert.equal(getValidator("review")(human), true);
});

test("accepts a valid llm-judge review with suggestions", () => {
  assert.equal(getValidator("review")(judge), true);
});

test("rejects a human reviewer without a team, and a judge without a model", () => {
  const v = getValidator("review");
  assert.equal(v({ ...human, reviewer: { kind: "human", name: "Wei" } }), false);
  assert.equal(v({ ...judge, reviewer: { kind: "llm-judge" } }), false);
});

test("rejects an unknown verdict value and a missing axis", () => {
  const v = getValidator("review");
  assert.equal(v({ ...human, verdicts: { ...human.verdicts, clarity: "great" } }), false);
  const { reproducibility, ...twoAxes } = human.verdicts;
  assert.equal(v({ ...human, verdicts: twoAxes }), false);
});

test("accepts an override alongside a needs-work verdict", () => {
  const withOverride = {
    ...judge,
    verdicts: { ...judge.verdicts, claims_vs_evidence: "needs-work" },
    override: {
      by: { name: "Tomas Vidal", team: "risk-engineering" },
      reason: "Delta measured on our own bench; external replication is invited via the bundle.",
      date: "2026-07-15"
    }
  };
  assert.equal(getValidator("review")(withOverride), true);
  assert.deepEqual(reviewCheck({ reviews: [{ file: "x.yaml", data: withOverride }] }), []);
});

test("review rule flags an override with no needs-work verdict", () => {
  const pointless = {
    ...judge,
    override: {
      by: { name: "Tomas Vidal", team: "risk-engineering" },
      reason: "Publishing anyway although nothing was objected to in this review.",
      date: "2026-07-15"
    }
  };
  const findings = reviewCheck({ reviews: [{ file: "x.yaml", data: pointless }] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "review");
});

test("rejects more than five suggestions", () => {
  const many = { ...judge, suggestions: Array.from({ length: 6 }, (_, i) => `file.md · suggestion number ${i} padded out` ) };
  assert.equal(getValidator("review")(many), false);
});
