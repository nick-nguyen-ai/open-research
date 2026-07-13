# Cycle 4 — M7 Corpus Q&A + Skills, M8 Platform Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is independently testable and committable; implement them **in order** (dependencies flow forward). Each fresh implementer sees only its own task text, so every task is self-contained.

**Goal:** Ship (M7) a **corpus Q&A stack** — a pure BM25 index (`bm25.mjs`), a build step that publishes `site/public/qa-index.json`, and a zero-dependency **MCP server** (hand-rolled JSON-RPC over stdio) exposing `openresearch_search` / `openresearch_answer` — plus the two read→implement→evidence skills (`try-this-paper`, `write-replication`) and the plugin version bump to `0.4.0`. Ship (M8) the platform-completeness surface: a **watchlist** (schema + loader + crossref + page + seeds), a real **benchmark registry** page fed by a new `benchmarks.json` derive emission, a config-gated **discussions** stub on contribution pages, and a **weekly digest** (`build-digest.mjs` → `digest.json` + `/digest` page). Everything is additive over the frozen CP-A/CP-B/CP-C contracts and freezes at **CP-D**.

**Architecture:** Purely additive. `site/src/lib/bm25.mjs` is a pure, zero-dep lexical index behind the frozen `buildIndex(corpus)` + `search(index, query, k)` seam (CBA swaps Bedrock embeddings behind the same `search` signature). `site/scripts/build-index.mjs` chunks published contributions (one chunk per H2 section + a frontmatter summary chunk) via the validator loader and writes `site/public/qa-index.json`, wired into the site `build` script **before** `astro build` so the artifact lands in `public/` (published raw with the site). `toolkit/plugins/openresearch/mcp/server.mjs` is a hand-rolled JSON-RPC 2.0 stdio server (initialize / tools/list / tools/call) that loads the built index, falling back to an in-memory build from `content/` in a repo checkout (dev mode). The validator gains one auto-loaded schema (`watchlist`) and a `content.watchlist[]` loader array with crossref coverage. `site/scripts/derive.mjs` gains two additive emissions, `watchlist.json` and `benchmarks.json` (new functions `deriveWatchlist`/`deriveBenchmarks`; existing `derive()` outputs byte-identical). `site/scripts/build-digest.mjs` is a new script emitting `site/src/data/digest.json`. Four placeholder/new pages (`/watchlist`, `/benchmarks` real, `/digest`) and one config-gated component (`Discussions.astro`) render the derived data. The masthead nav stays frozen at four items + search; watchlist/digest reach the reader via `/benchmarks` and the footer. No new dependencies anywhere; the MCP server is hand-rolled.

**Tech Stack:** Node ≥20, pure ESM, no TypeScript; `node:test`; Astro ^5 + Tailwind ^4 (site, unchanged deps); the validator (`@openresearch/validator`); `gray-matter` + `yaml` (already vendored). **No new dependencies anywhere** — the MCP server is hand-rolled JSON-RPC over stdio using only `node:*` built-ins.

## Global Constraints

