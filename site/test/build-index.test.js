import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { chunkContent, buildQaIndex } from "../scripts/build-index.mjs";
import { buildIndex, search } from "../src/lib/bm25.mjs";

const root = fileURLToPath(new URL("./fixtures/qa-root", import.meta.url));

test("chunkContent emits a summary chunk plus one chunk per H2, published only", () => {
  const corpus = chunkContent(loadContent(root));
  const ids = corpus.map((c) => c.id);
  assert.ok(ids.includes("reranker-demo#summary"));
  assert.ok(ids.includes("reranker-demo#technique"));
  assert.ok(ids.includes("reranker-demo#how-to-replicate"));
  // draft-demo (status: draft) contributes nothing
  assert.ok(!ids.some((id) => id.startsWith("draft-demo")));
  // the summary chunk folds in the frontmatter result
  const summary = corpus.find((c) => c.id === "reranker-demo#summary");
  assert.match(summary.text, /ndcg@10/);
  assert.equal(summary.section, "Summary");
});

test("buildQaIndex returns a searchable index over the fixture corpus", () => {
  const index = buildQaIndex(root);
  assert.ok(index.chunks.length >= 4);
  const hits = search(index, "cross encoder reranker", 3);
  assert.equal(hits[0].slug, "reranker-demo");
  // a draft phrase is unfindable
  assert.deepEqual(search(index, "unindexable", 3), []);
});

test("qa-index JSON round-trip preserves prototype-named tokens (e.g. 'constructor')", () => {
  const idx = buildIndex([
    { id: "proto#summary", slug: "proto", tier: "finding", section: "Summary",
      text: "Override the constructor to inject the tokenizer into the class" }
  ]);
  const revived = JSON.parse(JSON.stringify(idx));
  const hits = search(revived, "constructor", 5);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].slug, "proto");
  assert.ok(Number.isFinite(hits[0].score) && hits[0].score > 0);
});
