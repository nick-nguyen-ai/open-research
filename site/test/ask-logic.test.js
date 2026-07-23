import test from "node:test";
import assert from "node:assert/strict";
import { parseIntent, accumulateTerms } from "../src/components/islands/ask-logic.mjs";

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
