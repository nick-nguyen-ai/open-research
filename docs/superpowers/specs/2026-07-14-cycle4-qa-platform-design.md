# Cycle 4 — M7 Q&A + Skills, M8 Platform Completeness: Design Delta

**Date:** 2026-07-14 · **Status:** Approved (delegated per /goal) · **Parents:** [`2026-07-14-m2-m8-master-plan.md`](../plans/2026-07-14-m2-m8-master-plan.md) §6, parent design (F12–F17)

Everything not covered here inherits the parent specs and `CONTRACTS.md`.

## M7 — Corpus Q&A + the read→implement→evidence skills (F12, F13)

### Corpus index (build artifact)

- `site/scripts/build-index.mjs` → `site/public/qa-index.json` (published with the site, consumable as a raw artifact): chunked contributions (per h2 section, plus frontmatter summary chunk) with `{id, slug, tier, section, text, tokens}` + a plain BM25 postings model `{df, avgdl, docs}` computed at build.
- Indexer behind an interface: `buildIndex(content)` + `search(index, query, k)` in `site/src/lib/bm25.mjs` (pure functions, zero deps — CBA swaps in Bedrock embeddings behind the same search signature).
- Emitted by the existing derive step chain (`npm run derive` stays contract-frozen; the index build is a separate `npm run index` script wired into `site` build like pagefind — order: derive → astro build → pagefind → index? No: index needs only content/, so it runs alongside derive in the site `build` script BEFORE astro so the artifact lands in `public/`).

### Q&A MCP server (F12)

- `toolkit/plugins/openresearch/mcp/server.mjs` — stdio MCP server, zero deps (hand-rolled JSON-RPC 2.0 over stdio; the protocol subset needed: initialize, tools/list, tools/call).
- Tools (names/signatures freeze at CP-D):
  - `openresearch_search {query, k?}` → top-k chunks with slug/section/score + repo paths.
  - `openresearch_answer {question}` → search + structured answer scaffold (top chunks + citation lines; the calling session's model composes the prose — the server never calls an LLM).
- Registered in the plugin (`.mcp.json` in the plugin dir) gated on `platform.config.json` `mcp.enabled` (installer's init flips it true once verified; `doctor` gains an mcp check).
- Loads `qa-index.json` from the built site dir (path from `platform.config.json`), falling back to building in-memory from `content/` via the validator loader when no built index exists (dev mode).

### Skills (F13)

- `try-this-paper`: given a contribution id — paper-reader summary → locate bundle → guide the session through running it on the user's own workflow → capture measured numbers → offer `write-replication`.
- `write-replication`: interview → emit a schema-valid YAML replication record into `content/records/replications/` → run `npm run validate` → hand off to `publish`-style branch flow (contribute/<id>-replication branch, no-remote fallback).
- Both: SKILL.md + walkthrough.md, marketplace `shipsIn` flips `"M7"` → `null`, plugin version 0.3.0 → 0.4.0.

## M8 — Watchlist, registry, discussions, digest (F14–F17)

- **Watchlist (F14):** `content/schemas/watchlist.schema.json` + `content/watchlist/*.yaml` (`{id, title, source_url, venue?, added_by{person}, status: watching|claimed|tested, claimed_by{person}?, resulting_contribution?}` — crossref: `resulting_contribution` resolves when present). `/watchlist` page: table of papers with status chips; claim flow = PR editing status→claimed (documented on the page); nav gains Watchlist under Browse? No — masthead stays; watchlist links from /benchmarks page section and footer (nav is frozen at 5 items + search).
- **Benchmark registry page (F15):** `/benchmarks` placeholder becomes real: renders `content/benchmarks/*.yaml` (id, owner, description, metrics table, which contributions/replications reference it — joined at derive). New derive emission `benchmarks.json` (additive).
- **Discussions (F16):** giscus embed component on contribution pages, rendered ONLY when `platform.config.json.discussions.enabled` (new key, default false) — locally a styled stub panel ("Discussions light up when connected to GitHub Discussions — see platform.config.json") in its place. No external requests when disabled (CSP-safe locally).
- **Digest (F17):** `site/scripts/build-digest.mjs` → `site/src/data/digest.json` (last 7 days by `updated`/record dates: new contributions, new replications/adoptions, arena movers) + `/digest` page (Imprint newsletter anatomy; the "weekly" cadence is the CI cron's job at CBA — locally it builds on demand). Footer links Digest.

## Testing

- bm25: unit tests (tokenize, idf, ranking sanity: exact-term doc outranks unrelated; k respected).
- MCP server: protocol-level tests driving stdio with JSON-RPC frames (initialize → tools/list → tools/call search) via child_process in node:test.
- Watchlist/digest/benchmarks: schema fixtures + derive tests + build/check-links green (new routes registered).
- Skills: walkthrough transcripts (write-replication's walkthrough performs a REAL record creation against a fixture-safe id then reverts, or targets a scratch record committed as seed evidence — plan decides, git discipline explicit).
- CP-D gate: every F2–F17 feature observable; MCP demo transcript captured (session calling openresearch_search against the real index).

## Out of scope

Real giscus wiring (needs GitHub Discussions backend — port-time), Bedrock embeddings, email delivery of digest, Phase-3 features (F18–F20).
