import test from "node:test";
import assert from "node:assert/strict";
import { deriveBenchmarks } from "../scripts/derive.mjs";

function content() {
  return {
    contributions: [
      { dirName: "reranker", frontmatter: { id: "reranker", title: "Reranker", status: "published", benchmarks: ["rerank-eval-set"] } },
      { dirName: "draft", frontmatter: { id: "draft", title: "Draft", status: "draft", benchmarks: ["rerank-eval-set"] } }
    ],
    benchmarks: [
      { file: "rerank-eval-set.yaml", data: {
        id: "rerank-eval-set", owner: { name: "Sofia", team: "markets-analytics" },
        description: "Reranking eval set with graded relevance labels.",
        data_pointer: "ghe://x", metrics: [{ name: "ndcg@10", definition: "ndcg at ten", higher_is_better: true }] } }
    ],
    replications: [
      { file: "r1.yaml", data: { contribution_id: "reranker", replicator: { name: "R", team: "risk" }, benchmark_id: "rerank-eval-set", outcome: "replicated", measured_delta: "+8pt", date: "2026-07-12" } }
    ],
    errors: []
  };
}

test("deriveBenchmarks joins published contributions + replications by benchmark id", () => {
  const [b] = deriveBenchmarks(content());
  assert.equal(b.id, "rerank-eval-set");
  assert.deepEqual(b.owner, { name: "Sofia", team: "markets-analytics" });
  assert.equal(b.metrics[0].higher_is_better, true);
  assert.deepEqual(b.contributions, [{ slug: "reranker", title: "Reranker" }]); // draft excluded
  assert.equal(b.replications.length, 1);
  assert.deepEqual(b.replications[0], { slug: "reranker", team: "risk", outcome: "replicated", delta: "+8pt", date: "2026-07-12" });
});
