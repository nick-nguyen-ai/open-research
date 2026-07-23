// Ask-on-Browse pure logic - intent parsing, ranking, reply composition.
// Zero dependencies beyond sibling pure modules; no fetch, no DOM, no React.
// askEngine(turns, activeChips, deps) is the phase 2 seam: a backend engine
// must return the same { reply, rankedSlugs, detectedChips } shape.
import { tokenize, search } from "../../lib/bm25.mjs";
import { tierLabel } from "../../lib/format.mjs";
import { applyFilter } from "./filter-logic.mjs";

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

// Per-document aggregation of chunk hits. Doc score = max chunk score;
// tie-break by matching-chunk count, then slug. Chip filtering happens
// before aggregation so an excluded doc never appears.
export function rankDocs(index, terms, activeChips, cards) {
  if (terms.length === 0) return [];
  const allowed = new Set(applyFilter(cards, activeChips).map((c) => c.slug));
  const hits = search(index, terms.join(" "), index.chunks.length)
    .filter((h) => allowed.has(h.slug));
  const bySlug = new Map();
  for (const h of hits) {
    let d = bySlug.get(h.slug);
    if (!d) { d = { slug: h.slug, score: 0, chunks: 0, hits: [] }; bySlug.set(h.slug, d); }
    d.chunks += 1;
    if (h.score > d.score) d.score = h.score;
    d.hits.push(h);
  }
  const ranked = [...bySlug.values()].map((d) => ({
    slug: d.slug,
    score: d.score,
    chunks: d.chunks,
    sections: d.hits.sort((a, b) => b.score - a.score).slice(0, 3).map((h) => h.section)
  }));
  ranked.sort((a, b) => b.score - a.score || b.chunks - a.chunks || a.slug.localeCompare(b.slug));
  return ranked;
}

// Template text for the assistant band. detected holds display values
// (null = facet unset); filteredCount is the chip-filtered fallback count.
export function composeReply({ terms, detected, ranked, cards, filteredCount }) {
  const facets = [];
  if (detected.tier) facets.push(tierLabel(detected.tier));
  if (detected.category) facets.push(detected.category);
  if (detected.tag) facets.push(`#${detected.tag}`);
  const facetText = facets.length ? ` Filters: ${facets.join(", ")}.` : "";
  const plural = (n) => (n === 1 ? "" : "s");
  if (terms.length === 0) {
    if (facets.length === 0) {
      return "Tell me a bit about what you are working on and I will rank the record for you.";
    }
    return `Filtering by ${facets.join(", ")} - ${filteredCount} contribution${plural(filteredCount)} shown. Add more detail and I will rank them by relevance.`;
  }
  if (ranked.length === 0) {
    return `Nothing in the record scores against "${terms.join(" ")}" with the current filters.${facetText} Try removing a chip or rephrasing - showing the ${filteredCount} chip-filtered contribution${plural(filteredCount)} meanwhile.`;
  }
  const top = ranked[0];
  const card = cards.find((c) => c.slug === top.slug);
  const why = top.sections.length ? ` - matching sections: ${top.sections.join(", ")}` : "";
  const metric = card && card.result ? ` (${card.result})` : "";
  const n = ranked.length;
  return `${n} contribution${plural(n)} match "${terms.join(" ")}".${facetText} Strongest match: "${card ? card.title : top.slug}"${metric}${why}.`;
}

// Orchestrator and phase 2 seam. turns: raw user messages (string[]).
// activeChips: current chip state in applyFilter conventions - already
// includes anything the island applied from the latest turn, so chips are
// ground truth here and detection is only re-derived for reporting.
// Ranking query = free terms plus detected facet values: a facet word like
// "latency" both sets the chip and carries the strongest ranking signal, so
// stripping it from the query would leave messages like "something about
// latency" with nothing meaningful to score.
export function askEngine(turns, activeChips, deps) {
  const { index, cards, filters } = deps;
  const parsed = turns.map((m) => parseIntent(m, filters));
  const facetTerms = parsed.map((p) =>
    [p.detected.tier, p.detected.category, p.detected.tag]
      .filter(Boolean)
      .flatMap((v) => tokenize(v.replace(/-/g, " ")))
  );
  const terms = accumulateTerms([...parsed.map((p) => p.terms), ...facetTerms]);
  const last = parsed[parsed.length - 1];
  const detectedChips = last ? last.detected : { tier: null, category: null, tag: null };
  const ranked = rankDocs(index, terms, activeChips, cards);
  const filteredCount = applyFilter(cards, activeChips).length;
  const detected = {
    tier: activeChips.tier !== "all" ? activeChips.tier : null,
    category: activeChips.category !== "all" ? activeChips.category : null,
    tag: activeChips.tag ?? null
  };
  const reply = composeReply({ terms, detected, ranked, cards, filteredCount });
  return { reply, rankedSlugs: ranked.map((r) => r.slug), detectedChips };
}