- Node `>=20`; pure ESM everywhere (`"type": "module"`); **no TypeScript** (`.mjs`/`.js`).
- Test scripts are **bare `node --test`** — never `node --test <dir>` (Node ≥24 breaks on a directory arg; do not "fix" it).
- **Test files are named uniquely per cycle** (e.g. `bm25.test.js`, `build-index.test.js`, `mcp-server.test.js`, `mcp-install.test.js`, `derive-watchlist.test.js`, `derive-benchmarks.test.js`, `build-digest.test.js`, `cycle4-qa-platform.test.js`) so no cycle's suite overwrites another's.
- **No new dependencies** in any `package.json` — built-ins + already-vendored packages only. The MCP server uses only `node:fs`, `node:path`, `node:url`, `node:readline`.
- Scripts **fail loudly**: non-zero exit with a `file · field · message`-style line; never silently drop or skip content.
- Site build failure = task failure. The validator must exit 0 and `npm test --workspaces` must be green at every task gate.
- **Frozen shapes freeze at CP-D and are pinned in this plan** — the `qa-index.json` artifact format, the `buildIndex(corpus)` / `search(index, query, k)` signatures, the MCP tool **names and shapes** (`openresearch_search {query, k?}`, `openresearch_answer {question}`) and its JSON-RPC subset, the `watchlist` YAML shape + `watchlist.json`, and `benchmarks.json` / `digest.json` shapes. Do not add, rename, or drop keys once written; Task 10 freezes them.
- **Frozen contracts are not broken (additive-only):** existing `derive()` outputs (`stats`, `cards`, `filters`, `evidence{}`), `arena.json`, `people.json`, `toolkit.json`, the loader's existing return keys (`contributions`, `replications`, `endorsements`, `benchmarks`, `adoptions`, `errors`), the four M1 schemas + `adoption`, all existing routes, and `config.repoUrl` stay byte-identical in shape. The masthead nav stays frozen at 4 items + search — do **not** add a nav item.
- **`platform.config.json` gains exactly one new key this cycle — `discussions.enabled`** (default `false`), explicitly authorized by the approved design ("new key, default false"). The `mcp` block is unchanged (`mcp.enabled` only — no index-path key is added; the MCP server derives the index path from the repo root). No other config keys change.
- Commit messages: conventional prefix + trailer, on every commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```
- **Branch:** all work happens on the cycle branch **`c4-qa-platform`** (create it in Task 1, Step 0). Never commit to `main`; the cycle merges to `main` only at the CP-D gate (outside this plan). Seed records created by the `write-replication` walkthrough (Task 5) land **directly on `c4-qa-platform`** as committed seed evidence — never on `main`, and never as a stray `contribute/*` branch.

## Accumulated execution-delta lessons (from Cycles 2 & 3 — do not relearn these)

1. **No `import.meta.url`-relative config reads in Vite-bundled modules.** `site/src/config.mjs` resolves `platform.config.json` via `process.cwd()` (Vite relocates bundled modules into `site/dist/chunks/`). New page/component code reads config **only** through the already-safe `config` object exported by `config.mjs`, and otherwise reads only imported `../data/*.json` (bundled as data) — never re-reads config or content at runtime. `Discussions.astro` (Task 9) imports `{ config }` from `config.mjs` exactly as `ActionRow.astro` does.
2. **`derive.mjs` never imports `site/src/config.mjs`** (derive runs with cwd = repo root; config assumes cwd = `site/`). `deriveWatchlist`/`deriveBenchmarks` take already-loaded `content`; the CLI reads `platform.config.json` directly via `import.meta.url` exactly as the existing toolkit block does. `build-index.mjs` and `build-digest.mjs` also run with cwd = repo root and never import `config.mjs`.
3. **Markdown italic/emphasis spans break `firstSentence()`.** Any card-visible / summary-derived copy stays **plain text**. Watchlist titles, benchmark descriptions, and digest lines are rendered as literal strings from YAML/derive output (no `firstSentence` path), so this does not bite; keep seed copy plain regardless.
4. **All git steps target the cycle branch `c4-qa-platform`, never `main`.** Cycle-count / gate tests use **floors and invariants**, never exact seed totals (CP-E later adds 2 contributions + a replication — the gate must survive that).
5. **Windows installer reality (Cycle 2):** `main()` and `doctor()` take an injectable opts bag (`{ log, cwd, exists, read, spawn, write }`); Task 3's installer additions preserve that injection surface and add nothing that spawns or writes during the existing hermetic tests.

## Frozen-contract guardrails (do not break)

Frozen at CP-A / CP-B / CP-C (`CONTRACTS.md`). This cycle **adds** CP-D but must not change any existing shape:

- `derive(contentRoot, opts)` — the four existing outputs (`stats`, `cards`, `filters`, `evidence{}`) plus `toolkit.json`, `arena.json`, `people.json` keep their shapes byte-identical. `watchlist.json` and `benchmarks.json` are **new** derive outputs from **new** functions (`deriveWatchlist`, `deriveBenchmarks`); the existing `derive()` signature is untouched. `site/test/derive.test.js` and `site/test/cycle3-arena.test.js` keep passing unchanged.
- **Loader API** (`loadContent(root)`) — return object **gains** `watchlist: [{file,data}]` (additive, loaded from `content/watchlist/*.yaml`). Existing keys unchanged. `watchlist` is a **new** auto-loaded schema; the four M1 schemas + `adoption` are not modified.
- Routes: `/benchmarks` stays a route (its placeholder body is replaced — that is design). `/watchlist` and `/digest` are **new** routes (frozen at CP-D). All other routes unchanged. Masthead nav frozen at 4 items + search.
- `config.mjs` keeps exporting `config.repoUrl`, `config.mcpEnabled`, etc.; **gains** `config.discussionsEnabled` (additive). `platform.config.json` gains `discussions.enabled` only.
- The plugin `.claude-plugin/plugin.json` `version` bumps `0.3.0 → 0.4.0` (an explicit, human-approved anchor change recorded at CP-D); the marketplace `skills[]` roster shape is unchanged (only `shipsIn` values flip `"M7" → null`).

## File structure (target additions)

```
platform.config.json                                        # EXTEND — discussions.enabled (Task 9)
content/
├─ schemas/watchlist.schema.json                            # NEW (Task 7)
├─ templates/watchlist.yaml                                 # NEW (Task 7)
├─ watchlist/*.yaml                                         # NEW seeds ×4 (Task 7)
├─ records/replications/context-window-budgeting--risk-engineering.yaml  # NEW seed (Task 5 walkthrough)
└─ validator/src/
   ├─ load.js                                               # EXTEND — watchlist[] (Task 7)
   └─ rules/{schema.js,crossrefs.js}                        # EXTEND — watchlist (Task 7)
site/
├─ src/lib/bm25.mjs                                         # NEW (Task 1)
├─ scripts/build-index.mjs                                  # NEW (Task 2)
├─ scripts/build-digest.mjs                                 # NEW (Task 9)
├─ scripts/derive.mjs                                       # EXTEND — deriveWatchlist (7), deriveBenchmarks (8)
├─ scripts/check-links.mjs                                  # EXTEND requiredRoutes (Tasks 7, 9)
├─ package.json                                             # EXTEND build/dev scripts (Tasks 2, 9)
├─ src/components/Discussions.astro                         # NEW (Task 9)
├─ src/components/Footer.astro                              # EXTEND — watchlist (7) + digest (9) links
├─ src/pages/contributions/[slug].astro                    # EXTEND — Discussions panel (Task 9)
├─ src/pages/watchlist.astro                                # NEW (Task 7)
├─ src/pages/benchmarks.astro                               # REWRITE — real registry (Task 8)
├─ src/pages/digest.astro                                   # NEW (Task 9)
├─ src/config.mjs                                           # EXTEND — discussionsEnabled (Task 9)
├─ src/data/{watchlist,benchmarks,digest}.json             # NEW derived (Tasks 7, 8, 9)
└─ test/
   ├─ bm25.test.js                                          # NEW (Task 1)
   ├─ build-index.test.js                                   # NEW (Task 2)
   ├─ mcp-server.test.js                                    # NEW (Task 3)
   ├─ derive-watchlist.test.js                              # NEW (Task 7)
   ├─ derive-benchmarks.test.js                             # NEW (Task 8)
   ├─ build-digest.test.js                                  # NEW (Task 9)
   ├─ discussions-config.test.js                            # NEW (Task 9)
   ├─ cycle4-qa-platform.test.js                            # NEW (Task 10)
   └─ fixtures/qa-root/…                                     # NEW (Task 2)
toolkit/
├─ marketplace.json                                         # EXTEND — shipsIn flips (Task 6)
├─ plugins/openresearch/
│  ├─ .claude-plugin/plugin.json                            # EXTEND — version 0.4.0 (Task 6)
│  ├─ .mcp.json                                             # NEW (Task 3)
│  ├─ mcp/server.mjs                                        # NEW (Task 3)
│  └─ skills/
│     ├─ try-this-paper/{SKILL.md,walkthrough.md}           # NEW (Task 4)
│     └─ write-replication/{SKILL.md,walkthrough.md}        # NEW (Task 5)
└─ installer/
   ├─ package.json                                          # EXTEND — version 0.4.0 (Task 6)
   ├─ bin/openresearch.mjs                                  # EXTEND — mcp doctor check + enableMcp (Task 3)
   └─ test/mcp-install.test.js                              # NEW (Task 3)
CONTRACTS.md                                                # CP-D section filled (Task 10)
```

---

### Task 1: `bm25.mjs` — pure lexical index (`tokenize` / `buildIndex` / `search`)

**This is a transcription task.** TDD in the `site` workspace: write the test first, watch it fail, then add the module. `bm25.mjs` is pure (zero IO, zero deps) so it is trivially testable and is the search seam CBA swaps Bedrock behind.

**Files:**
- Create branch (Step 0): `c4-qa-platform`
- Create: `site/src/lib/bm25.mjs`
- Create test: `site/test/bm25.test.js`

**Interfaces:**
- Consumes: nothing (pure).
- Produces (signatures freeze at CP-D):
  - `tokenize(text)` → lowercased `[a-z0-9]+` terms, length > 1, common stopwords dropped.
  - `buildIndex(corpus)` → the serializable index. `corpus` is `[{ id, slug, tier, section, text }]`. Returns `{ chunks: [{ id, slug, tier, section, text, tokens }], model: { df, avgdl, docs, N } }` where `chunks[i].tokens` is the integer token length, `model.df` is `{ term: documentFrequency }`, `model.docs[i]` is `{ tf: { term: count } }` parallel to `chunks`, `model.avgdl` is the mean token length, `model.N` is the chunk count.
  - `search(index, query, k = 5)` → top-k `[{ id, slug, tier, section, score, text, path }]` sorted by score desc then `id` asc; `path` is `content/contributions/<slug>/index.md`. Okapi BM25 (`k1=1.5`, `b=0.75`), only positive-scoring chunks returned.

- [ ] **Step 0: Create the cycle branch**

From the repo root:

```bash
git checkout -b c4-qa-platform
```

(All Cycle 4 commits land here. If it already exists from a prior session, `git checkout c4-qa-platform` instead.)

- [ ] **Step 1: Write the failing test**

Create `site/test/bm25.test.js`:

```js
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

test("results carry only the frozen keys", () => {
  const index = buildIndex(corpus);
  const [hit] = search(index, "reranker", 1);
  assert.deepEqual(Object.keys(hit).sort(), ["id", "path", "score", "section", "slug", "text", "tier"]);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `bm25.test.js` FAILS — `../src/lib/bm25.mjs` does not exist.

- [ ] **Step 3: Create `site/src/lib/bm25.mjs`**

Create `site/src/lib/bm25.mjs` (verbatim):

```js
// BM25 lexical index — pure functions, zero dependencies. The Q&A search seam.
// buildIndex(corpus) + search(index, query, k) freeze at CP-D; CBA swaps Bedrock
// embeddings behind the same search(index, query, k) signature.

const STOPWORDS = new Set(
  ("a an and are as at be by for from has have he in into is it its of on or that the " +
   "their them then there these this those to was were will with we our you your").split(" ")
);

const K1 = 1.5;
const B = 0.75;

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// corpus: [{ id, slug, tier, section, text }] → serializable index.
export function buildIndex(corpus) {
  const chunks = [];
  const docs = [];      // parallel to chunks: { tf: { term: count } }
  const df = {};        // term -> number of chunks containing it
  let totalTokens = 0;
  for (const c of corpus) {
    const terms = tokenize(c.text);
    const tf = {};
    for (const t of terms) tf[t] = (tf[t] ?? 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] ?? 0) + 1;
    chunks.push({ id: c.id, slug: c.slug, tier: c.tier, section: c.section, text: c.text, tokens: terms.length });
    docs.push({ tf });
    totalTokens += terms.length;
  }
  const N = chunks.length;
  const avgdl = N > 0 ? totalTokens / N : 0;
  return { chunks, model: { df, avgdl, docs, N } };
}

export function search(index, query, k = 5) {
  const { chunks, model } = index;
  const { df, avgdl, docs, N } = model;
  const qterms = [...new Set(tokenize(query))];
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const { tf } = docs[i];
    const len = chunks[i].tokens;
    let score = 0;
    for (const t of qterms) {
      const f = tf[t];
      if (!f) continue;
      const n = df[t] ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / (avgdl || 1))));
    }
    if (score > 0) {
      const c = chunks[i];
      results.push({
        id: c.id, slug: c.slug, tier: c.tier, section: c.section,
        score: Number(score.toFixed(6)), text: c.text,
        path: `content/contributions/${c.slug}/index.md`
      });
    }
  }
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return results.slice(0, k);
}
```

- [ ] **Step 4: Run to verify the suite passes**

Run (from `site/`): `node --test` → all PASS (`bm25.test.js` + existing suites unchanged).

- [ ] **Step 5: Commit**

```bash
git add -A site/src/lib/bm25.mjs site/test/bm25.test.js
git commit -m "feat(qa): pure BM25 lexical index (tokenize/buildIndex/search)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: `build-index.mjs` — chunk contributions → `site/public/qa-index.json`, wired into the site build

**This is a transcription task.** TDD in the `site` workspace. The chunker is exported (`chunkContent`) so the MCP server's dev fallback (Task 3) reuses it — no duplicated chunking logic.

**Files:**
- Create: `site/scripts/build-index.mjs`
- Modify: `site/package.json` (`build` + `dev` + new `index` script)
- Create test: `site/test/build-index.test.js`
- Create fixture: `site/test/fixtures/qa-root/contributions/reranker-demo/index.md`, `site/test/fixtures/qa-root/contributions/draft-demo/index.md`

**Interfaces:**
- Consumes: `loadContent(contentRoot)`; `buildIndex` from `bm25.mjs` (Task 1).
- Produces:
  - `chunkContent(content)` → the corpus `[{ id, slug, tier, section, text }]`: for each **published** contribution, one `Summary` chunk from frontmatter (`title` + `result` + `result_detail`, whichever exist), plus one chunk per H2 (`## `) section (`id` = `<slug>#<section-slug>`, `text` = `heading. body`). Non-published contributions are excluded. Sections with empty bodies are skipped.
  - `buildQaIndex(contentRoot)` → `buildIndex(chunkContent(loadContent(contentRoot)))`; **fails loud** if `content.errors.length > 0`.
  - CLI `node scripts/build-index.mjs [contentRoot] [outDir]` → writes `<outDir>/qa-index.json` (default `outDir` = `site/public`). Minified (no pretty-print — it is a machine artifact).
  - The build script emits the artifact into `site/public/` **before** `astro build`, so Astro copies it to `dist/qa-index.json` (published raw with the site). **Decision (resolved — see design's index-ordering question):** the index build needs only `content/`, so it runs alongside `derive`, before Astro: `derive → build-index → build-digest → astro build → pagefind`.

- [ ] **Step 1: Create fixtures**

Create `site/test/fixtures/qa-root/contributions/reranker-demo/index.md`:

```markdown
---
id: reranker-demo
title: A lite cross-encoder reranker lifts retrieval
tier: finding
authors:
  - name: Demo Author
    team: demo-team
category: rag
tags: [retrieval, reranking]
status: published
created: "2026-07-10"
updated: "2026-07-12"
result: +8pt ndcg@10
result_detail: 0.61 to 0.69 ndcg@10 on the demo eval set
---

## Summary

A distilled cross-encoder reranker lifts research retrieval without the latency tax.

## Technique

Rerank the top fifty candidates with a small cross-encoder scoring model.

## Evidence

Ndcg at ten rose from 0.61 to 0.69 across five hundred query passage pairs.

## How to replicate

Run the bundle against your own graded relevance set.
```

Create `site/test/fixtures/qa-root/contributions/draft-demo/index.md` (a **draft** — must be excluded from the corpus):

```markdown
---
id: draft-demo
title: A draft that must never be indexed
tier: note
authors:
  - name: Demo Author
    team: demo-team
category: agents
tags: [draft]
status: draft
created: "2026-07-10"
updated: "2026-07-12"
---

This draft note mentions a secret unindexable phrase and must not appear in the corpus.
```

- [ ] **Step 2: Write the failing test**

Create `site/test/build-index.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { chunkContent, buildQaIndex } from "../scripts/build-index.mjs";
import { search } from "../src/lib/bm25.mjs";

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
```

- [ ] **Step 3: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `build-index.test.js` FAILS — `../scripts/build-index.mjs` does not exist.

- [ ] **Step 4: Create `site/scripts/build-index.mjs`**

Create `site/scripts/build-index.mjs` (verbatim):

```js
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { buildIndex } from "../src/lib/bm25.mjs";

// Split published contributions into a search corpus: one Summary chunk from
// frontmatter + one chunk per H2 section. Pure — depends only on loaded content.
export function chunkContent(content) {
  const corpus = [];
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  for (const c of published) {
    const fm = c.frontmatter;
    const slug = c.dirName;
    const summaryParts = [fm.title];
    if (fm.result) summaryParts.push(fm.result);
    if (fm.result_detail) summaryParts.push(fm.result_detail);
    corpus.push({ id: `${slug}#summary`, slug, tier: fm.tier, section: "Summary", text: summaryParts.join(". ") });
    for (const sec of splitSections(c.body)) {
      corpus.push({
        id: `${slug}#${sectionSlug(sec.heading)}`,
        slug, tier: fm.tier, section: sec.heading,
        text: `${sec.heading}. ${sec.text}`
      });
    }
  }
  return corpus;
}

function splitSections(body) {
  const lines = body.split("\n");
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { heading: m[1], lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) out.push(cur);
  return out
    .map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text.length > 0);
}

function sectionSlug(text) {
  return text.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function buildQaIndex(contentRoot) {
  const content = loadContent(contentRoot);
  if (content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`build-index: content has errors — run npm run validate\n${lines.join("\n")}`);
  }
  return buildIndex(chunkContent(content));
}

// CLI: node scripts/build-index.mjs [contentRoot] [outDir]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contentRoot = process.argv[2] ?? fileURLToPath(new URL("../../content", import.meta.url));
  const outDir = process.argv[3] ?? fileURLToPath(new URL("../public", import.meta.url));
  try {
    const index = buildQaIndex(contentRoot);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "qa-index.json"), JSON.stringify(index));
    console.log(`build-index: ${index.chunks.length} chunks → ${join(outDir, "qa-index.json")}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 5: Wire the index build into the site scripts**

In `site/package.json`, replace the `scripts` block with (adds `index`; wires `build-index` into `build` **before** `astro build`; `dev` is unchanged for now — Task 9 adds `build-digest` to both):

```json
  "scripts": {
    "dev": "node scripts/derive.mjs && astro dev",
    "build": "node scripts/derive.mjs && node scripts/build-index.mjs && astro build && pagefind --site dist",
    "index": "node scripts/build-index.mjs",
    "test": "node --test"
  },
```

- [ ] **Step 6: Run tests + build; confirm the published artifact**

Run (from `site/`): `node --test` → all PASS.
Run (repo root): `npm run build -w site` → PASS. Confirm the artifact was generated and published:
- `ls site/public/qa-index.json` → exists.
- `ls site/dist/qa-index.json` → exists (Astro copied `public/` into `dist/`).
- `node -e "const i=require('./site/public/qa-index.json'); console.log('chunks:', i.chunks.length, 'terms:', Object.keys(i.model.df).length);"` → chunk count ≥ 20, term count > 100.

- [ ] **Step 7: Commit**

```bash
git add -A site/scripts/build-index.mjs site/package.json site/test/build-index.test.js site/test/fixtures/qa-root/ site/public/qa-index.json
git commit -m "feat(qa): build-index.mjs chunks contributions into published qa-index.json" -m "Index build runs before astro build so the artifact lands in public/ and ships in dist/." -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Q&A MCP server + `.mcp.json` + installer doctor/enable + protocol tests

**This is a transcription task** for the server + installer additions. The server is hand-rolled JSON-RPC 2.0 over stdio, zero dependencies. Protocol tests drive it via `child_process`.

**Files:**
- Create: `toolkit/plugins/openresearch/mcp/server.mjs`
- Create: `toolkit/plugins/openresearch/.mcp.json`
- Extend: `toolkit/installer/bin/openresearch.mjs` (add `enableMcp`, an `mcp server` doctor check, and the init config-flip)
- Create test: `site/test/mcp-server.test.js` (protocol tests via `child_process`)
- Create test: `toolkit/installer/test/mcp-install.test.js` (doctor mcp check + `enableMcp` + init flip)

**Interfaces:**
- Consumes: the built `site/public/qa-index.json` (Task 2), or — when absent, in a repo checkout — an in-memory build via `buildQaIndex` (dynamic import; dev mode); `search` from `bm25.mjs`.
- Produces (**names/shapes freeze at CP-D**):
  - A stdio JSON-RPC 2.0 server speaking exactly: `initialize`, `notifications/initialized` (notification, no reply), `tools/list`, `tools/call`. Messages are **newline-delimited JSON** (one JSON object per line — the MCP stdio framing), never embedding a raw newline.
  - Tool `openresearch_search {query, k?}` → `{ content:[{type:"text",text}], structuredContent:{ query, results:[{id,slug,tier,section,score,text,path}] } }`.
  - Tool `openresearch_answer {question}` → `{ content:[{type:"text",text}], structuredContent:{ question, chunks:[…], citations:[{slug,section,path}] } }`. **The server never calls an LLM** — it assembles a scaffold; the calling session's model composes prose.
  - Unknown method → JSON-RPC error `-32601`; unknown tool name → error `-32602`.
- Installer additions (preserve the injectable opts bag):
  - `enableMcp(repoRoot, {read, write})` → sets `platform.config.json` `mcp.enabled = true` (preserving all other keys), returns the new config.
  - `doctor(...)` gains an `mcp server` check (ok when both `mcp/server.mjs` and `.mcp.json` exist under the repo root; else warn).
  - `main` `init`: after a successful (non-dry-run, claude-present) install **and only when the mcp server file exists under `repoRoot`**, calls `enableMcp`; in `--dry-run` (again only when present) prints `[dry-run] set mcp.enabled=true in platform.config.json`. This gate keeps the existing hermetic installer tests (whose injected `exists` never reports the server file) byte-identical.

**MCP protocol subset — the exact frames the tests assert.** Each is one line of JSON on stdin/stdout.

Request/response 1 — initialize:
```
→ {"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"0"}}}
← {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"openresearch","version":"0.4.0"}}}
```
Notification (no response emitted):
```
→ {"jsonrpc":"2.0","method":"notifications/initialized"}
```
Request/response 2 — tools/list:
```
→ {"jsonrpc":"2.0","id":2,"method":"tools/list"}
← {"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"openresearch_search",…},{"name":"openresearch_answer",…}]}}
```
Request/response 3 — tools/call search:
```
→ {"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"openresearch_search","arguments":{"query":"heading aware chunking","k":3}}}
← {"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"…"}],"structuredContent":{"query":"…","results":[…]}}}
```

- [ ] **Step 1: Write the failing protocol test**

Create `site/test/mcp-server.test.js` (it drives the real server via `child_process` against the real repo index; run the site build once first so `qa-index.json` exists — the test also works via the dev fallback if it does not):

```js
import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../../toolkit/plugins/openresearch/mcp/server.mjs", import.meta.url));

// Drive the server: write a list of request objects, collect one response line each
// (notifications produce no line). Resolves when `expected` response lines arrive.
function driveServer(requests, expected) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "inherit"] });
    const responses = [];
    let buf = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 15000);
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) responses.push(JSON.parse(line));
        if (responses.length >= expected) {
          clearTimeout(timer);
          child.stdin.end();
          child.kill();
          resolve(responses);
        }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

test("initialize → tools/list → tools/call search over the real corpus", async () => {
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "openresearch_search", arguments: { query: "heading aware chunking", k: 3 } } }
  ];
  const [init, list, call] = await driveServer(requests, 3);

  assert.equal(init.id, 1);
  assert.equal(init.result.protocolVersion, "2024-11-05");
  assert.equal(init.result.serverInfo.name, "openresearch");

  assert.equal(list.id, 2);
  const names = list.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["openresearch_answer", "openresearch_search"]);
  for (const t of list.result.tools) assert.ok(t.inputSchema && t.inputSchema.type === "object");

  assert.equal(call.id, 3);
  assert.ok(Array.isArray(call.result.structuredContent.results));
  assert.ok(call.result.structuredContent.results.length >= 1);
  assert.equal(call.result.structuredContent.results[0].slug, "heading-aware-chunking");
  assert.match(call.result.content[0].text, /heading-aware-chunking/);
});

test("openresearch_answer returns citations; unknown tool errors -32602", async () => {
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "openresearch_answer", arguments: { question: "how do I cut eval cost?" } } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "nope_tool", arguments: {} } },
    { jsonrpc: "2.0", id: 4, method: "bogus/method" }
  ];
  const [, answer, badTool, badMethod] = await driveServer(requests, 4);
  assert.ok(Array.isArray(answer.result.structuredContent.citations));
  assert.equal(badTool.error.code, -32602);
  assert.equal(badMethod.error.code, -32601);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `mcp-server.test.js` FAILS — `toolkit/plugins/openresearch/mcp/server.mjs` does not exist.

- [ ] **Step 3: Create `toolkit/plugins/openresearch/mcp/server.mjs`**

Create `toolkit/plugins/openresearch/mcp/server.mjs` (verbatim):

```js
#!/usr/bin/env node
// OpenResearch Q&A MCP server. Hand-rolled JSON-RPC 2.0 over stdio, zero dependencies.
// Protocol subset: initialize, notifications/initialized, tools/list, tools/call.
// Tools: openresearch_search, openresearch_answer. The server NEVER calls an LLM —
// it returns ranked chunks + a citation scaffold; the calling session composes prose.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { search } from "../../../../site/src/lib/bm25.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "openresearch", version: "0.4.0" };

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, "platform.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Prefer the published artifact; fall back to an in-memory build from content/ (dev).
async function loadIndex() {
  const repoRoot = findRepoRoot(HERE) ?? process.cwd();
  const built = join(repoRoot, "site", "public", "qa-index.json");
  if (existsSync(built)) return JSON.parse(readFileSync(built, "utf8"));
  const { buildQaIndex } = await import("../../../../site/scripts/build-index.mjs");
  return buildQaIndex(join(repoRoot, "content"));
}

const TOOLS = [
  {
    name: "openresearch_search",
    description: "Lexical (BM25) search over the OpenResearch corpus. Returns the top-k contribution chunks with slug, section, score, and the source repo path.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language or keyword query." },
        k: { type: "integer", minimum: 1, maximum: 20, description: "How many chunks to return (default 5)." }
      },
      required: ["query"]
    }
  },
  {
    name: "openresearch_answer",
    description: "Search the corpus and return a citation scaffold (top chunks + citation lines) for the calling model to compose an answer from. Never invents facts; never calls an LLM.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "The question to answer from the corpus." } },
      required: ["question"]
    }
  }
];

function clampK(k) {
  const n = Number.parseInt(k, 10);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(20, n));
}

function formatSearch(query, results) {
  if (results.length === 0) return `No corpus chunks matched "${query}".`;
  const lines = results.map((r, i) =>
    `${i + 1}. [${r.slug} · ${r.section}] (score ${r.score})\n   ${r.text}\n   source: ${r.path}`);
  return `Top ${results.length} chunks for "${query}":\n\n${lines.join("\n\n")}`;
}

function formatAnswer(question, results) {
  if (results.length === 0) return `No corpus material found for: ${question}\nAnswer from the corpus is not possible; say so.`;
  const cites = results.map((r) => `- ${r.slug} · ${r.section} — ${r.path}`).join("\n");
  const body = results.map((r, i) => `[${i + 1}] (${r.slug} · ${r.section})\n${r.text}`).join("\n\n");
  return [
    `Answer scaffold for: ${question}`,
    ``,
    `Compose a concise answer ONLY from the chunks below; cite each claim as [n]. If they do not answer the question, say so.`,
    ``,
    body,
    ``,
    `Citations:`,
    cites
  ].join("\n");
}

function reply(id, result) { return { jsonrpc: "2.0", id, result }; }
function errorReply(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

function callTool(index, id, params) {
  const name = params?.name;
  const args = params?.arguments ?? {};
  if (name === "openresearch_search") {
    const results = search(index, String(args.query ?? ""), clampK(args.k));
    return reply(id, {
      content: [{ type: "text", text: formatSearch(String(args.query ?? ""), results) }],
      structuredContent: { query: args.query ?? "", results }
    });
  }
  if (name === "openresearch_answer") {
    const results = search(index, String(args.question ?? ""), 6);
    return reply(id, {
      content: [{ type: "text", text: formatAnswer(String(args.question ?? ""), results) }],
      structuredContent: {
        question: args.question ?? "",
        chunks: results,
        citations: results.map((r) => ({ slug: r.slug, section: r.section, path: r.path }))
      }
    });
  }
  return errorReply(id, -32602, `Unknown tool: ${name ?? "(none)"}`);
}

function handle(index, msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
  }
  if (method === "notifications/initialized") return null; // notification — no reply
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") return callTool(index, id, params);
  if (id === undefined || id === null) return null; // unknown notification
  return errorReply(id, -32601, `Method not found: ${method}`);
}

const index = await loadIndex(); // top-level await: fail loud at startup if the corpus is broken

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); } catch { return; }
  const res = handle(index, msg);
  if (res) process.stdout.write(JSON.stringify(res) + "\n");
});
```

- [ ] **Step 4: Create `toolkit/plugins/openresearch/.mcp.json`**

Create `toolkit/plugins/openresearch/.mcp.json` (launches the server from the plugin root; `mcp.enabled` in `platform.config.json` is the **workflow** gate — set true by `openresearch init` after the doctor `mcp server` check passes, exactly as `judge.ci` gates the CI job without the skill refusing to run):

```json
{
  "mcpServers": {
    "openresearch": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/server.mjs"]
    }
  }
}
```

- [ ] **Step 5: Run the protocol test**

First build once so the published index exists (the dev fallback also works, but this exercises the shipped path):
Run (repo root): `npm run build -w site`
Run (from `site/`): `node --test` → `mcp-server.test.js` PASSES (initialize/list/call frames + answer citations + error codes). All other suites still pass.

- [ ] **Step 6: Write the failing installer test**

Create `toolkit/installer/test/mcp-install.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { doctor, enableMcp, main } from "../bin/openresearch.mjs";

const cfgPath = join("/repo", "platform.config.json");
const mcpServer = join("/repo", "toolkit", "plugins", "openresearch", "mcp", "server.mjs");
const mcpJson = join("/repo", "toolkit", "plugins", "openresearch", ".mcp.json");

test("doctor reports an mcp server check (ok when server + .mcp.json exist)", () => {
  const present = (p) => p === mcpServer || p === mcpJson;
  const ok = doctor({ nodeVersion: "20.11.0", path: "/bin", exists: present, repoRoot: "/repo" });
  assert.equal(ok.find((c) => c.name === "mcp server").status, "ok");
  const absent = doctor({ nodeVersion: "20.11.0", path: "/bin", exists: () => false, repoRoot: "/repo" });
  assert.equal(absent.find((c) => c.name === "mcp server").status, "warn");
});

test("enableMcp flips mcp.enabled true, preserving other keys", () => {
  let written = null;
  const read = () => JSON.stringify({ name: "OpenResearch", host: "github.com", repo: null, mcp: { enabled: false }, discussions: { enabled: false } });
  const cfg = enableMcp("/repo", { read, write: (p, s) => { written = { p, s }; } });
  assert.equal(cfg.mcp.enabled, true);
  assert.equal(written.p, cfgPath);
  const parsed = JSON.parse(written.s);
  assert.equal(parsed.mcp.enabled, true);
  assert.equal(parsed.host, "github.com");
  assert.equal(parsed.discussions.enabled, false);
});

test("init --dry-run announces the mcp flip when the server is present", () => {
  const lines = [];
  const exists = (p) => p === cfgPath || p === mcpServer || p === mcpJson;
  const read = () => JSON.stringify({ host: "github.com", repo: null, mcp: { enabled: false } });
  main(["init", "--dry-run"], { PATH: "" }, {
    log: (s) => lines.push(s), cwd: "/repo", exists, read,
    spawn: () => ({ status: 0 }), write: () => {}
  });
  assert.ok(lines.includes("[dry-run] set mcp.enabled=true in platform.config.json"));
});

test("init (claude present) flips mcp.enabled after install when server present", () => {
  let wrote = false;
  const exists = (p) => p === cfgPath || p === mcpServer || p === mcpJson || p.toLowerCase().endsWith("claude");
  const read = () => JSON.stringify({ host: "github.com", repo: null, mcp: { enabled: false } });
  main(["init"], { PATH: "/opt/bin" }, {
    log: () => {}, cwd: "/repo", exists, read,
    spawn: () => ({ status: 0 }), write: () => { wrote = true; }
  });
  assert.equal(wrote, true);
});
```

- [ ] **Step 7: Run to verify failure**

Run (from `toolkit/installer/`): `node --test`
Expected: `mcp-install.test.js` FAILS — `enableMcp` is not exported, `doctor` has no `mcp server` check, `main`'s init does not flip.

- [ ] **Step 8: Extend `toolkit/installer/bin/openresearch.mjs`**

8a. Add `writeFileSync` to the fs import. Change:

```js
import { existsSync, readFileSync } from "node:fs";
```

to:

```js
import { existsSync, readFileSync, writeFileSync } from "node:fs";
```

8b. Add `enableMcp` and a plugin-mcp path helper. **Immediately after** the existing `pluginJsonPath` function, add:

```js
export function mcpServerPath(repoRoot) {
  return join(repoRoot, "toolkit", "plugins", "openresearch", "mcp", "server.mjs");
}

export function mcpJsonPath(repoRoot) {
  return join(repoRoot, "toolkit", "plugins", "openresearch", ".mcp.json");
}

// Flip mcp.enabled true in platform.config.json, preserving every other key.
export function enableMcp(repoRoot, {
  read = (p) => readFileSync(p, "utf8"),
  write = (p, s) => writeFileSync(p, s)
} = {}) {
  const p = join(repoRoot, "platform.config.json");
  const cfg = JSON.parse(read(p));
  cfg.mcp = { ...(cfg.mcp ?? {}), enabled: true };
  write(p, JSON.stringify(cfg, null, 2) + "\n");
  return cfg;
}
```

8c. Add the doctor `mcp server` check. In `doctor(...)`, **immediately before** the final `return checks;`, add:

```js
  const mcpPresent = repoRoot
    ? (exists(mcpServerPath(repoRoot)) && exists(mcpJsonPath(repoRoot)))
    : false;
  checks.push({
    name: "mcp server",
    status: mcpPresent ? "ok" : "warn",
    detail: mcpPresent
      ? "Q&A MCP server present — enable with `openresearch init` (sets mcp.enabled)"
      : "run from the repo root to detect the Q&A MCP server"
  });
```

8d. Wire the init flip. In `main(...)`, add `write` to the opts bag default. Change the opts destructuring:

```js
export function main(argv, env = process.env, {
  log = console.log,
  cwd = process.cwd(),
  exists = existsSync,
  read = (p) => readFileSync(p, "utf8"),
  spawn = spawnSync
} = {}) {
```

to:

```js
export function main(argv, env = process.env, {
  log = console.log,
  cwd = process.cwd(),
  exists = existsSync,
  read = (p) => readFileSync(p, "utf8"),
  write = (p, s) => writeFileSync(p, s),
  spawn = spawnSync
} = {}) {
```

Then, inside the `if (command === "init" || command === "update") {` block, replace the existing tail — from `if (!dryRun && !which("claude", …` through `return runPlan(plan, dryRun, { log, path, exists, spawn });` — with:

```js
    const flipMcp = command === "init" && exists(mcpServerPath(repoRoot));

    if (!dryRun && !which("claude", { path, exists })) {
      // Manual-instructions path: print every command, spawn nothing, exit 0.
      log("claude CLI not found — run these manually once it is installed:");
      for (const args of plan) log(args.join(" "));
      return 0;
    }
    runPlan(plan, dryRun, { log, path, exists, spawn });
    if (flipMcp) {
      if (dryRun) {
        log("[dry-run] set mcp.enabled=true in platform.config.json");
      } else {
        enableMcp(repoRoot, { read, write });
        log("mcp.enabled set true in platform.config.json — restart Claude Code to load the Q&A server");
      }
    }
    return plan;
```

(The `flipMcp` guard is `false` in the existing hermetic tests — their injected `exists` never reports `mcp/server.mjs` — so the Cycle-2 `main init --dry-run` and `main init … missing claude` assertions stay byte-identical.)

- [ ] **Step 9: Run installer tests + full suite**

Run (from `toolkit/installer/`): `node --test` → all PASS (`mcp-install.test.js` + the untouched Cycle-2 `openresearch.test.js`).
Run (repo root): `npm test --workspaces` → PASS.
Smoke the real doctor (repo root): `node toolkit/installer/bin/openresearch.mjs doctor` → the output includes `[ok] mcp server — …` (server + `.mcp.json` present in this checkout).

- [ ] **Step 10: Commit**

```bash
git add -A toolkit/plugins/openresearch/mcp/server.mjs toolkit/plugins/openresearch/.mcp.json toolkit/installer/bin/openresearch.mjs toolkit/installer/test/mcp-install.test.js site/test/mcp-server.test.js
git commit -m "feat(qa): hand-rolled MCP server (search/answer) + installer mcp doctor check and init flip" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `try-this-paper` skill

**Files:**
- Create: `toolkit/plugins/openresearch/skills/try-this-paper/SKILL.md`
- Create: `toolkit/plugins/openresearch/skills/try-this-paper/walkthrough.md`

**Interfaces:**
- Consumes: a contribution id `<id>`; `content/contributions/<id>/index.md` + `bundle/`; the `paper-reader` skill (inline, for the summary); the user's own workflow/data (never fabricated). No files written.
- Produces: a printed run-through — paper-reader summary → locate bundle → guide the session through running it on the user's own workflow → capture the **measured** numbers → offer `write-replication`. Never invents measurements.

- [ ] **Step 1: Create `SKILL.md`**

Create `toolkit/plugins/openresearch/skills/try-this-paper/SKILL.md`:

```markdown
---
name: try-this-paper
description: Run one OpenResearch contribution's replication bundle against the user's OWN workflow and capture the measured delta. Use when asked to "try", "run", or "apply" a contribution to my setup. Reads the contribution and its bundle, guides the user through executing it on their data, records the real before/after numbers, and offers to hand off to write-replication. Never fabricates measurements.
---

# try-this-paper — run a contribution on your own workflow

Take a published contribution and help the user actually run it against their own
pipeline, then capture what changed. The whole value is a **real, measured** number —
never invent one, never estimate when you could measure.

## Inputs

- A contribution id `<id>`. Draft: `content/contributions/<id>/index.md`; bundle (if any):
  `content/contributions/<id>/bundle/`.
- The user's own workflow, data, or eval set (they supply or point at it).

## Procedure

1. **Summarize first.** Run the `paper-reader` skill on `<id>` inline so the user sees
   the claimed result, the evidence state, and the replication steps before running anything.
2. **Locate the bundle.** Run exactly:
   - `ls content/contributions/<id>/bundle/` — if absent, say the contribution ships no
     bundle and fall back to the "How to replicate" section of `index.md`.
   - `cat content/contributions/<id>/bundle/README.md` (when present) for the procedure.
3. **Establish the baseline.** Ask the user for their current setup and the metric that
   matters (the same metric the contribution reports, or the closest they have). Measure
   or have them measure the **baseline** number first. Write it down verbatim.
4. **Apply the technique.** Walk the bundle's steps against the user's workflow, adapting
   paths/models to their environment. Change one thing — the technique under test — not five.
5. **Measure the treatment.** Re-run the same metric. Record the **treatment** number.
6. **Report the delta honestly.** State baseline → treatment, the metric, the sample size,
   and whether it matches, beats, or misses the contribution's claimed result. If it missed,
   say so plainly — a negative or partial result is still worth recording.

## Output format (print exactly this shape)

```
try-this-paper · <id>

Claimed result   <result from the contribution>
Your setup       <one line: pipeline / data / metric>
Baseline         <metric> = <value>  (n = <sample size>)
Treatment        <metric> = <value>  (n = <sample size>)
Measured delta   <value change>  →  <replicated | partial | failed vs the claim>

Notes: <caveats — where it transferred, where it did not>
```

## Next action (offer, do not perform)

End by offering the handoff:
- "Want this to count? The `write-replication` skill turns these numbers into a
  schema-valid replication record and opens the PR. Say the word and I'll run it."

## Rules

- **Never fabricate a measurement.** If the user cannot run it now, capture the plan and
  stop — do not print invented numbers.
- Read from `content/`, never from the built site or a URL.
- Do not edit files or write records here — that is `write-replication`'s job.
- Adapt the bundle to the user's environment, but change only the technique under test so
  the delta is attributable.
```

- [ ] **Step 2: Create `walkthrough.md`**

Create `toolkit/plugins/openresearch/skills/try-this-paper/walkthrough.md`:

```markdown
# try-this-paper — walkthrough scenario (the skill's test)

Follow SKILL.md literally against a bundled contribution using a **stubbed** user
workflow (so the transcript is self-contained and no real measurement is invented — the
numbers below are explicitly labelled as a stubbed demo eval).

## Scenario

Target: `heading-aware-chunking` (a tutorial with a bundle and two independent
replications). The "user workflow" is a stubbed 40-query policy-retrieval eval whose
baseline recall@10 is stated as a fixture, not a real run.

## Steps

1. Run `paper-reader` on `heading-aware-chunking` inline.
2. `ls content/contributions/heading-aware-chunking/bundle/` and
   `cat content/contributions/heading-aware-chunking/bundle/README.md`.
3. State the stubbed baseline: recall@10 = 0.70 (n = 40, fixture).
4. Walk the bundle's chunking change against the stubbed workflow.
5. State the stubbed treatment: recall@10 = 0.80 (n = 40, fixture).
6. Emit the exact output block; the measured delta (+10pt) is in line with the
   contribution's claimed +11pt — mark `replicated`.

## Expected observable result

- A paper-reader summary precedes the run.
- The output block shows baseline, treatment, and a measured delta compared to the claim.
- The transcript labels the numbers as a stubbed demo (no real measurement is fabricated).
- Ends with the `write-replication` handoff offer.
- **No files changed** (`git status --porcelain` empty afterwards).

Paste the full session transcript below the line when running this walkthrough.

---
```

- [ ] **Step 3: Verify + commit**

Run (repo root): `npm test --workspaces` and `npm run validate` → green (skills are inert docs).

```bash
git add -A toolkit/plugins/openresearch/skills/try-this-paper/
git commit -m "feat(toolkit): try-this-paper skill — run a contribution on your own workflow, capture the delta" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `write-replication` skill (git discipline explicit)

**Files:**
- Create: `toolkit/plugins/openresearch/skills/write-replication/SKILL.md`
- Create: `toolkit/plugins/openresearch/skills/write-replication/walkthrough.md`
- Create seed record: `content/records/replications/context-window-budgeting--risk-engineering.yaml`

**Interfaces:**
- Consumes: measured numbers (from `try-this-paper` or a user's own run); the frozen `replication` schema; `npm run validate` (blocking); `platform.config.json` (`host`, `repo`) for the branch/PR handoff.
- Produces: a schema-valid YAML replication record in `content/records/replications/`, validated, then a publish-style branch handoff — `contribute/<id>-replication` in remote mode, or the printed no-remote fallback commands. **The walkthrough (Step 2) commits a real seed record directly on the cycle branch as seed evidence** (see the git-discipline decision below).

**Git-discipline decision (resolved — the design left this to the plan):** The walkthrough uses the design's "scratch record committed as seed evidence" option, not the "create-then-revert" option. Concretely:
- The walkthrough produces one **real, schema-valid** replication record for an existing published contribution (`context-window-budgeting`, replicated cross-team by `risk-engineering`).
- That record is committed **directly on the cycle branch `c4-qa-platform`** as seed evidence in Step 3 of this task — **never on `main`, and never on a stray `contribute/*` branch.** This mirrors Cycle-2's `publish` dogfood, which merged its seed into the cycle branch rather than `main`.
- The `contribute/<id>-replication` branch + no-remote push/PR flow is **documented and demonstrated as printed commands** in the SKILL and walkthrough (what a real external contributor runs), but is **not executed** during seeding — so no dangling branch is left and the test stays deterministic.

- [ ] **Step 1: Create `SKILL.md`**

Create `toolkit/plugins/openresearch/skills/write-replication/SKILL.md`:

```markdown
---
name: write-replication
description: Turn a replication run into a submitted replication record. Use when asked to "record", "submit", or "write up" a replication of a contribution. Interviews for the measured numbers, emits a schema-valid YAML record into content/records/replications/, runs the real validator (blocking), then hands off to a publish-style branch flow (contribute/<id>-replication) — or the no-remote fallback. Never fabricates numbers.
---

# write-replication — a run becomes a record

Convert a real replication run into a `content/records/replications/<id>--<team>.yaml`
record that the frozen validator accepts, then get it onto a branch for review. The
validator is the only gate.

## Inputs

- The contribution id `<id>` you replicated (must be a published contribution).
- Your measured numbers: baseline, treatment, the metric, sample size, outcome.
- `platform.config.json` at the repo root — read `host` and `repo`.

## Procedure

1. **Interview** for the record fields (do not invent — ask):
   - `contribution_id`: `<id>` (must resolve to a published contribution).
   - `replicator`: your `name` + `team` (+ optional `division`, `email`).
   - Either `benchmark_id` (a registered benchmark) **or** a `workflow` string (≥10 chars)
     describing what you ran it against — exactly one is required.
   - `method`: how you replicated (≥20 chars).
   - `outcome`: `replicated` | `partial` | `failed`.
   - `measured_delta`: a short human string, e.g. `recall@10 +9pt`.
   - Optional `metrics: [{name, baseline, treatment}]`, `artifacts`, `notes`.
   - `date`: today (YYYY-MM-DD).
2. **Emit** the YAML to `content/records/replications/<id>--<your-team-slug>.yaml`.
3. **Validate (blocking).** Run exactly: `npm run validate`
   - On failure, present each `path  [rule]  message` line as **file · field · fix** and STOP.
     Do not branch a failing record.
   - On success it prints `✓ content validation passed`.
4. **Branch + commit — config-driven.**
   - `git checkout -b contribute/<id>-replication`
   - `git add content/records/replications/<id>--<your-team-slug>.yaml`
   - `git commit -m "replicate(<id>): <outcome> by <team>" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`
5. **Open the PR — config-driven.**
   - **If `platform.config.json.repo` is set** (remote mode):
     `gh pr create --fill --base main --head contribute/<id>-replication`
   - **If `repo` is `null`** (no-remote mode — this machine): do NOT call `gh`. Print, verbatim:
     ```
     No git remote configured (platform.config.json repo: null).
     Local branch contribute/<id>-replication is committed. To publish once a remote exists:

       git remote add origin <REMOTE_URL>
       git push -u origin contribute/<id>-replication
       gh pr create --fill --base main --head contribute/<id>-replication
     ```

## Rules

- **Never fabricate numbers.** Every field comes from the user's real run or is asked for.
- The validator is authoritative and **blocks**. Fix the record; never bypass it.
- Never commit on `main`; always the `contribute/<id>-replication` branch (remote mode) —
  or, when seeding demo evidence in this repo, directly on the active cycle branch, never `main`.
- Never invent a remote or run `git push`/`gh` in no-remote mode — print the commands instead.
- One record per file; name it `<id>--<team-slug>.yaml`.
```

- [ ] **Step 2: Create `walkthrough.md`**

Create `toolkit/plugins/openresearch/skills/write-replication/walkthrough.md`:

```markdown
# write-replication — walkthrough scenario (the skill's test)

Follow SKILL.md literally and produce a REAL, schema-valid record. Git discipline is
explicit: the record is committed on the active cycle branch as seed evidence (Task 5,
Step 3 of the Cycle-4 plan) — never on `main`, and the `contribute/*` branch flow is
shown as printed commands, not executed.

## Scenario (no-remote mode)

`platform.config.json` has `repo: null`. Record a cross-team replication of
`context-window-budgeting` (a note by Priyanka Nair · ib-quant · Institutional) by
`risk-engineering`, replicated against the team's own agent-context workflow.

## Steps (exact)

1. Interview → the fields below (measured on the replicating team's own workflow).
2. Emit `content/records/replications/context-window-budgeting--risk-engineering.yaml`
   with exactly this content:

   ```yaml
   contribution_id: context-window-budgeting
   replicator:
     name: Daniel Okafor
     team: risk-engineering
     division: Risk
   workflow: risk research agent with a fixed 32k context budget across tool results and retrieved chunks
   method: Adopted named context line-items with hard per-item caps and re-ran the agent over our 60-task eval, comparing task completion before and after.
   outcome: replicated
   measured_delta: task completion +7pt, context overflows -80%
   date: 2026-07-14
   ```

3. `npm run validate` → expect `✓ content validation passed`.
4. Show the no-remote branch/PR commands from SKILL.md as PRINTED text (do not execute a
   `contribute/*` branch during seeding).

## Expected observable result

- The record validates (crossref resolves `context-window-budgeting`; `workflow` satisfies
  the `benchmark_id | workflow` requirement).
- The printed no-remote block names `contribute/context-window-budgeting-replication` and
  the three later commands; `gh` is never invoked.
- The seed record is committed on the cycle branch (Task 5, Step 3), never on `main`.

Paste the full session transcript below the line.

---
```

- [ ] **Step 3: Create the seed record, validate, derive, build, test**

Create `content/records/replications/context-window-budgeting--risk-engineering.yaml` with the exact content from the walkthrough's Step 2 above.

Run (repo root): `npm run validate` → `✓ content validation passed`.
Run (repo root): `npm run derive` → regenerates data (this new cross-team replication updates `arena.json`/`evidence.json`/`people.json`; that is expected and the gate uses floors).
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 4: Commit**

```bash
git add -A toolkit/plugins/openresearch/skills/write-replication/ content/records/replications/context-window-budgeting--risk-engineering.yaml site/src/data/
git commit -m "feat(toolkit): write-replication skill + seed replication (context-window-budgeting by risk-engineering)" -m "Seed committed on the cycle branch as evidence; contribute/* branch flow shown as printed commands." -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: Plugin version `0.4.0` + `shipsIn` flips + `/toolkit` reflects the shipped skills

**This is a transcription task.** Bump the pinning anchor, flip the two M7 skills to shipped, and update the Cycle-2 tests that hard-coded the old version / upcoming roster. The `/toolkit` page and `toolkit.json` are content-driven (derived from `plugin.json` + `marketplace.json`) — **verify** nothing else is needed.

**Files:**
- Modify: `toolkit/plugins/openresearch/.claude-plugin/plugin.json` (`version` → `0.4.0`)
- Modify: `toolkit/installer/package.json` (`version` → `0.4.0`)
- Modify: `toolkit/marketplace.json` (`try-this-paper` + `write-replication` `shipsIn` → `null`)
- Modify: `site/test/toolkit-scaffold.test.js` (version 0.4.0; all five skills shipped)
- Modify: `toolkit/installer/test/openresearch.test.js` (planUpdate `pluginVersion` 0.3.0 → 0.4.0)

**Interfaces:**
- Consumes: nothing new. `deriveToolkit` (unchanged) reads `plugin.json.version` + `marketplace.json.skills`, so `toolkit.json` and the `/toolkit` page pick up `0.4.0` and the flipped roster automatically.
- Produces: `plugin.json.version === "0.4.0"`; `marketplace.json` with all five skills `shipsIn: null`; green tests.

- [ ] **Step 1: Bump the plugin version**

In `toolkit/plugins/openresearch/.claude-plugin/plugin.json`, change `"version": "0.3.0"` to `"version": "0.4.0"`.

- [ ] **Step 2: Bump the installer package version**

In `toolkit/installer/package.json`, change `"version": "0.3.0"` to `"version": "0.4.0"`.

- [ ] **Step 3: Flip the two skills to shipped**

In `toolkit/marketplace.json`, change the `shipsIn` of `try-this-paper` and `write-replication` from `"M7"` to `null`. The `skills` array becomes:

```json
      "skills": [
        { "name": "judge", "purpose": "Advisory review of a draft on clarity, claims-vs-evidence, and reproducibility.", "shipsIn": null },
        { "name": "paper-reader", "purpose": "Structured read of one contribution and its evidence, ending in next actions.", "shipsIn": null },
        { "name": "publish", "purpose": "Take a draft from folder to validated, judged, branch-and-PR (or no-remote fallback).", "shipsIn": null },
        { "name": "try-this-paper", "purpose": "Run a contribution's bundle against your own workflow and capture the delta.", "shipsIn": null },
        { "name": "write-replication", "purpose": "Turn a replication run into a submitted replication record.", "shipsIn": null }
      ]
```

- [ ] **Step 4: Update the Cycle-2 scaffold test**

In `site/test/toolkit-scaffold.test.js`, update the two assertions that pinned the old state:
- The version assertion: change `assert.equal(pl.version, "0.3.0");` to `assert.equal(pl.version, "0.4.0");`.
- The roster assertion: change the `shipped`/`upcoming` test so all five are shipped and none upcoming:

```js
test("marketplace skills roster: all five skills shipped, none upcoming", () => {
  const mk = JSON.parse(readFileSync(toolkit("marketplace.json"), "utf8"));
  const skills = mk.plugins.find((p) => p.name === "openresearch").skills;
  const shipped = skills.filter((s) => !s.shipsIn).map((s) => s.name).sort();
  const upcoming = skills.filter((s) => s.shipsIn).map((s) => s.name).sort();
  assert.deepEqual(shipped, ["judge", "paper-reader", "publish", "try-this-paper", "write-replication"]);
  assert.deepEqual(upcoming, []);
});
```

- [ ] **Step 5: Update the installer update-plan test**

In `toolkit/installer/test/openresearch.test.js`, the `planUpdate` test pins `pluginVersion: "0.3.0"`. Update it to `0.4.0` (the plan shape is unchanged):

```js
test("planUpdate plans update+install; --version must match plugin.json", () => {
  assert.deepEqual(planUpdate("/repo/toolkit", { version: null, pluginVersion: "0.4.0" }), [
    ["claude", "plugin", "marketplace", "update", "openresearch"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ]);
  assert.deepEqual(planUpdate("/repo/toolkit", { version: "0.4.0", pluginVersion: "0.4.0" }).length, 2);
  assert.throws(
    () => planUpdate("/repo/toolkit", { version: "0.9.9", pluginVersion: "0.4.0" }),
    /does not match plugin.json version 0.4.0/
  );
});
```

- [ ] **Step 6: Derive, verify the toolkit page reflects 0.4.0, test, build**

Run (repo root): `npm run derive` → regenerates `site/src/data/toolkit.json`.
Verify content-driven propagation (no page edit needed):
- `node -e "const t=require('./site/src/data/toolkit.json'); console.log('version', t.version, 'shipped', t.skills.filter(s=>!s.shipsIn).length, 'upcoming', t.skills.filter(s=>s.shipsIn).length);"` → `version 0.4.0 shipped 5 upcoming 0`.
Run (repo root): `npm test --workspaces` → PASS (updated scaffold + installer tests green).
Run (repo root): `npm run build -w site` → PASS.
Grep the built page: `grep -c "Toolkit v0.4.0" site/dist/toolkit/index.html` → ≥ 1.

- [ ] **Step 7: Commit**

```bash
git add -A toolkit/plugins/openresearch/.claude-plugin/plugin.json toolkit/installer/package.json toolkit/marketplace.json site/test/toolkit-scaffold.test.js toolkit/installer/test/openresearch.test.js site/src/data/toolkit.json
git commit -m "feat(toolkit): bump plugin to 0.4.0 and ship try-this-paper + write-replication" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Watchlist — schema + loader + crossref + template + seeds + `/watchlist` page + `deriveWatchlist` + routes

**This is largely a transcription task.** TDD the validator additions first (following the adoption Task-1 pattern from Cycle 3), then derive + page.

**Files:**
- Create: `content/schemas/watchlist.schema.json`
- Create: `content/templates/watchlist.yaml`
- Create seeds: `content/watchlist/self-rag.yaml`, `content/watchlist/corrective-rag.yaml`, `content/watchlist/listwise-llm-reranking.yaml`, `content/watchlist/chain-of-note.yaml`
- Extend: `content/validator/src/load.js`, `content/validator/src/rules/schema.js`, `content/validator/src/rules/crossrefs.js`
- Create validator tests: `content/validator/test/watchlist-load.test.js`
- Extend: `site/scripts/derive.mjs` (`deriveWatchlist` + CLI emit `watchlist.json`)
- Create: `site/src/pages/watchlist.astro`
- Extend: `site/src/components/Footer.astro` (watchlist link)
- Extend: `site/scripts/check-links.mjs` (`/watchlist/` route)
- Create test: `site/test/derive-watchlist.test.js`

**Interfaces:**
- Consumes: the auto-loading validator registry (`watchlist.schema.json` registers as `getValidator("watchlist")`); the `person` shape reused verbatim.
- Produces (freezes at CP-D):
  - `getValidator("watchlist")` validating `{ id, title, source_url, venue?, added_by{person}, status(watching|claimed|tested), claimed_by{person}?, resulting_contribution? }`.
  - `loadContent(root).watchlist` → `[{file,data}]` (additive), loaded from `content/watchlist/*.yaml`.
  - crossref: an entry's `resulting_contribution` (when present) must resolve to a known contribution.
  - `deriveWatchlist(content)` → `site/src/data/watchlist.json` = array of `{ id, title, source_url, venue, added_by:{name,team}, status, claimed_by:{name,team}|null, resulting_contribution:{slug,title}|null }`, sorted by status rank (`tested` < `claimed` < `watching`) then `title`.
  - `/watchlist` page rendering the table with status chips, the claim-flow doc, and links back to `/benchmarks`.

- [ ] **Step 1: Write the failing schema + loader test + fixtures**

Create fixture contribution `content/validator/test/fixtures/watchlist-root/contributions/reranker-demo/index.md`:

```markdown
---
id: reranker-demo
title: A demo reranker contribution
tier: finding
authors:
  - name: Demo Author
    team: demo-team
category: rag
tags: [retrieval]
status: published
created: "2026-07-01"
updated: "2026-07-10"
---

## Summary

A demo reranker contribution used as a watchlist resulting_contribution target.

## Context

Context body long enough to satisfy the template minimum length rule for findings here.

## Technique

Rerank the top candidates with a small cross-encoder.

## Evidence

Ndcg rose on the demo eval set.

## How to replicate

Run the demo bundle.
```

Create fixture `content/validator/test/fixtures/watchlist-root/watchlist/good.yaml`:

```yaml
id: some-paper
title: A watched paper that produced a contribution
source_url: https://arxiv.org/abs/2305.02156
venue: EMNLP 2023
added_by:
  name: Demo Author
  team: demo-team
status: tested
claimed_by:
  name: Demo Author
  team: demo-team
resulting_contribution: reranker-demo
```

Create fixture `content/validator/test/fixtures/watchlist-root/watchlist/ghost.yaml` (dangling `resulting_contribution` the crossref must flag):

```yaml
id: ghost-paper
title: A watched paper pointing at a missing contribution
source_url: https://arxiv.org/abs/9999.99999
added_by:
  name: Demo Author
  team: demo-team
status: tested
resulting_contribution: no-such-contribution
```

Create `content/validator/test/watchlist-load.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { getValidator } from "../src/schemas.js";
import { loadContent } from "../src/load.js";
import { runValidation } from "../src/runner.js";

const root = fileURLToPath(new URL("./fixtures/watchlist-root/", import.meta.url));

const valid = {
  id: "some-paper",
  title: "A watched paper",
  source_url: "https://arxiv.org/abs/2305.02156",
  added_by: { name: "Demo Author", team: "demo-team" },
  status: "watching"
};

test("accepts a minimal watching entry", () => {
  assert.equal(getValidator("watchlist")(valid), true);
});

test("accepts a tested entry with claimed_by + resulting_contribution", () => {
  assert.equal(getValidator("watchlist")({
    ...valid, status: "tested", claimed_by: { name: "X", team: "t" }, resulting_contribution: "reranker-demo"
  }), true);
});

test("rejects an unknown status", () => {
  assert.equal(getValidator("watchlist")({ ...valid, status: "maybe" }), false);
});

test("rejects an unknown top-level property (additionalProperties:false)", () => {
  assert.equal(getValidator("watchlist")({ ...valid, priority: 1 }), false);
});

test("loader exposes content.watchlist additively; frozen keys intact", () => {
  const content = loadContent(root);
  assert.ok(Array.isArray(content.watchlist));
  assert.equal(content.watchlist.length, 2);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "adoptions", "errors"]) {
    assert.ok(k in content, `content.${k} must still exist`);
  }
});

test("crossref flags a watchlist entry whose resulting_contribution is unknown", () => {
  const findings = runValidation(root);
  const ghost = findings.find((f) => f.rule === "crossref" && /no-such-contribution/.test(f.message));
  assert.ok(ghost, "expected a crossref finding for the ghost resulting_contribution");
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `content/validator/`): `node --test`
Expected: `watchlist-load.test.js` FAILS — no `watchlist` schema, `content.watchlist` undefined, crossref not extended.

- [ ] **Step 3: Create `content/schemas/watchlist.schema.json`**

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Watchlist entry",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "source_url", "added_by", "status"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "title": { "type": "string", "minLength": 1 },
    "source_url": { "type": "string", "format": "uri" },
    "venue": { "type": "string", "minLength": 1 },
    "added_by": { "$ref": "#/definitions/person" },
    "status": { "enum": ["watching", "claimed", "tested"] },
    "claimed_by": { "$ref": "#/definitions/person" },
    "resulting_contribution": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" }
  },
  "definitions": {
    "person": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "team"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "email": { "type": "string", "format": "email" },
        "team": { "type": "string", "minLength": 1 },
        "division": { "type": "string" }
      }
    }
  }
}
```

- [ ] **Step 4: Run to verify the schema tests pass**

Run (from `content/validator/`): `node --test` → the four `getValidator("watchlist")` tests PASS; the loader + crossref tests still FAIL (loader/crossref not yet extended).

- [ ] **Step 5: Extend the loader**

In `content/validator/src/load.js`, add `watchlist: []` to the `content` object literal (immediately after `adoptions: [],`):

```js
    adoptions: [],
    watchlist: [],
    errors: []
```

Then, immediately after the `loadYamlDir(content, join(root, "records", "adoptions"), "adoptions");` line, add:

```js
  loadYamlDir(content, join(root, "watchlist"), "watchlist");
```

- [ ] **Step 6: Extend the schema rule**

In `content/validator/src/rules/schema.js`, immediately after `checkGroup(content.adoptions ?? [], "adoption", findings);`, add:

```js
  checkGroup(content.watchlist ?? [], "watchlist", findings);
```

- [ ] **Step 7: Extend the crossref rule**

In `content/validator/src/rules/crossrefs.js`, immediately after the existing contribution-id loop (the `for (const r of [...content.replications, ...])` block that ends `}`), add a new loop for watchlist `resulting_contribution`:

```js
  for (const w of content.watchlist ?? []) {
    const rc = w.data?.resulting_contribution;
    if (rc && !contributionIds.has(rc)) {
      flag(w.file, `resulting_contribution "${rc}" does not match any contribution`);
    }
  }
```

- [ ] **Step 8: Create the template**

Create `content/templates/watchlist.yaml`:

```yaml
# Watchlist entry — an external paper the team is tracking toward a contribution.
# Place at: content/watchlist/<id>.yaml
# The validator checks: schema (this shape) + crossref (resulting_contribution must resolve when present).

id: some-paper-id                       # required — kebab-case
title: The paper's title                # required
source_url: https://arxiv.org/abs/0000.00000   # required — a URL
venue: NeurIPS 2025                     # optional
added_by:                               # required — who put it on the watchlist
  name: Full Name
  team: your-team
status: watching                        # required — watching | claimed | tested
claimed_by:                             # optional — set when status is claimed/tested
  name: Full Name
  team: your-team
resulting_contribution: some-contribution-id   # optional — set when a contribution came out of it (must resolve)
```

- [ ] **Step 9: Create the four seed entries**

Create `content/watchlist/self-rag.yaml`:

```yaml
id: self-rag
title: "Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection"
source_url: https://arxiv.org/abs/2310.11511
venue: ICLR 2024
added_by:
  name: Marcus
  team: Group Data
status: watching
```

Create `content/watchlist/corrective-rag.yaml`:

```yaml
id: corrective-rag
title: "Corrective Retrieval Augmented Generation"
source_url: https://arxiv.org/abs/2401.15884
venue: arXiv 2024
added_by:
  name: Hana Kim
  team: payments-platform
  division: Payments
status: claimed
claimed_by:
  name: Hana Kim
  team: payments-platform
  division: Payments
```

Create `content/watchlist/listwise-llm-reranking.yaml`:

```yaml
id: listwise-llm-reranking
title: "Zero-Shot Listwise Document Reranking with a Large Language Model"
source_url: https://arxiv.org/abs/2305.02156
venue: arXiv 2023
added_by:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
status: tested
claimed_by:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
resulting_contribution: retrieval-reranker-lite
```

Create `content/watchlist/chain-of-note.yaml`:

```yaml
id: chain-of-note
title: "Chain-of-Note: Enhancing Robustness in Retrieval-Augmented Language Models"
source_url: https://arxiv.org/abs/2311.09210
venue: EMNLP 2024
added_by:
  name: Daniel Okafor
  team: risk-engineering
  division: Risk
status: watching
```

- [ ] **Step 10: Write the failing derive test**

Create `site/test/derive-watchlist.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { deriveWatchlist } from "../scripts/derive.mjs";

function content({ contributions = [], watchlist = [] } = {}) {
  return {
    contributions: contributions.map((fm) => ({ dirName: fm.id, frontmatter: fm })),
    watchlist: watchlist.map((data) => ({ file: `${data.id}.yaml`, data })),
    errors: []
  };
}

test("deriveWatchlist resolves resulting_contribution and sorts tested<claimed<watching", () => {
  const rows = deriveWatchlist(content({
    contributions: [{ id: "reranker", title: "Reranker", status: "published", authors: [] }],
    watchlist: [
      { id: "b-watch", title: "B", source_url: "https://x/1", added_by: { name: "N", team: "t" }, status: "watching" },
      { id: "a-test", title: "A", source_url: "https://x/2", added_by: { name: "N", team: "t" }, status: "tested",
        claimed_by: { name: "N", team: "t" }, resulting_contribution: "reranker" }
    ]
  }));
  assert.equal(rows[0].id, "a-test"); // tested first
  assert.deepEqual(rows[0].resulting_contribution, { slug: "reranker", title: "Reranker" });
  assert.deepEqual(rows[0].added_by, { name: "N", team: "t" });
  assert.equal(rows[1].id, "b-watch");
  assert.equal(rows[1].resulting_contribution, null);
  assert.equal(rows[1].claimed_by, null);
});
```

- [ ] **Step 11: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-watchlist.test.js` FAILS — `deriveWatchlist` not exported.

- [ ] **Step 12: Implement `deriveWatchlist` + CLI emit**

In `site/scripts/derive.mjs`, **immediately after** the `deriveArena(...)` function's closing `}` (before the `// CLI:` comment), add:

```js
// ---- Watchlist (Cycle 4, CP-D). Additive derive output. ----
const WATCH_RANK = { tested: 0, claimed: 1, watching: 2 };

export function deriveWatchlist(content) {
  const byId = new Map(content.contributions.map((c) => [c.frontmatter.id, c]));
  const person = (p) => (p ? { name: p.name, team: p.team } : null);
  const rows = content.watchlist.map((w) => {
    const d = w.data;
    const rc = d.resulting_contribution ? byId.get(d.resulting_contribution) : null;
    return {
      id: d.id,
      title: d.title,
      source_url: d.source_url,
      venue: d.venue ?? null,
      added_by: person(d.added_by),
      status: d.status,
      claimed_by: person(d.claimed_by),
      resulting_contribution: rc ? { slug: rc.dirName, title: rc.frontmatter.title } : null
    };
  });
  rows.sort((a, b) => (WATCH_RANK[a.status] - WATCH_RANK[b.status]) || a.title.localeCompare(b.title));
  return rows;
}
```

Then, in the CLI block, **after** the `writeFileSync(join(outDir, "people.json"), …)` line, add:

```js
    writeFileSync(join(outDir, "watchlist.json"), JSON.stringify(deriveWatchlist(arenaContent), null, 2));
```

(`arenaContent` is the already-loaded content object from the arena/people block; reuse it.)

- [ ] **Step 13: Create the `/watchlist` page**

Create `site/src/pages/watchlist.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import Masthead from "../components/Masthead.astro";
import Footer from "../components/Footer.astro";
import watchlist from "../data/watchlist.json";

const STATUS = {
  watching: { label: "Watching", cls: "stamp" },
  claimed: { label: "Claimed", cls: "stamp claimed" },
  tested: { label: "Tested", cls: "seal" }
};
---
<Base title="Watchlist · OpenResearch">
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead />
    <section class="rv" style="padding: 40px 0 8px; max-width: 64ch;">
      <p class="caps" style="color: var(--oxblood)">Watchlist</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(28px,4vw,40px); line-height: 1.12; margin: 10px 0 12px; text-wrap: balance;">
        External papers we're tracking toward a contribution.
      </h1>
      <p style="color: var(--slate); margin: 0;">
        Claim a paper by opening a PR that flips its <code>status</code> to <code>claimed</code> and sets
        <code>claimed_by</code>. When your run produces a contribution, set <code>resulting_contribution</code> and mark it
        <code>tested</code>. Entries live in <code>content/watchlist/</code>. See the <a href="/benchmarks">benchmark registry</a>.
      </p>
    </section>

    <div class="wl rv">
      <div class="row head"><span>Paper</span><span>Added by</span><span>Status</span><span>Outcome</span></div>
      {watchlist.map((w) => (
        <div class="row">
          <span class="paper">
            <a href={w.source_url} rel="noreferrer">{w.title}</a>
            {w.venue && <span class="venue">{w.venue}</span>}
          </span>
          <span class="who">{w.added_by ? `${w.added_by.name} · ${w.added_by.team}` : "—"}</span>
          <span><span class={STATUS[w.status]?.cls ?? "stamp"}>{STATUS[w.status]?.label ?? w.status}</span></span>
          <span class="outcome">
            {w.resulting_contribution
              ? <a href={`/contributions/${w.resulting_contribution.slug}`}>{w.resulting_contribution.title}</a>
              : (w.claimed_by ? `claimed · ${w.claimed_by.team}` : "—")}
          </span>
        </div>
      ))}
    </div>

    <Footer />
  </main>
</Base>
<style>
  .wl { margin: 24px 0 8px; }
  .row { display: grid; grid-template-columns: 2.4fr 1.3fr auto 1.4fr; gap: 16px; align-items: baseline;
         padding: 13px 6px; border-bottom: 1px solid var(--hairline); }
  .row.head { font-family: system-ui, sans-serif; font-size: 10.5px; letter-spacing: .16em;
              text-transform: uppercase; color: var(--slate); border-bottom: 2px solid var(--ink); }
  .paper a { color: var(--ink); font-weight: 600; text-decoration: none; border-bottom: 1px solid var(--hairline); }
  .paper a:hover { border-color: var(--oxblood); }
  .venue { display: block; font-family: system-ui, sans-serif; font-size: 11px; color: var(--slate); margin-top: 3px; }
  .who, .outcome { color: var(--slate); font-size: 13px; }
  .outcome a { color: var(--oxblood); text-decoration: none; }
  .stamp.claimed { color: var(--oxblood); }
  @media (max-width: 680px) {
    .row { grid-template-columns: 1fr auto; }
    .row .who, .row .outcome, .row.head span:nth-child(2), .row.head span:nth-child(4) { display: none; }
  }
</style>
```

- [ ] **Step 14: Add the Footer watchlist link**

In `site/src/components/Footer.astro`, extend the footer line to add a Watchlist link. Change:

```html
  <span class="caps">OpenResearch · built from content/ on every merge · <a href="/contribute">contribute</a></span>
```

to:

```html
  <span class="caps">OpenResearch · built from content/ on every merge · <a href="/watchlist">watchlist</a> · <a href="/contribute">contribute</a></span>
```

- [ ] **Step 15: Register the route in check-links**

In `site/scripts/check-links.mjs`, add `"/watchlist/",` to the `requiredRoutes` array (immediately after `"/toolkit/",`):

```js
      "/", "/browse/", "/contribute/", "/benchmarks/", "/arena/", "/toolkit/", "/watchlist/", "/404.html",
```

- [ ] **Step 16: Validate, derive, test, build, check-links**

Run (repo root): `npm run validate` → `✓ content validation passed`.
Run (repo root): `npm run derive` → writes `site/src/data/watchlist.json`.
Sanity: `node -e "const w=require('./site/src/data/watchlist.json'); console.log(w.length, w[0].status, w.find(x=>x.status==='tested').resulting_contribution.slug);"` → `4 tested retrieval-reranker-lite`.
Run (from `site/`): `node --test` → PASS.
Run (from `content/validator/`): `node --test` → PASS.
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `node site/scripts/check-links.mjs site/dist` → `✓`.

- [ ] **Step 17: Commit**

```bash
git add -A content/schemas/watchlist.schema.json content/templates/watchlist.yaml content/watchlist/ content/validator/src/ content/validator/test/watchlist-load.test.js site/scripts/derive.mjs site/scripts/check-links.mjs site/src/pages/watchlist.astro site/src/components/Footer.astro site/test/derive-watchlist.test.js site/src/data/
git commit -m "feat(watchlist): schema + loader + crossref + seeds + /watchlist page + deriveWatchlist" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Benchmark registry — `deriveBenchmarks` → `benchmarks.json` + real `/benchmarks` page

**This is a transcription task** for the derive join + page.

**Files:**
- Extend: `site/scripts/derive.mjs` (`deriveBenchmarks` + CLI emit `benchmarks.json`)
- Rewrite: `site/src/pages/benchmarks.astro` (placeholder → real registry)
- Create test: `site/test/derive-benchmarks.test.js`

**Interfaces:**
- Consumes: a loaded `content` object (`benchmarks`, `contributions`, `replications`).
- Produces (freezes at CP-D):
  - `deriveBenchmarks(content)` → `site/src/data/benchmarks.json` = array of `{ id, owner:{name,team}, description, data_pointer, metrics:[{name,definition,higher_is_better}], contributions:[{slug,title}], replications:[{slug,team,outcome,delta,date}] }`, sorted by `id`. `contributions` = published contributions whose frontmatter `benchmarks[]` includes the id; `replications` = replication records whose `benchmark_id` equals the id (only for published contributions). `higher_is_better` defaults to `null` when absent.
  - `/benchmarks` page rendering each benchmark: owner, description, a metrics table, and the referencing contributions + replications, with a link to `/watchlist`.

- [ ] **Step 1: Write the failing test**

Create `site/test/derive-benchmarks.test.js`:

```js
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
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-benchmarks.test.js` FAILS — `deriveBenchmarks` not exported.

- [ ] **Step 3: Implement `deriveBenchmarks` + CLI emit**

In `site/scripts/derive.mjs`, **immediately after** the `deriveWatchlist(...)` function's closing `}` (from Task 7), add:

```js
// ---- Benchmark registry (Cycle 4, CP-D). Additive derive output. ----
export function deriveBenchmarks(content) {
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const publishedIds = new Set(published.map((c) => c.frontmatter.id));
  return content.benchmarks.map((b) => {
    const bm = b.data;
    const contributions = published
      .filter((c) => (c.frontmatter.benchmarks ?? []).includes(bm.id))
      .map((c) => ({ slug: c.dirName, title: c.frontmatter.title }));
    const replications = content.replications
      .map((r) => r.data)
      .filter((r) => r.benchmark_id === bm.id && publishedIds.has(r.contribution_id))
      .map((r) => ({ slug: r.contribution_id, team: r.replicator.team, outcome: r.outcome, delta: r.measured_delta ?? null, date: r.date }));
    return {
      id: bm.id,
      owner: { name: bm.owner.name, team: bm.owner.team },
      description: bm.description,
      data_pointer: bm.data_pointer,
      metrics: (bm.metrics ?? []).map((m) => ({ name: m.name, definition: m.definition, higher_is_better: m.higher_is_better ?? null })),
      contributions,
      replications
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
```

Then, in the CLI block, **after** the `writeFileSync(join(outDir, "watchlist.json"), …)` line (Task 7), add:

```js
    writeFileSync(join(outDir, "benchmarks.json"), JSON.stringify(deriveBenchmarks(arenaContent), null, 2));
```

- [ ] **Step 4: Rewrite the `/benchmarks` page**

Replace the entire contents of `site/src/pages/benchmarks.astro` with:

```astro
---
import Base from "../layouts/Base.astro";
import Masthead from "../components/Masthead.astro";
import Footer from "../components/Footer.astro";
import benchmarks from "../data/benchmarks.json";
---
<Base title="Benchmark registry · OpenResearch">
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead active="benchmarks" />
    <section class="rv" style="padding: 40px 0 8px; max-width: 64ch;">
      <p class="caps" style="color: var(--oxblood)">Benchmark registry</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(28px,4vw,40px); line-height: 1.12; margin: 10px 0 12px; text-wrap: balance;">
        Shared eval sets, so deltas are comparable across teams.
      </h1>
      <p style="color: var(--slate); margin: 0;">
        Every registered benchmark, its owner and metrics, and the contributions and replications that cite it.
        Tracking a paper toward a new contribution? See the <a href="/watchlist">watchlist</a>.
      </p>
    </section>

    <div class="reg rv">
      {benchmarks.map((b) => (
        <article class="bm">
          <div class="bm-head">
            <h2 id={b.id} class="font-display">{b.id}</h2>
            <span class="caps">owner · {b.owner.name} · {b.owner.team}</span>
          </div>
          <p class="bm-desc">{b.description}</p>
          <p class="caps mono">data · {b.data_pointer}</p>

          <table class="metrics">
            <thead><tr><th>Metric</th><th>Definition</th><th>Direction</th></tr></thead>
            <tbody>
              {b.metrics.map((m) => (
                <tr>
                  <td class="mono">{m.name}</td>
                  <td>{m.definition}</td>
                  <td>{m.higher_is_better === true ? "higher is better" : m.higher_is_better === false ? "lower is better" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div class="bm-refs">
            <div>
              <span class="caps" style="color: var(--oxblood)">Contributions ({b.contributions.length})</span>
              {b.contributions.length > 0
                ? <ul>{b.contributions.map((c) => <li><a href={`/contributions/${c.slug}`}>{c.title}</a></li>)}</ul>
                : <p class="none">none yet</p>}
            </div>
            <div>
              <span class="caps" style="color: var(--oxblood)">Replications ({b.replications.length})</span>
              {b.replications.length > 0
                ? <ul>{b.replications.map((r) => <li><a href={`/contributions/${r.slug}`}>{r.slug}</a> · {r.team} · {r.outcome}{r.delta ? ` · ${r.delta}` : ""}</li>)}</ul>
                : <p class="none">none yet</p>}
            </div>
          </div>
        </article>
      ))}
    </div>

    <Footer />
  </main>
</Base>
<style>
  .reg { margin: 22px 0 8px; display: flex; flex-direction: column; gap: 28px; }
  .bm { border: 1px solid var(--hairline); border-radius: 6px; padding: 20px 22px; }
  .bm-head { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; }
  .bm-head h2 { margin: 0; font-weight: 600; font-size: 20px; }
  .bm-desc { color: var(--ink); margin: 10px 0 6px; max-width: 70ch; }
  .mono { font-family: ui-monospace, Consolas, monospace; }
  .caps.mono { color: var(--slate); }
  table.metrics { border-collapse: collapse; font-size: 13.5px; margin: 12px 0; display: block; overflow-x: auto; }
  .metrics th, .metrics td { border: 1px solid var(--hairline); padding: 7px 12px; text-align: left; vertical-align: top; }
  .metrics th { font-family: system-ui, sans-serif; font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--slate); }
  .bm-refs { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 8px; }
  .bm-refs ul { padding-left: 16px; margin: 6px 0 0; }
  .bm-refs li { font-size: 13.5px; color: var(--slate); margin: 4px 0; }
  .bm-refs a { color: var(--oxblood); text-decoration: none; }
  .none { color: var(--slate); font-size: 13px; margin: 6px 0 0; }
  @media (max-width: 640px) { .bm-refs { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 5: Derive, test, build, check-links**

Run (repo root): `npm run derive` → writes `site/src/data/benchmarks.json`.
Sanity: `node -e "const b=require('./site/src/data/benchmarks.json'); console.log(b.length, b.map(x=>x.id).join(','));"` → `3 internal-eval-suite,policy-rag-bench,rerank-eval-set`.
Run (from `site/`): `node --test` → PASS.
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `node site/scripts/check-links.mjs site/dist` → `✓` (`/benchmarks/` already required).
Grep: `grep -c "Benchmark registry" site/dist/benchmarks/index.html` → ≥ 1; `grep -c "rerank-eval-set" site/dist/benchmarks/index.html` → ≥ 1.

- [ ] **Step 6: Commit**

```bash
git add -A site/scripts/derive.mjs site/src/pages/benchmarks.astro site/test/derive-benchmarks.test.js site/src/data/
git commit -m "feat(benchmarks): deriveBenchmarks -> benchmarks.json and real /benchmarks registry page" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Digest + discussions stub

**This is a transcription task** for the digest script, page, config-gated component, and `[slug].astro` insertion.

**Files:**
- Create: `site/scripts/build-digest.mjs`
- Create: `site/src/pages/digest.astro`
- Create: `site/src/components/Discussions.astro`
- Extend: `platform.config.json` (`discussions.enabled`)
- Extend: `site/src/config.mjs` (`discussionsEnabled`)
- Extend: `site/src/pages/contributions/[slug].astro` (insert `<Discussions>`)
- Extend: `site/src/components/Footer.astro` (digest link)
- Extend: `site/package.json` (`build`/`dev` run `build-digest`; add `digest` script)
- Extend: `site/scripts/check-links.mjs` (`/digest/` route)
- Create tests: `site/test/build-digest.test.js`, `site/test/discussions-config.test.js`

**Interfaces:**
- Consumes: a loaded `content` object (contributions, replications, adoptions, endorsements).
- Produces (freezes at CP-D):
  - `buildDigest(content, { now })` → `{ anchor, window: { start, end }, contributions:[{slug,title,tier,date}], replications:[{slug,team,outcome,delta,date}], adoptions:[{slug,team,status,date}], movers:[{handle,name,points}], generated }`. **Decision (resolved — the design left the digest window to the plan):** the window is deterministic and port-stable — it **anchors to the latest date present in content** (max of contribution `updated` + record `date`s), not wall-clock `now`, so the digest is never empty regardless of when the site is built; `end = anchor`, `start = anchor − 6 days` (a 7-day inclusive window). An injectable `now` is accepted for tests but the anchor still floors at the latest content date. `movers` = people credited by in-window scoring events (same point weights as the arena), top 5 by in-window points.
  - `build-digest.mjs` CLI → writes `site/src/data/digest.json`.
  - `/digest` page (Imprint newsletter anatomy) rendering the window's sections.
  - `Discussions.astro` — config-gated: when `config.discussionsEnabled` is false (default, shipped), a styled stub panel with **no external requests**; when true, an empty giscus mount point (real giscus embed is port-time, out of scope).

- [ ] **Step 1: Write the failing digest test**

Create `site/test/build-digest.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildDigest } from "../scripts/build-digest.mjs";

function content() {
  return {
    contributions: [
      { dirName: "new-one", frontmatter: { id: "new-one", title: "New one", tier: "finding", status: "published", updated: "2026-07-14", authors: [{ name: "Ann", team: "t1", division: "D1" }] } },
      { dirName: "old-one", frontmatter: { id: "old-one", title: "Old one", tier: "note", status: "published", updated: "2026-06-01", authors: [{ name: "Old", team: "t9" }] } }
    ],
    replications: [
      { file: "r.yaml", data: { contribution_id: "new-one", replicator: { name: "Bea", team: "t2" }, outcome: "replicated", benchmark_id: "b", measured_delta: "+5pt", date: "2026-07-13" } }
    ],
    adoptions: [
      { file: "a.yaml", data: { contribution_id: "new-one", adopter: { name: "Cal", team: "t3" }, pipeline: "p", status: "active", since: "2026-07-10", date: "2026-07-12" } }
    ],
    endorsements: [],
    errors: []
  };
}

test("buildDigest anchors to the latest content date and includes only the 7-day window", () => {
  const d = buildDigest(content());
  assert.equal(d.anchor, "2026-07-14");
  assert.equal(d.window.start, "2026-07-08");
  assert.equal(d.window.end, "2026-07-14");
  assert.deepEqual(d.contributions.map((c) => c.slug), ["new-one"]); // old-one is out of window
  assert.equal(d.replications.length, 1);
  assert.equal(d.adoptions.length, 1);
  // movers: Ann earned authored(10)+received(15)+adoption(8) in-window; Bea earned performed(12)
  const ann = d.movers.find((m) => m.name === "Ann");
  assert.ok(ann && ann.points >= 33);
  assert.ok(d.movers.find((m) => m.name === "Bea"));
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `build-digest.test.js` FAILS — `../scripts/build-digest.mjs` does not exist.

- [ ] **Step 3: Create `site/scripts/build-digest.mjs`**

Create `site/scripts/build-digest.mjs` (verbatim):

```js
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { slugifyName } from "../src/lib/format.mjs";

const WINDOW_DAYS = 7;
const POINTS = { authored: 10, replicationReceived: 15, replicationPerformed: 12, adoption: 8, adoptionImpactBonus: 4, endorsement: 3 };

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Deterministic, port-stable window: anchor = the latest date in content (floored at now()),
// so the digest is never empty no matter when the site is built.
export function buildDigest(content, { now = () => new Date() } = {}) {
  if (content.errors && content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`build-digest: content has errors — run npm run validate\n${lines.join("\n")}`);
  }
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const byId = new Map(published.map((c) => [c.frontmatter.id, c]));

  const dates = [];
  for (const c of published) dates.push(c.frontmatter.updated);
  for (const r of content.replications) dates.push(r.data.date);
  for (const a of content.adoptions) dates.push(a.data.date);
  for (const e of content.endorsements) dates.push(e.data.date);
  const latest = dates.filter(Boolean).sort().at(-1) ?? now().toISOString().slice(0, 10);
  const anchor = latest; // floored at latest content activity; port-stable
  const start = addDays(anchor, -(WINDOW_DAYS - 1));
  const inWindow = (d) => d && d >= start && d <= anchor;

  const contributions = published
    .filter((c) => inWindow(c.frontmatter.updated))
    .map((c) => ({ slug: c.dirName, title: c.frontmatter.title, tier: c.frontmatter.tier, date: c.frontmatter.updated }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const replications = content.replications.map((r) => r.data)
    .filter((r) => inWindow(r.date) && byId.has(r.contribution_id))
    .map((r) => ({ slug: r.contribution_id, team: r.replicator.team, outcome: r.outcome, delta: r.measured_delta ?? null, date: r.date }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const adoptions = content.adoptions.map((a) => a.data)
    .filter((a) => inWindow(a.date) && byId.has(a.contribution_id))
    .map((a) => ({ slug: a.contribution_id, team: a.adopter.team, status: a.status, date: a.date }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Movers: in-window scoring events with the arena's weights.
  const pts = new Map(); // name -> points
  const bump = (name, n) => pts.set(name, (pts.get(name) ?? 0) + n);
  for (const c of published) {
    if (!inWindow(c.frontmatter.updated)) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.authored);
  }
  for (const r of content.replications.map((x) => x.data)) {
    if (!inWindow(r.date) || r.outcome !== "replicated") continue;
    const c = byId.get(r.contribution_id);
    if (!c) continue;
    const authorTeams = new Set(c.frontmatter.authors.map((a) => a.team));
    if (authorTeams.has(r.replicator.team)) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.replicationReceived);
    bump(r.replicator.name, POINTS.replicationPerformed);
  }
  for (const a of content.adoptions.map((x) => x.data)) {
    if (!inWindow(a.date) || a.status === "retired") continue;
    const c = byId.get(a.contribution_id);
    if (!c) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.adoption + (a.impact ? POINTS.adoptionImpactBonus : 0));
  }
  for (const e of content.endorsements.map((x) => x.data)) {
    if (!inWindow(e.date)) continue;
    const c = byId.get(e.contribution_id);
    if (!c) continue;
    const p = e.type === "adoption" ? POINTS.adoption : POINTS.endorsement;
    for (const au of c.frontmatter.authors) bump(au.name, p);
  }
  const movers = [...pts.entries()]
    .map(([name, points]) => ({ handle: slugifyName(name), name, points }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, 5);

  return { anchor, window: { start, end: anchor }, contributions, replications, adoptions, movers, generated: now().toISOString().slice(0, 10) };
}

// CLI: node scripts/build-digest.mjs [contentRoot] [outDir]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contentRoot = process.argv[2] ?? fileURLToPath(new URL("../../content", import.meta.url));
  const outDir = process.argv[3] ?? fileURLToPath(new URL("../src/data", import.meta.url));
  try {
    const digest = buildDigest(loadContent(contentRoot));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "digest.json"), JSON.stringify(digest, null, 2));
    console.log(`build-digest: window ${digest.window.start}..${digest.window.end} → ${join(outDir, "digest.json")}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 4: Wire `build-digest` into the site scripts**

In `site/package.json`, update the `scripts` block so `dev` and `build` generate `digest.json` (which the `/digest` page imports) before Astro, and add a `digest` convenience script:

```json
  "scripts": {
    "dev": "node scripts/derive.mjs && node scripts/build-digest.mjs && astro dev",
    "build": "node scripts/derive.mjs && node scripts/build-index.mjs && node scripts/build-digest.mjs && astro build && pagefind --site dist",
    "index": "node scripts/build-index.mjs",
    "digest": "node scripts/build-digest.mjs",
    "test": "node --test"
  },
```

- [ ] **Step 5: Add `discussions.enabled` to config**

In `platform.config.json`, add the `discussions` key (default false). The file becomes:

```json
{
  "name": "OpenResearch",
  "host": "github.com",
  "repo": null,
  "site": { "baseUrl": null },
  "judge": { "ci": false },
  "mcp": { "enabled": false },
  "discussions": { "enabled": false }
}
```

In `site/src/config.mjs`, add `discussionsEnabled` to the exported `config` object (immediately after the `mcpEnabled` line):

```js
  mcpEnabled: platform.mcp?.enabled ?? false,
  discussionsEnabled: platform.discussions?.enabled ?? false
```

- [ ] **Step 6: Create `Discussions.astro`**

Create `site/src/components/Discussions.astro`:

```astro
---
import { config } from "../config.mjs";
const { slug } = Astro.props;
const enabled = config.discussionsEnabled;
---
<section class="disc">
  <p class="caps" style="color: var(--oxblood)">Discussions</p>
  {enabled ? (
    <div class="giscus-mount" data-giscus-slug={slug}>
      {/* giscus embed is injected at port time (needs a GitHub Discussions backend). */}
    </div>
  ) : (
    <p class="stub">Discussions light up when this deployment is connected to GitHub Discussions.
      Set <code>discussions.enabled</code> in <code>platform.config.json</code> to turn them on — no external
      requests are made while they are off.</p>
  )}
