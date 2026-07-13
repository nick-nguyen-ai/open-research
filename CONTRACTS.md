# OpenResearch feature contracts

Features are static; designs are flexible. Anything listed here is a **frozen contract**: later milestones, skills, CI, and external consumers may depend on it, and it must not change shape without an explicit human decision recorded in this file. Everything visual — design tokens' *values*, component markup/CSS, motion, page layout, copy tone — is a **design** and may be revised at any time, provided no contract below changes.

Registry maintained per [`docs/superpowers/plans/2026-07-14-m2-m8-master-plan.md`](docs/superpowers/plans/2026-07-14-m2-m8-master-plan.md) §1. Each execution cycle appends the contracts it adds at its gate.

## Frozen at CP-A (M1 + M2, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Contribution frontmatter schema | `content/schemas/contribution.schema.json` | 4 tiers (`finding`, `technical-report`, `tutorial`, `note`); optional `result` (3–80 chars) / `result_detail` (≤160) |
| Replication record shape | `content/schemas/replication.schema.json` | `anyOf benchmark_id \| workflow` |
| Endorsement record shape | `content/schemas/endorsement.schema.json` | |
| Benchmark registry entry shape | `content/schemas/benchmark.schema.json` | `id/owner{name,team}/description/data_pointer/metrics[]` |
| Tutorial required headings | `content/validator/src/rules/template.js` | `You'll need`, `You'll build`, `Steps`, `Wrap-up` |
| Validator loader API | `@openresearch/validator/load` → `loadContent(root)` | Returns `{contributions, replications, endorsements, benchmarks, errors}`; the only content parser — site and CI both consume it |
| Derive output shapes | `site/scripts/derive.mjs` → `site/src/data/*.json` | `stats {contributions, replications, teams}`; `cards[]` (slug/tier/category/title/summary/date/replications/teams/result); `filters {tiers,categories,tags}[{value,count}]`; `evidence[slug] {replications[], endorsements[], rev}` |
| Stats semantics | derive | Count only `outcome: "replicated"` replications and `status: "published"` contributions |
| Routes | `site/src/pages/` | `/`, `/browse`, `/contributions/<id>`, `/tags/<t>`, `/categories/<c>`, `/contribute`, `/benchmarks`, `/arena`, `/toolkit`, `404` |
| Design-token *mechanism* | `site/src/styles/global.css` `:root` custom properties | Token names (`--paper`, `--ink`, `--oxblood`, `--slate`, `--hairline`, `--soft`) are contract; their hex values are design |
| Search open contract | `[data-search-open]` click / ⌘K / Ctrl+K | Any element carrying the attribute opens the overlay |
| Config seam | `site/src/config.mjs` (`repoUrl`) | Grows into `platform.config.json` at CP-B |

## Frozen at CP-B (M3 + M4, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Portability seam keys | `platform.config.json` | Exactly `name`, `host`, `repo` (null = no-remote), `site.baseUrl`, `judge.ci`, `mcp.enabled`. `site/src/config.mjs` derives `config.repoUrl = repo ? https://host/repo : null` |
| Marketplace shape | `toolkit/marketplace.json` | `{ name, owner{name,url}, plugins:[{ name, source, description, skills:[{name,purpose,shipsIn}] }] }`; `shipsIn: null` = shipped, `"M<N>"` = upcoming |
| Plugin manifest | `toolkit/plugins/openresearch/.claude-plugin/plugin.json` | `{ name, version, description, author }`; `version` is the installer's pinning anchor (0.3.0) |
| Skill CLI names | `toolkit/plugins/openresearch/skills/` | `judge`, `paper-reader`, `publish` (SKILL.md instruction docs; advisory `judge` never blocks) |
| Installer commands | `toolkit/installer/bin/openresearch.mjs` | `openresearch init` / `update [--version <semver>]` / `doctor`; `init` and `update` support `--dry-run` (print the exact command plan), `doctor` is read-only and ignores the flag; bin name `openresearch` |
| Toolkit derive output | `site/scripts/derive.mjs` → `site/src/data/toolkit.json` | `{ name, version, description, source, skills:[{name,purpose,shipsIn}], install:{init, marketplaceAdd} }` (additive; existing derive outputs unchanged) |
| No-remote fallback | `publish` skill + installer | When `platform.config.json.repo` is null, flows print exact push/PR commands instead of calling `gh` |

## Frozen at CP-C (M5 + M6, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Adoption record shape | `content/schemas/adoption.schema.json` | `{ contribution_id, adopter{person}, pipeline, status(active\|trialing\|retired), since, impact?, date }`; same `person` shape as elsewhere. M1 `type: adoption` endorsements remain valid (backward compatible) |
| Loader adoptions array | `@openresearch/validator/load` → `loadContent(root)` | Return object gains `adoptions: [{file,data}]` (additive); existing keys unchanged. Crossref: adoption `contribution_id` must resolve |
| Extended evidence shape | `site/scripts/derive.mjs` → `site/src/data/evidence.json` | `evidence[slug]` gains `adoptions:[{team,pipeline,status,impact,since,date}]` and `changelog:[{rev,date,subject}]` (last 5 non-merge commits, `[]` when no git); existing `replications`/`endorsements`/`rev` unchanged |
| Arena scoring inputs | `site/scripts/derive.mjs` `buildScoreModel` | Point values (weights tunable, inputs frozen): authored 10; replication received 15 / performed 12 (only `replicated`, cross-team); adoption 8 (+4 impact); endorsement 3; adoption-type endorsement 8; self-team replication 0; retired adoption 0 |
| `arena.json` shape | `site/scripts/derive.mjs` → `site/src/data/arena.json` | `{ individuals:[{handle,name,team,division,score,breakdown{authored,replicationsReceived,replicationsPerformed,adoptions,endorsements}}], teams:[{team,division,score,members}], divisions:[{division,score,teams}], generated }`; null-division teams excluded from divisions |
| `/people/<handle>` route + profile shape | `site/src/pages/people/[handle].astro` → `site/src/data/people.json` | Keyed by `handle` (= lowercase-hyphenated name); `{handle,name,team,division,rank,score,breakdown,contributions[],replicationsPerformed[],received[]}`; generated for every scored person |

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

## Planned freezes

_None — all cycle checkpoints through CP-D are frozen above._
