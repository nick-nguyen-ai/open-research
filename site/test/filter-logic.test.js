import test from "node:test";
import assert from "node:assert/strict";
import { applyFilter } from "../src/components/islands/filter-logic.mjs";

const cards = [
  { slug: "a", tier: "finding", category: "evals", tags: ["caching"] },
  { slug: "b", tier: "tutorial", category: "rag", tags: ["chunking"] },
  { slug: "c", tier: "note", category: "evals", tags: ["drift", "caching"] }
];

test("no constraints returns all", () => {
  assert.equal(applyFilter(cards, { tier: "all", category: "all", tag: null }).length, 3);
});

test("tier and category constrain independently", () => {
  assert.deepEqual(applyFilter(cards, { tier: "finding", category: "all", tag: null }).map((c) => c.slug), ["a"]);
  assert.deepEqual(applyFilter(cards, { tier: "all", category: "evals", tag: null }).map((c) => c.slug), ["a", "c"]);
});

test("tag matches membership and combines with tier", () => {
  assert.deepEqual(applyFilter(cards, { tier: "all", category: "all", tag: "caching" }).map((c) => c.slug), ["a", "c"]);
  assert.deepEqual(applyFilter(cards, { tier: "note", category: "all", tag: "caching" }).map((c) => c.slug), ["c"]);
});