</section>
<style>
  .disc { border-top: 1px solid var(--hairline); margin-top: 32px; padding-top: 16px; }
  .disc .stub { color: var(--slate); font-size: 13.5px; max-width: 62ch; margin: 8px 0 0; }
  .disc code { font-family: ui-monospace, Consolas, monospace; font-size: .88em; background: var(--soft);
               border: 1px solid var(--hairline); border-radius: 4px; padding: 1px 5px; }
  .giscus-mount { min-height: 40px; }
</style>
```

- [ ] **Step 7: Insert `<Discussions>` on contribution pages**

In `site/src/pages/contributions/[slug].astro`, add the import (after the `Changelog` import):

```js
import Discussions from "../../components/Discussions.astro";
```

Then place the panel just before the closing `</article>` tag — immediately **after** the `{isNote && ( … notebar … )}` block and before `</article>`:

```jsx
        <Discussions slug={slug} />
      </article>
```

(So the discussions panel renders for every tier, at the foot of the article.)

- [ ] **Step 8: Add the Footer digest link**

In `site/src/components/Footer.astro`, extend the footer line to add a Digest link. Change:

```html
  <span class="caps">OpenResearch · built from content/ on every merge · <a href="/watchlist">watchlist</a> · <a href="/contribute">contribute</a></span>
