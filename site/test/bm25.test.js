import test from "node:test";
import assert from "node:assert/strict";
import { tokenize, buildIndex, search } from "../src/lib/bm25.mjs";

const corpus = [
  { id: "reranker#summary", slug: "reranker", tier: "finding", section: "Summary",
    text: "A lite cross encoder reranker lifts research retrieval without the latency tax" },
  { id: "reranker#method", slug: "reranker", tier: "finding", section: "Method",
    text: "We rerank the top candidates with a distilled cross encoder scoring model" },
  { id: "chunking#summary", slug: "chunking", tier: "tutorial", section: "Summary",
    text: "Heading aware chunking beats fixed windows on policy documents for retrieval" },
  { id: "caching#summary", slug: "caching", tier: "finding", section: "Summary",
    text: "Prompt prefix caching cut our eval suite cost in half with no quality change" }
];

test("tokenize lowercases, splits on non-alphanumerics, drops stopwords and 1-char tokens", () => {
  assert.deepEqual(tokenize("The Reranker, on a POLICY document."), ["reranker", "policy", "document"]);
});

test("buildIndex produces the frozen shape", () => {
  const index = buildIndex(corpus);
  assert.deepEqual(Object.keys(index).sort(), ["chunks", "model"]);
  assert.equal(index.chunks.length, 4);
  assert.deepEqual(Object.keys(index.chunks[0]).sort(), ["id", "section", "slug", "text", "tier", "tokens"]);
  assert.equal(typeof index.chunks[0].tokens, "number");
  assert.deepEqual(Object.keys(index.model).sort(), ["N", "avgdl", "df", "docs"]);
  assert.equal(index.model.N, 4);
  assert.equal(index.model.docs.length, 4);
  assert.ok(index.model.df.reranker >= 1);
});

test("search ranks an exact-term doc above unrelated docs, and respects k", () => {
  const index = buildIndex(corpus);
  const hits = search(index, "cross encoder reranker", 2);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].slug, "reranker");
  assert.ok(hits[0].score > 0);
  assert.equal(hits[0].path, "content/contributions/reranker/index.md");
  // an unrelated query returns the caching doc, not the reranker docs
  const cost = search(index, "eval cost caching", 1);
  assert.equal(cost[0].slug, "caching");
});

test("search returns [] when no query term matches any chunk", () => {
  const index = buildIndex(corpus);
  assert.deepEqual(search(index, "zzz nonexistent quux", 5), []);
});

test("prototype-named tokens (e.g. 'constructor') index and score correctly", () => {
  const idx = buildIndex([
    ...corpus,
    { id: "proto#summary", slug: "proto", tier: "finding", section: "Summary",
      text: "Override the constructor to inject the tokenizer into the class" }
  ]);
  const hits = search(idx, "constructor", 5);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].slug, "proto");
  assert.ok(Number.isFinite(hits[0].score) && hits[0].score > 0);
});

test("results carry only the frozen keys", () => {
  const index = buildIndex(corpus);
  const [hit] = search(index, "reranker", 1);
  assert.deepEqual(Object.keys(hit).sort(), ["id", "path", "score", "section", "slug", "text", "tier"]);
});
