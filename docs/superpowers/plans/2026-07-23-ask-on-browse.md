# Ask-on-Browse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A conversational document recommender on `/browse`: the visitor describes what they are working on, detected tier/category/tag mentions become the existing filter chips, and the card grid restricts and reorders by BM25 relevance over the committed `qa-index.json` - all client-side, no LLM, no backend.

**Architecture:** All logic lives in a new pure module `site/src/components/islands/ask-logic.mjs` (mirror of `filter-logic.mjs`: zero dependencies, imported by both the React island and bare `node --test` tests). `BrowseFilter.jsx` grows an ask bar and assistant band and calls one seam, `askEngine(turns, activeChips, deps)`, which phase 2 later re-points at a backend. Styles are scoped in `browse.astro` next to the existing `bf-*` rules.

**Tech Stack:** Astro 5 static site, React island (`client:load`), existing `bm25.mjs` (BM25 lexical index) and `filter-logic.mjs`, Node >= 20 pure ESM, bare `node --test`.

**Spec:** `docs/superpowers/specs/2026-07-23-ask-on-browse-design.md` - read it before starting; the UX behavior section is the contract.

## Global Constraints

- Pure ESM everywhere; no new npm dependencies of any kind.
- `ask-logic.mjs` must be pure: no `fetch`, no DOM, no React imports - only imports from `bm25.mjs`, `filter-logic.mjs`, `format.mjs`.
- The `askEngine` return shape is frozen (phase 2 seam): `{ reply, rankedSlugs, detectedChips }`.
- Chips remain the single source of truth for filters; hand edits win over detection (spec "UX behavior" item 3).
- No changes to `qa-index.json`, its build script, Pagefind, or the MCP server.
- Do not use the em dash character in any code, comment, or copy - use a plain "-".
- Commit messages contain no quote or apostrophe characters (PowerShell 5.1 here-string safety).
- Run tests from the repo root with `npm test -w site`; the full suite must stay green (77 existing site tests).
- User-facing copy in this plan is exact - use it verbatim (placeholder text, button labels, reply templates).

## File Structure

- Create `site/src/components/islands/ask-logic.mjs` - intent parsing, term accumulation, per-doc ranking, reply composition, `askEngine` orchestrator.
- Create `site/test/ask-logic.test.js` - `node --test` coverage of every exported function over an in-memory fixture index.
- Modify `site/src/components/islands/BrowseFilter.jsx` - ask bar, assistant band, lazy `/qa-index.json` fetch, ranked grid.
- Modify `site/src/pages/browse.astro` - scoped `ask-*` styles.

---

### Task 1: ask-logic.mjs - parseIntent and accumulateTerms

**Files:**
- Create: `site/src/components/islands/ask-logic.mjs`
- Test: `site/test/ask-logic.test.js`

**Interfaces:**
- Consumes: `tokenize` from `site/src/lib/bm25.mjs` (lowercases, splits on `[a-z0-9]+`, drops stopwords and 1-char tokens); `tierLabel` from `site/src/lib/format.mjs` (`technical-report` -> `Technical report`).
- Produces: `parseIntent(message, filters) -> { terms: string[], detected: { tier, category, tag } }` (each facet a matched value string or `null`); `accumulateTerms(termLists: string[][]) -> string[]` (deduped union, first-seen order). Task 2 and Task 3 rely on these exact names and shapes.

Facet detection rules (from the spec): match whole-word occurrences of facet values against the lowercased message. Each value matches in three forms: the raw value (`technical-report`), the value with hyphens as spaces (`technical report`), and for tiers the `tierLabel` form lowercased (same as the space form for current labels, but kept so label changes keep working). Facet precedence is tier, then category, then tag; a matched phrase is removed from the working text before the next facet looks, so a word like `evals` (both a category and a tag) sets the category only. Matched phrases never leak into search terms. First match wins per facet within one message.

- [ ] **Step 1: Write the failing tests**

Create `site/test/ask-logic.test.js`:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run from repo root: `node --test site/test/ask-logic.test.js`
Expected: FAIL - `Cannot find module` for `ask-logic.mjs`.

- [ ] **Step 3: Write the implementation**

