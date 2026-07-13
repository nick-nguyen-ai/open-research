import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { deriveWatchlist, deriveBenchmarks } from "../scripts/derive.mjs";
import { buildQaIndex } from "../scripts/build-index.mjs";
import { buildDigest } from "../scripts/build-digest.mjs";
import { search } from "../src/lib/bm25.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));

test("qa-index: chunks + model shape; exact-term search ranks the right contribution", () => {
  const index = buildQaIndex(contentRoot);
  assert.ok(index.chunks.length >= 20);
  assert.deepEqual(Object.keys(index).sort(), ["chunks", "model"]);
  assert.deepEqual(Object.keys(index.model).sort(), ["N", "avgdl", "df", "docs"]);
  assert.deepEqual(Object.keys(index.chunks[0]).sort(), ["id", "section", "slug", "text", "tier", "tokens"]);
  const hits = search(index, "heading aware chunking policy documents", 3);
  assert.ok(hits.slice(0, 3).some((h) => h.slug === "heading-aware-chunking"), "heading-aware-chunking in top 3 for its own vocabulary");
});

test("watchlist.json: frozen row shape; a tested entry resolves its contribution", () => {
  const rows = deriveWatchlist(loadContent(contentRoot));
  assert.ok(rows.length >= 4);
  assert.deepEqual(Object.keys(rows[0]).sort(),
    ["added_by", "claimed_by", "id", "resulting_contribution", "source_url", "status", "title", "venue"]);
  const tested = rows.find((r) => r.status === "tested");
  assert.ok(tested && tested.resulting_contribution && tested.resulting_contribution.slug);
});

test("benchmarks.json: every registered benchmark joins its references", () => {
  const content = loadContent(contentRoot);
  const rows = deriveBenchmarks(content);
  assert.equal(rows.length, content.benchmarks.length);
  assert.deepEqual(Object.keys(rows[0]).sort(),
    ["contributions", "data_pointer", "description", "id", "metrics", "owner", "replications"]);
  assert.ok(rows.some((b) => b.contributions.length >= 1));
  assert.ok(rows.some((b) => b.replications.length >= 1));
});

test("digest.json: 7-day window anchored to latest activity; sections are arrays", () => {
  const d = buildDigest(loadContent(contentRoot));
  assert.deepEqual(Object.keys(d).sort(),
    ["adoptions", "anchor", "contributions", "generated", "movers", "replications", "window"]);
  assert.equal(d.window.end, d.anchor);
  for (const k of ["contributions", "replications", "adoptions", "movers"]) assert.ok(Array.isArray(d[k]));
});

test("frozen loader keys survive the watchlist addition", () => {
  const content = loadContent(contentRoot);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "adoptions", "watchlist", "errors"]) {
    assert.ok(k in content, `content.${k} must exist`);
  }
});
