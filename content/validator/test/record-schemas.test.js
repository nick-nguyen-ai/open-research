import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator } from "../src/schemas.js";

const replication = {
  contribution_id: "prompt-cache-evals",
  replicator: { name: "Ada", team: "Payments Engineering" },
  benchmark_id: "internal-eval-suite",
  method: "Re-ran the bundle against our payments eval set with cache enabled.",
  outcome: "replicated",
  measured_delta: "eval cost -55%, latency unchanged",
  date: "2026-07-20"
};

test("accepts valid replication", () => {
  assert.equal(getValidator("replication")(replication), true);
});

test("replication requires benchmark_id or workflow", () => {
  const { benchmark_id, ...rest } = replication;
  const v = getValidator("replication");
  assert.equal(v(rest), false);
  assert.equal(v({ ...rest, workflow: "our internal triage eval harness" }), true);
});

test("rejects replication with unknown outcome", () => {
  assert.equal(getValidator("replication")({ ...replication, outcome: "maybe" }), false);
});

test("accepts valid endorsement and adoption", () => {
  const v = getValidator("endorsement");
  const base = {
    contribution_id: "prompt-cache-evals",
    by: { name: "Grace", team: "Cards" },
    statement: "We adopted this in our nightly eval pipeline last sprint.",
    date: "2026-07-21"
  };
  assert.equal(v({ ...base, type: "endorsement" }), true);
  assert.equal(v({ ...base, type: "adoption", pipeline: "cards-nightly-evals" }), true);
  assert.equal(v({ ...base, type: "like" }), false);
});

test("accepts valid benchmark and rejects one without metrics", () => {
  const v = getValidator("benchmark");
  const bench = {
    id: "internal-eval-suite",
    owner: { name: "Nick", team: "Model Validation" },
    description: "Shared regression eval suite for validation prompts.",
    data_pointer: "ghe://model-validation/eval-suite",
    metrics: [{ name: "accuracy", definition: "exact-match over gold labels", higher_is_better: true }]
  };
  assert.equal(v(bench), true);
  assert.equal(v({ ...bench, metrics: [] }), false);
});