Create `site/src/components/islands/ask-logic.mjs`:

```js
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/test/ask-logic.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/islands/ask-logic.mjs site/test/ask-logic.test.js
git commit -m "feat(site): ask-logic intent parsing and term accumulation"
```

---

### Task 2: ask-logic.mjs - rankDocs, composeReply, askEngine

**Files:**
- Modify: `site/src/components/islands/ask-logic.mjs`
- Test: `site/test/ask-logic.test.js`

**Interfaces:**
- Consumes: `parseIntent`, `accumulateTerms` (Task 1); `search`, `buildIndex` from `bm25.mjs` (`search(index, query, k)` returns `[{ id, slug, tier, section, score, text, path }]`, score > 0 only, sorted desc); `applyFilter(cards, { tier, category, tag })` from `filter-logic.mjs` (`tier`/`category` use `"all"` for no constraint, `tag` uses `null`).
- Produces (Task 3 relies on these exact names and shapes):
  - `rankDocs(index, terms, activeChips, cards) -> [{ slug, score, chunks, sections: string[] }]`
  - `composeReply({ terms, detected, ranked, cards, filteredCount }) -> string`
  - `askEngine(turns, activeChips, deps) -> { reply, rankedSlugs, detectedChips }` where `turns` is `string[]` of raw user messages, `activeChips` is `{ tier, category, tag }` in `applyFilter` conventions, `deps` is `{ index, cards, filters }`.

Aggregation rules (from the spec): doc score = max chunk score; tie-break by number of matching chunks, then slug; `sections` lists matching chunk section headings in score order, max 3. Chip filtering happens before aggregation - a chip-excluded doc never appears.

- [ ] **Step 1: Write the failing tests**

Append to `site/test/ask-logic.test.js` (extend the import line to pull the new functions, and add `buildIndex`):

```js
import { buildIndex } from "../src/lib/bm25.mjs";
import { rankDocs, composeReply, askEngine } from "../src/components/islands/ask-logic.mjs";

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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test site/test/ask-logic.test.js`
Expected: FAIL - `rankDocs` (and the others) not exported.

- [ ] **Step 3: Write the implementation**

Append to `site/src/components/islands/ask-logic.mjs` (and extend the top imports to `import { tokenize, search } from "../../lib/bm25.mjs";` plus `import { applyFilter } from "./filter-logic.mjs";`):

```js
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
export function askEngine(turns, activeChips, deps) {
  const { index, cards, filters } = deps;
  const parsed = turns.map((m) => parseIntent(m, filters));
  const terms = accumulateTerms(parsed.map((p) => p.terms));
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test site/test/ask-logic.test.js`
Expected: PASS, 15 tests.

- [ ] **Step 5: Run the whole site suite**

Run: `npm test -w site`
Expected: PASS, 77 existing + 15 new = 92 tests; nothing existing may break.

- [ ] **Step 6: Commit**

```bash
git add site/src/components/islands/ask-logic.mjs site/test/ask-logic.test.js
git commit -m "feat(site): ask-logic ranking, reply composition, askEngine seam"
```

---

### Task 3: BrowseFilter island integration and styles

**Files:**
- Modify: `site/src/components/islands/BrowseFilter.jsx`
- Modify: `site/src/pages/browse.astro`

**Interfaces:**
- Consumes: `parseIntent`, `askEngine` (Tasks 1-2, exact shapes above); existing island props `{ cards, filters, initial }`; `/qa-index.json` served from `site/public/` (available in dev and build).
- Produces: the user-facing feature. No downstream code consumes the island.

Behavior contract (spec "UX behavior"): ask bar above the chip row; assistant band between bar and chips with `aria-live="polite"` and a "Start over" action; detected facets applied to ordinary chip state; grid shows ranked matches while a conversation is active, falling back to the chip-filtered set when ranking is empty or the index failed; hand-edited chips constrain the ranked list immediately (shown = ranked order intersected with the current chip filter); empty input ignored; index fetched lazily on first submit and cached.

- [ ] **Step 1: Replace BrowseFilter.jsx with the integrated version**

Full new content of `site/src/components/islands/BrowseFilter.jsx`:

```jsx
import { useMemo, useRef, useState } from "react";
import { applyFilter } from "./filter-logic.mjs";
import { parseIntent, askEngine } from "./ask-logic.mjs";
import { tierLabel } from "../../lib/format.mjs";

function Chip({ label, active, onClick }) {
  return (
    <button type="button" className="fchip" aria-pressed={active} onClick={onClick}>
      {label}
    </button>
  );
}

export default function BrowseFilter({ cards, filters, initial = {} }) {
  const [tier, setTier] = useState(initial.tier ?? "all");
  const [category, setCategory] = useState(initial.category ?? "all");
  const [tag, setTag] = useState(initial.tag ?? null);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState([]);
  const [reply, setReply] = useState(null);
  const [rankedSlugs, setRankedSlugs] = useState([]);
  const indexRef = useRef(null); // fetched qa-index, cached across turns
  const failedRef = useRef(false);

  const filtered = useMemo(() => applyFilter(cards, { tier, category, tag }), [cards, tier, category, tag]);
  const shown = useMemo(() => {
    if (turns.length === 0 || rankedSlugs.length === 0) return filtered;
    // Ranked order, constrained by the live chip state so hand edits win
    // immediately; empty intersection falls back to the chip-filtered set.
    const bySlug = new Map(filtered.map((c) => [c.slug, c]));
    const ranked = rankedSlugs.map((s) => bySlug.get(s)).filter(Boolean);
    return ranked.length > 0 ? ranked : filtered;
  }, [turns, rankedSlugs, filtered]);

  async function ensureIndex() {
    if (indexRef.current || failedRef.current) return indexRef.current;
    try {
      const res = await fetch("/qa-index.json");
      if (!res.ok) throw new Error(String(res.status));
      indexRef.current = await res.json();
    } catch {
      failedRef.current = true;
    }
    return indexRef.current;
  }

  async function submit(e) {
    e.preventDefault();
    const message = draft.trim();
    if (!message) return;
    setDraft("");
    // Hand-set chips are ground truth; the latest message only adds newly
    // detected facets on top of them (spec UX item 3).
    const { detected } = parseIntent(message, filters);
    const nextChips = {
      tier: detected.tier ?? tier,
      category: detected.category ?? category,
      tag: detected.tag ?? tag
    };
    if (detected.tier) setTier(detected.tier);
    if (detected.category) setCategory(detected.category);
    if (detected.tag) setTag(detected.tag);
    const nextTurns = [...turns, message];
    setTurns(nextTurns);
    const index = await ensureIndex();
    if (!index) {
      setRankedSlugs([]);
      setReply("Ranked recommendations are unavailable - the search index could not be loaded. Any filters I detected are still applied.");
      return;
    }
    const out = askEngine(nextTurns, nextChips, { index, cards, filters });
    setReply(out.reply);
    setRankedSlugs(out.rankedSlugs);
  }

  function startOver() {
    setTurns([]);
    setReply(null);
    setRankedSlugs([]);
    setTier("all");
    setCategory("all");
    setTag(null);
  }

  return (
    <div>
      <form className="ask-bar" onSubmit={submit}>
        <input
          className="ask-input"
          value={draft}
          placeholder="Describe what you are working on..."
          aria-label="Describe what you are working on"
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="ask-send" type="submit">Ask</button>
      </form>
      <div aria-live="polite">
        {reply && (
          <div className="ask-band">
            <p>{reply}</p>
            <button type="button" className="ask-reset" onClick={startOver}>Start over</button>
          </div>
        )}
      </div>
      <div className="bf-row">
        <Chip label="All tiers" active={tier === "all"} onClick={() => setTier("all")} />
        {filters.tiers.map((t) => (
          <Chip key={t.value} label={tierLabel(t.value)} active={tier === t.value}
                onClick={() => setTier(tier === t.value ? "all" : t.value)} />
        ))}
        <span className="bf-sep" aria-hidden="true" />
        <Chip label="All categories" active={category === "all"} onClick={() => setCategory("all")} />
        {filters.categories.map((c) => (
          <Chip key={c.value} label={c.value} active={category === c.value}
                onClick={() => setCategory(category === c.value ? "all" : c.value)} />
        ))}
        {tag && <Chip label={`# ${tag} ×`} active onClick={() => setTag(null)} />}
      </div>
      <p className="caps bf-count" aria-live="polite">
        {shown.length} contribution{shown.length === 1 ? "" : "s"}
      </p>
      <div className="bf-grid">
        {shown.map((c) => (
          <a key={c.slug} className="card" href={`/contributions/${c.slug}`}>
            <span className="caps" style={{ color: "var(--oxblood)" }}>
              {tierLabel(c.tier)} · {c.category}
            </span>
            <h3>{c.title}</h3>
            <p className="card-summary">{c.summary}</p>
            <div className="card-ev">
              <span className={c.replications > 0 ? "ev-verified" : ""}><b>{c.replications}</b> replication{c.replications === 1 ? "" : "s"}</span>
              <span><b>{c.teams}</b> team{c.teams === 1 ? "" : "s"}</span>
              {c.reviewStatus === "human" && <span className="ev-verified">peer-reviewed</span>}
              {c.reviewStatus === "machine" && <span>machine-reviewed</span>}
              {c.result && <span><b>{c.result}</b></span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
```

Notes for the implementer:
- The chip row, count line, and grid markup are byte-identical to the current file; only the ask bar, the band wrapper, the new state, `submit`, `startOver`, and the `shown` memo are new. Diff your change against git to confirm nothing else moved.
- The `aria-live` wrapper `<div>` is always rendered (empty when no reply) so screen readers reliably announce the first reply.

- [ ] **Step 2: Add scoped styles in browse.astro**

In `site/src/pages/browse.astro`, add these rules inside the existing `<style>` block, directly above the `main :global(.bf-row)` line:

```css
  main :global(.ask-bar) { display: flex; gap: 10px; margin: 0 0 14px; }
  main :global(.ask-input) { flex: 1; font: inherit; padding: 10px 12px; border: 1px solid var(--hairline); background: transparent; color: inherit; }
  main :global(.ask-input:focus) { outline: 2px solid var(--oxblood); outline-offset: -1px; }
  main :global(.ask-send) { font: inherit; padding: 10px 16px; border: 1px solid var(--oxblood); color: var(--oxblood); background: transparent; cursor: pointer; }
  main :global(.ask-band) { display: flex; gap: 14px; align-items: baseline; justify-content: space-between; border: 1px solid var(--hairline); border-left: 3px solid var(--oxblood); padding: 12px 14px; margin: 0 0 14px; }
  main :global(.ask-band p) { margin: 0; }
  main :global(.ask-reset) { font: inherit; font-size: 13px; color: var(--oxblood); background: none; border: none; cursor: pointer; text-decoration: underline; white-space: nowrap; }
```

- [ ] **Step 3: Run the full site suite**

Run: `npm test -w site`
Expected: PASS, same count as after Task 2 (no island tests exist by design - the logic layer carries coverage, consistent with `SearchOverlay.jsx`).

- [ ] **Step 4: Build and verify end to end**

```bash
npm run site:build
cd site && npx astro preview
```

Open `http://localhost:4321/browse` and verify against the spec's UX section:
1. Type `something about latency for batch inference` and submit: band appears with match count and a strongest-match explanation naming real sections; `#latency` chip is active; grid shows only matching cards, best first.
2. Follow up with `technical report`: tier chip activates, results narrow.
3. Hand-remove the tag chip: grid updates immediately.
4. Click Start over: full date-ordered grid returns, band disappears.
5. Empty submit does nothing.
6. Check mobile width (narrow the window below 720px): bar, band, chips, grid stack cleanly.

- [ ] **Step 5: Commit**

```bash
git add site/src/components/islands/BrowseFilter.jsx site/src/pages/browse.astro
git commit -m "feat(site): conversational ask bar on browse - chips, band, ranked grid"
```

---

## Verification checklist (whole feature)

- `npm run validate` green (content untouched - sanity only).
- `npm test --workspaces` green: 70 validator + 92 site + 14 installer.
- Built site works with no network access beyond its own origin (fetch is same-origin `/qa-index.json`).
- `askEngine` never called with an unfetched index; failed fetch shows the failure band text and chips still work.
