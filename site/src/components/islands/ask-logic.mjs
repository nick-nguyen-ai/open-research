// Ask-on-Browse pure logic - intent parsing, ranking, reply composition.
// Zero dependencies beyond sibling pure modules; no fetch, no DOM, no React.
// askEngine(turns, activeChips, deps) is the phase 2 seam: a backend engine
// must return the same { reply, rankedSlugs, detectedChips } shape.
import { tokenize } from "../../lib/bm25.mjs";
import { tierLabel } from "../../lib/format.mjs";

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Whole-word match of the first facet value found in text. Returns the value
// and the text with the matched phrase removed, so later facets and the term
// list never see it. Word boundaries are lookarounds because values may
// contain hyphens ("technical-report").
function detectFacet(text, values, labelFn) {
  for (const value of values) {
    const forms = new Set([value, value.replace(/-/g, " ")]);
    if (labelFn) forms.add(labelFn(value).toLowerCase());
    for (const form of forms) {
      const re = new RegExp(`(?<![a-z0-9])${escapeRe(form)}(?![a-z0-9])`);
      if (re.test(text)) return { value, text: text.replace(re, " ") };
    }
  }
  return { value: null, text };
}

// filters: { tiers: [{value}], categories: [{value}], tags: [{value}] } -
// the shape of site/src/data/filters.json. Precedence tier > category > tag.
export function parseIntent(message, filters) {
  let text = String(message).toLowerCase();
  const tier = detectFacet(text, filters.tiers.map((t) => t.value), tierLabel);
  text = tier.text;
  const category = detectFacet(text, filters.categories.map((c) => c.value));
  text = category.text;
  const tag = detectFacet(text, filters.tags.map((t) => t.value));
  text = tag.text;
  return {
    terms: tokenize(text),
    detected: { tier: tier.value, category: category.value, tag: tag.value }
  };
}

// Deduplicated union of per-turn term lists, first-seen order.
export function accumulateTerms(termLists) {
  const seen = new Set();
  for (const terms of termLists) for (const t of terms) seen.add(t);
  return [...seen];
}