```

to:

```html
  <span class="caps">OpenResearch · built from content/ on every merge · <a href="/digest">digest</a> · <a href="/watchlist">watchlist</a> · <a href="/contribute">contribute</a></span>
```

- [ ] **Step 9: Create the `/digest` page**

Create `site/src/pages/digest.astro`:

```astro
---
import Base from "../layouts/Base.astro";
import Masthead from "../components/Masthead.astro";
import Footer from "../components/Footer.astro";
import { fmtDate } from "../lib/format.mjs";
import digest from "../data/digest.json";
const empty = digest.contributions.length === 0 && digest.replications.length === 0 && digest.adoptions.length === 0;
---
<Base title="Digest · OpenResearch">
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead />
    <section class="rv" style="padding: 40px 0 8px; max-width: 60ch;">
      <p class="caps" style="color: var(--oxblood)">The Digest</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(28px,4vw,40px); line-height: 1.12; margin: 10px 0 10px; text-wrap: balance;">
        The last seven days on the record.
      </h1>
      <p style="color: var(--slate); margin: 0;">
        Window {fmtDate(digest.window.start, "full")} — {fmtDate(digest.window.end, "full")}. Built on demand; the weekly
        cadence is the CI cron's job when deployed.
      </p>
    </section>

    {empty && <p class="none rv">Nothing new in this window. Check the <a href="/browse">record</a>.</p>}

    {digest.contributions.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">New contributions</p>
        {digest.contributions.map((c) => (
          <a class="item" href={`/contributions/${c.slug}`}>
            <span class="it-title">{c.title}</span>
            <span class="it-meta">{c.tier} · {fmtDate(c.date, "short")}</span>
          </a>
        ))}
      </section>
    )}

    {digest.replications.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">New replications</p>
        {digest.replications.map((r) => (
          <a class="item" href={`/contributions/${r.slug}`}>
            <span class="it-title">{r.slug}</span>
            <span class="it-meta">{r.team} · {r.outcome}{r.delta ? ` · ${r.delta}` : ""} · {fmtDate(r.date, "short")}</span>
          </a>
        ))}
      </section>
    )}

    {digest.adoptions.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">New adoptions</p>
        {digest.adoptions.map((a) => (
          <a class="item" href={`/contributions/${a.slug}`}>
            <span class="it-title">{a.slug}</span>
            <span class="it-meta">{a.team} · {a.status} · {fmtDate(a.date, "short")}</span>
          </a>
        ))}
      </section>
    )}

    {digest.movers.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">Movers</p>
        <div class="movers">
          {digest.movers.map((m, i) => (
            <a class="mover" href={`/people/${m.handle}`}>
              <span class="mv-rank">{i + 1}</span><span class="mv-name">{m.name}</span><span class="mv-pts">+{m.points}</span>
            </a>
          ))}
        </div>
      </section>
    )}

    <Footer />
  </main>
