import test from "node:test";
import assert from "node:assert/strict";
import { buildIndex } from "../src/lib/bm25.mjs";
import { parseIntent, accumulateTerms, rankDocs, composeReply, askEngine } from "../src/components/islands/ask-logic.mjs";

// Vocabulary shaped like site/src/data/filters.json (counts omitted - unused).
const filters = {
  tiers: [{ value: "technical-report" }, { value: "tutorial" }, { value: "note" }],
  categories: [{ value: "evals" }, { value: "tooling" }],
  tags: [{ value: "latency" }, { value: "drift" }, { value: "evals" }]
};

test("parseIntent detects tier by raw value and by label form", () => {
  assert.equal(parseIntent("a technical-report on queues", filters).detected.tier, "technical-report");
  assert.equal(parseIntent("a technical report on queues", filters).detected.tier, "technical-report");
});

test("parseIntent detects category and tag as whole words only", () => {
  const p = parseIntent("tooling for latency problems", filters);
  assert.equal(p.detected.category, "tooling");
  assert.equal(p.detected.tag, "latency");
  // substring must not match: "notebook" contains "note"
  assert.equal(parseIntent("my notebook setup", filters).detected.tier, null);
});

test("parseIntent facet precedence: category wins over tag for a shared word", () => {
  const p = parseIntent("anything about evals", filters);
  assert.equal(p.detected.category, "evals");
  assert.equal(p.detected.tag, null);
});

test("parseIntent strips detected phrases and stopwords from terms", () => {
  const p = parseIntent("a tutorial about latency in batch inference", filters);
  assert.equal(p.detected.tier, "tutorial");
  assert.equal(p.detected.tag, "latency");
  assert.deepEqual(p.terms, ["about", "batch", "inference"]);
});

test("parseIntent returns empty detection for plain prose", () => {
  const p = parseIntent("reducing costs of long prompts", filters);
  assert.deepEqual(p.detected, { tier: null, category: null, tag: null });
  assert.deepEqual(p.terms, ["reducing", "costs", "long", "prompts"]);
});

test("accumulateTerms unions across turns, dedupes, keeps first-seen order", () => {
  assert.deepEqual(
    accumulateTerms([["batch", "inference"], ["latency", "batch"]]),
    ["batch", "inference", "latency"]
  );
  assert.deepEqual(accumulateTerms([]), []);
});

const cards = [
  { slug: "queueing", title: "Priority queue halved p99", tier: "technical-report", category: "tooling", tags: ["latency"], result: "-52% p99 latency" },
  { slug: "rubric-drift", title: "Judge rubric drifts", tier: "note", category: "evals", tags: ["drift"], result: null },
  { slug: "chunking-tutorial", title: "Heading-aware chunking", tier: "tutorial", category: "tooling", tags: [], result: null }
];

const index = buildIndex([
  { id: "queueing#summary", slug: "queueing", tier: "technical-report", section: "Summary", text: "Priority queue batching cut p99 latency for batch inference" },
  { id: "queueing#method", slug: "queueing", tier: "technical-report", section: "Method", text: "queue sizes batching latency replay production traffic" },
  { id: "rubric-drift#summary", slug: "rubric-drift", tier: "note", section: "Summary", text: "llm judge rubric drift pin diff every run" },
  { id: "chunking-tutorial#summary", slug: "chunking-tutorial", tier: "tutorial", section: "Summary", text: "heading aware chunking improves retrieval quality" }
]);

const noChips = { tier: "all", category: "all", tag: null };

test("rankDocs aggregates chunks to one doc with max score and section list", () => {
  const ranked = rankDocs(index, ["latency", "batching"], noChips, cards);
  assert.equal(ranked[0].slug, "queueing");
  assert.equal(ranked[0].chunks, 2);
  assert.deepEqual([...ranked[0].sections].sort(), ["Method", "Summary"]);
  const both = index.chunks
    .filter((c) => c.slug === "queueing")
    .map((c) => c.id);
  assert.equal(both.length, 2); // fixture sanity: both chunks exist
});

test("rankDocs respects active chips - excluded docs never appear", () => {
  const ranked = rankDocs(index, ["latency"], { tier: "note", category: "all", tag: null }, cards);
  assert.deepEqual(ranked.map((r) => r.slug), []);
});

test("rankDocs with empty terms returns empty", () => {
  assert.deepEqual(rankDocs(index, [], noChips, cards), []);
});

test("composeReply names top match, sections, and result metric", () => {
  const ranked = rankDocs(index, ["latency"], noChips, cards);
  const reply = composeReply({ terms: ["latency"], detected: { tier: null, category: null, tag: null }, ranked, cards, filteredCount: 3 });
  assert.match(reply, /Priority queue halved p99/);
  assert.match(reply, /-52% p99 latency/);
  assert.match(reply, /Summary/);
});

test("composeReply no-match text suggests removing chips", () => {
  const reply = composeReply({ terms: ["quantum"], detected: { tier: null, category: "evals", tag: null }, ranked: [], cards, filteredCount: 1 });
  assert.match(reply, /removing a chip|rephras/i);
});

test("composeReply with facets only asks for more detail", () => {
  const reply = composeReply({ terms: [], detected: { tier: "tutorial", category: null, tag: null }, ranked: [], cards, filteredCount: 1 });
  assert.match(reply, /more detail/i);
  assert.match(reply, /Tutorial/);
});

test("askEngine end to end: reply, rankedSlugs, detectedChips", () => {
  const out = askEngine(["something about latency"], noChips, { index, cards, filters });
  assert.equal(out.rankedSlugs[0], "queueing");
  assert.equal(out.detectedChips.tag, "latency");
  assert.match(out.reply, /Priority queue halved p99/);
});

test("askEngine multi-turn accumulation refines ranking", () => {
  const one = askEngine(["judge rubric"], noChips, { index, cards, filters });
  assert.equal(one.rankedSlugs[0], "rubric-drift");
  const two = askEngine(["judge rubric", "drift pinning"], noChips, { index, cards, filters });
  assert.equal(two.rankedSlugs[0], "rubric-drift");
  assert.equal(two.detectedChips.tag, "drift"); // detection comes from the latest turn
});

test("askEngine chip override: hand-set chip survives a turn detecting nothing", () => {
  const chips = { tier: "note", category: "all", tag: null };
  const out = askEngine(["rubric pinning"], chips, { index, cards, filters });
  assert.deepEqual(out.rankedSlugs, ["rubric-drift"]); // queueing filtered out by hand-set tier
  assert.equal(out.detectedChips.tier, null); // nothing detected, nothing overridden
});
