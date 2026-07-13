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
| Installer commands | `toolkit/installer/bin/openresearch.mjs` | `openresearch init` / `update [--version <semver>]` / `doctor`, all with `--dry-run`; bin name `openresearch` |
| Toolkit derive output | `site/scripts/derive.mjs` → `site/src/data/toolkit.json` | `{ name, version, description, source, skills:[{name,purpose,shipsIn}], install:{init, marketplaceAdd} }` (additive; existing derive outputs unchanged) |
| No-remote fallback | `publish` skill + installer | When `platform.config.json.repo` is null, flows print exact push/PR commands instead of calling `gh` |

## Planned freezes

- **CP-C (M5+M6):** adoption record schema, extended `evidence{}` shape, arena scoring inputs + `arena.json` shape, `/people/<handle>` route + profile JSON shape.
- **CP-D (M7+M8):** corpus-index artifact format, Q&A MCP tool names/signatures, watchlist YAML shape, digest output location.
