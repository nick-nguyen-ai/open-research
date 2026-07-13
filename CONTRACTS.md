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

## Planned freezes

- **CP-B (M3+M4):** skill CLI names (`publish`, `paper-reader`, judge), `toolkit/marketplace.json` shape, installer commands (`npx openresearch init`/`update`), `platform.config.json` keys.
- **CP-C (M5+M6):** adoption record schema, extended `evidence{}` shape, arena scoring inputs + `arena.json` shape, `/people/<handle>` route + profile JSON shape.
- **CP-D (M7+M8):** corpus-index artifact format, Q&A MCP tool names/signatures, watchlist YAML shape, digest output location.