</Base>
<style>
  .none { color: var(--slate); margin: 20px 0; }
  .none a { color: var(--oxblood); }
  .sec { margin: 26px 0 6px; }
  .item { display: flex; justify-content: space-between; gap: 14px; align-items: baseline;
          padding: 11px 4px; border-bottom: 1px solid var(--hairline); text-decoration: none; color: inherit; }
  .item:hover { background: var(--soft); }
  .it-title { color: var(--ink); font-weight: 600; }
  .it-meta { color: var(--slate); font-size: 12.5px; font-family: system-ui, sans-serif; }
  .movers { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
  .mover { display: inline-flex; align-items: baseline; gap: 8px; text-decoration: none; color: inherit;
           border: 1px solid var(--hairline); border-radius: 6px; padding: 6px 12px; }
  .mover:hover { border-color: var(--oxblood); }
  .mv-rank { color: var(--oxblood); font-weight: 700; font-variant-numeric: tabular-nums; }
  .mv-name { color: var(--ink); font-weight: 600; }
  .mv-pts { color: var(--slate); font-variant-numeric: tabular-nums; }
</style>
```

- [ ] **Step 10: Register the route in check-links**

In `site/scripts/check-links.mjs`, add `"/digest/",` to the `requiredRoutes` array (after `"/watchlist/",`):

```js
      "/", "/browse/", "/contribute/", "/benchmarks/", "/arena/", "/toolkit/", "/watchlist/", "/digest/", "/404.html",
```

- [ ] **Step 11: Write the config test**

Create `site/test/discussions-config.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config.mjs";

test("discussions default off; config exposes discussionsEnabled", () => {
  assert.equal(config.discussionsEnabled, false);
});
```

- [ ] **Step 12: Derive, digest, test, build, check-links**

Run (repo root): `npm run derive` → data regenerated.
Run (from `site/`): `node scripts/build-digest.mjs` → writes `site/src/data/digest.json`.
Run (from `site/`): `node --test` → PASS.
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `node site/scripts/check-links.mjs site/dist` → `✓`.
Grep the disabled stub renders (no external requests): `grep -c "Discussions light up" site/dist/contributions/heading-aware-chunking/index.html` → ≥ 1.
Grep the digest built: `grep -c "The Digest" site/dist/digest/index.html` → ≥ 1.

- [ ] **Step 13: Commit**

```bash
git add -A site/scripts/build-digest.mjs site/src/pages/digest.astro site/src/components/Discussions.astro site/src/pages/contributions/[slug].astro site/src/components/Footer.astro site/src/config.mjs platform.config.json site/package.json site/scripts/check-links.mjs site/test/build-digest.test.js site/test/discussions-config.test.js site/src/data/
git commit -m "feat(platform): weekly digest (build-digest -> digest.json + /digest) and config-gated discussions stub" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Cycle verification + CONTRACTS.md CP-D freeze + gate test

**Files:**
- Create test: `site/test/cycle4-qa-platform.test.js`
- Modify: `CONTRACTS.md` (fill CP-D: planned → frozen)

**Interfaces:**
- Consumes: the full pipeline (`loadContent`, `derive`, `deriveWatchlist`, `deriveBenchmarks`, `buildQaIndex`, `buildDigest`, `search`, the MCP server) + `site/src/data/*.json`.
- Produces: a green end-to-end cycle gate (floors/invariants only — CP-E-proof) and the CP-D contracts frozen with the exact shapes shipped.

- [ ] **Step 1: Write the cycle gate test (floors/invariants only)**

Create `site/test/cycle4-qa-platform.test.js`:

```js
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
  assert.equal(hits[0].slug, "heading-aware-chunking");
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
```

- [ ] **Step 2: Freeze CP-D in `CONTRACTS.md`**

In `CONTRACTS.md`, **remove** the `- **CP-D (M7+M8):** …` bullet from the "## Planned freezes" section, and **add** a new frozen section immediately after the "## Frozen at CP-C …" table (before "## Planned freezes"):

```markdown
## Frozen at CP-D (M7 + M8, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Corpus index artifact | `site/scripts/build-index.mjs` → `site/public/qa-index.json` | `{ chunks:[{id,slug,tier,section,text,tokens}], model:{df,avgdl,docs,N} }`; one Summary chunk per published contribution + one per H2 section; published raw with the site |
| BM25 search seam | `site/src/lib/bm25.mjs` | `buildIndex(corpus)` + `search(index, query, k)` (pure, zero-dep); CBA swaps Bedrock embeddings behind the same `search(index, query, k)` signature |
| Q&A MCP tools | `toolkit/plugins/openresearch/mcp/server.mjs` | stdio JSON-RPC 2.0 (initialize / notifications/initialized / tools/list / tools/call, newline-delimited). Tools: `openresearch_search {query, k?}` → `{content,structuredContent{query,results[]}}`; `openresearch_answer {question}` → `{content,structuredContent{question,chunks[],citations[]}}`. Server never calls an LLM |
| Watchlist YAML shape | `content/schemas/watchlist.schema.json` | `{ id, title, source_url, venue?, added_by{person}, status(watching\|claimed\|tested), claimed_by{person}?, resulting_contribution? }`; crossref: `resulting_contribution` resolves when present |
| Loader watchlist array | `@openresearch/validator/load` → `loadContent(root)` | Return object gains `watchlist:[{file,data}]` (additive); existing keys unchanged |
| `watchlist.json` shape | `site/scripts/derive.mjs` → `site/src/data/watchlist.json` | `[{ id, title, source_url, venue, added_by{name,team}, status, claimed_by{name,team}\|null, resulting_contribution{slug,title}\|null }]`; sorted tested<claimed<watching then title |
| `benchmarks.json` shape | `site/scripts/derive.mjs` → `site/src/data/benchmarks.json` | `[{ id, owner{name,team}, description, data_pointer, metrics[{name,definition,higher_is_better}], contributions[{slug,title}], replications[{slug,team,outcome,delta,date}] }]` (published-only joins) |
| `digest.json` shape + location | `site/scripts/build-digest.mjs` → `site/src/data/digest.json` | `{ anchor, window{start,end}, contributions[], replications[], adoptions[], movers[{handle,name,points}], generated }`; 7-day window anchored to the latest content date (port-stable) |
| Discussions config key | `platform.config.json` `discussions.enabled` | Additive key (default false); `config.discussionsEnabled` gates `Discussions.astro`; no external requests when off. Plugin `plugin.json` version anchor is now `0.4.0` |
| Routes | `site/src/pages/` | Adds `/watchlist`, `/digest`; `/benchmarks` is now a real registry. Masthead nav stays 4 items + search |
```

Also update the "Frozen at CP-B" note that `plugin.json` version is `0.3.0` is superseded — leave the CP-B row as historical record; the CP-D row above records the `0.4.0` anchor.

- [ ] **Step 3: Full pipeline green + dist checks**

Run, from the repo root, in order:

```bash
npm run validate
npm run derive
npm run build -w site
npm test --workspaces
node site/scripts/check-links.mjs site/dist
```

Expected: validator `✓`; derive writes `watchlist.json` + `benchmarks.json` (+ existing); site build succeeds and publishes `dist/qa-index.json` + `dist/digest/` + `dist/watchlist/`; all tests pass (including `cycle4-qa-platform.test.js`, `bm25.test.js`, `build-index.test.js`, `mcp-server.test.js`, `build-digest.test.js`, `derive-watchlist.test.js`, `derive-benchmarks.test.js`, `mcp-install.test.js`); check-links `✓`.

Platform-completeness dist grep checks (repo root):

```bash
ls site/dist/qa-index.json                                              # exists
grep -c "Benchmark registry" site/dist/benchmarks/index.html           # >= 1
grep -c "Watching" site/dist/watchlist/index.html                      # >= 1
grep -c "The Digest" site/dist/digest/index.html                       # >= 1
grep -c "Discussions light up" site/dist/contributions/prompt-cache-evals/index.html  # >= 1
grep -c "Toolkit v0.4.0" site/dist/toolkit/index.html                  # >= 1
```

- [ ] **Step 4: MCP demo transcript (CP-D gate)**

Capture a real MCP session against the built index and save it under the plugin's mcp dir as evidence (create `toolkit/plugins/openresearch/mcp/DEMO.md`):
- Ensure `site/public/qa-index.json` exists (from Step 3's build).
- Drive the server (the `mcp-server.test.js` frames, or an interactive `node toolkit/plugins/openresearch/mcp/server.mjs` piping the three JSON-RPC lines) and paste the initialize → tools/list → `openresearch_search {query:"heading aware chunking"}` exchange, showing the top hit resolves to `heading-aware-chunking`.

```markdown
# MCP demo transcript (CP-D gate)

Captured against the built site/public/qa-index.json. Frames are newline-delimited JSON-RPC.

<!-- paste the initialize → tools/list → tools/call search exchange here -->
```

- [ ] **Step 5: CP-D self-QC (manual gate)**

Confirm from the built output:
- `openresearch_search` returns sensible top hits for corpus queries (demo transcript captured).
- `/watchlist` shows four papers with status chips; the tested one links to `retrieval-reranker-lite`.
- `/benchmarks` renders all three benchmarks with metrics tables + referencing contributions/replications.
- `/digest` renders the 7-day window with contributions/replications/adoptions/movers.
- The discussions stub renders on contribution pages with **no external requests** (default `discussions.enabled: false`).
- `/toolkit` shows v0.4.0 with all five skills marked ready.

- [ ] **Step 6: Commit**

```bash
git add -A site/test/cycle4-qa-platform.test.js CONTRACTS.md toolkit/plugins/openresearch/mcp/DEMO.md
git commit -m "docs(cycle4): freeze CP-D contracts and add end-to-end Q&A/platform cycle gate" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review (spec-delta coverage)

Every section of the design delta maps to a task:

| Design-delta section | Task(s) |
|---|---|
| Corpus index build artifact (`qa-index.json`) + chunking (per-h2 + summary) | 2 |
| `bm25.mjs` `buildIndex(corpus)` + `search(index, query, k)` (pure, Bedrock-swappable) | 1 |
| Index emitted before astro so it lands in `public/` (ordering decision) | 2 (build script) |
| Q&A MCP server (stdio JSON-RPC subset, search + answer, dev fallback) | 3 |
| Plugin `.mcp.json` gated on config; installer doctor mcp check; init flip | 3 |
| `try-this-paper` skill (SKILL.md + walkthrough) | 4 |
| `write-replication` skill (SKILL.md + walkthrough; git discipline explicit) | 5 |
| Marketplace `shipsIn` flips; plugin `0.3.0 → 0.4.0`; `/toolkit` reflects | 6 |
| Watchlist (schema + loader + crossref + template + seeds + page + derive + routes) | 7 |
| Benchmark registry page + `benchmarks.json` (referencing-contributions join) | 8 |
| Discussions giscus stub (config-gated, CSP-safe locally) | 9 |
| Digest (`build-digest.mjs` → `digest.json` + `/digest` + footer link) | 9 |
| Testing gate (bm25 units, MCP protocol via child_process, watchlist/benchmarks/digest derive, build+check-links) | 1, 2, 3, 7, 8, 9, 10 |
| CP-D freeze + MCP demo transcript | 10 |

**Placeholder scan:** no `TBD`, "similar to task N", or "add appropriate X" remain; every code/YAML/test/SKILL block is complete and verbatim.

**Shape-name consistency across tasks:** the `qa-index.json` shape produced in Task 2 is asserted key-for-key in Task 10 and consumed by the server (Task 3); `buildIndex`/`search` (Task 1) are the single search seam used by build-index (2), the server (3), and the gate (10); the `watchlist.json` shape (Task 7) is asserted in Tasks 7 + 10 and consumed by `/watchlist`; `benchmarks.json` (Task 8) is asserted in 8 + 10 and consumed by `/benchmarks`; `digest.json` (Task 9) is asserted in 9 + 10 and consumed by `/digest`; `deriveWatchlist`/`deriveBenchmarks` reuse the single `arenaContent` load in the CLI; the MCP tool names/shapes are pinned identically in Task 3's frames and the CP-D table.

**Frozen-contract preservation:** `derive()`'s existing outputs + `arena.json`/`people.json`/`toolkit.json` are byte-identical (`watchlist.json`/`benchmarks.json` are new files from new functions); the loader gains `watchlist` additively (existing keys unchanged; the five prior schemas untouched); `config.mjs` gains `discussionsEnabled` additively and keeps `repoUrl`/`mcpEnabled`; all existing routes unchanged (`/benchmarks` body is design); masthead nav stays 4 items + search (watchlist/digest reach readers via `/benchmarks` + footer); the plugin version anchor moves `0.3.0 → 0.4.0` (an explicit, recorded CP-D change) and the Cycle-2 tests that pinned `0.3.0`/upcoming-roster are updated in Task 6.

**Accumulated execution-delta lessons applied:** (1) no `import.meta.url`-relative config reads in bundled code — pages read the `process.cwd()`-safe `config` object or imported `../data/*.json`; (2) `derive.mjs`/`build-index.mjs`/`build-digest.mjs` never import `config.mjs`; the derive CLI reads `platform.config.json` via the existing `import.meta.url` block; (3) card/summary-visible copy stays plain text (watchlist/benchmark/digest strings are literal YAML/derive output); (4) all git steps target `c4-qa-platform`, never `main`; the `write-replication` seed lands on the cycle branch, not a stray `contribute/*` branch; gate anchors use floors/invariants; (5) the installer additions preserve the injectable opts bag and the `flipMcp` guard keeps the Cycle-2 hermetic tests byte-identical.

**CP-E impact (2 more contributions + a replication later) breaks nothing here:** the gate uses floors (`>= 20` chunks, `>= 4` watchlist rows, `rows.length === content.benchmarks.length`, section arrays) not exact totals; the digest window anchors to the latest content date so new activity simply enters the window; `deriveBenchmarks`/`deriveWatchlist`/`buildQaIndex` iterate whatever content exists; the MCP server rebuilds/reloads the index from current content; `check-links` required routes are additive. New contributions flow through every derived output without a code change.
