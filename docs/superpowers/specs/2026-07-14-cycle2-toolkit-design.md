# Cycle 2 — M3 Toolkit v1 + M4 Seed Content: Design Delta

**Date:** 2026-07-14 · **Status:** Approved (design decisions delegated to Fable per /goal) · **Parents:** [`2026-07-14-m2-m8-master-plan.md`](../plans/2026-07-14-m2-m8-master-plan.md) §4, [`2026-07-13-openresearch-prototype-design.md`](2026-07-13-openresearch-prototype-design.md) (F5, F6, F7)

This delta records the design decisions the master plan reserved for cycle-2 spec time. Everything not covered here inherits the parent specs.

## M3 — Toolkit v1

### Plugin structure (standard Claude Code marketplace)

```
toolkit/
├─ marketplace.json                     # {"name":"openresearch","owner":{...},"plugins":[{"name":"openresearch","source":"./plugins/openresearch",...}]}
├─ plugins/openresearch/
│  ├─ .claude-plugin/plugin.json        # name, version (semver — the pinning anchor), description
│  ├─ skills/
│  │  ├─ publish/SKILL.md
│  │  ├─ paper-reader/SKILL.md
│  │  └─ judge/SKILL.md
│  └─ mcp/                              # M7 placeholder: README.md stating what lands there (no dead config)
└─ installer/                           # npm package `openresearch` (bin: openresearch)
   ├─ package.json
   └─ bin/openresearch.mjs              # init / update / doctor
```

### The three skills (M3)

All skills are instruction documents (SKILL.md) that drive the session's own model — no API keys, no provider code (parent-spec key choice). Each names its exact CLI calls so behavior is reproducible, and each ships with a scripted walkthrough scenario under `toolkit/plugins/openresearch/skills/<name>/walkthrough.md` used as the test.

1. **`publish`** — guides a contributor from draft to PR:
   - Locate/scaffold the draft under `content/contributions/<id>/` (offer the tier templates from `content/templates/`).
   - Run `npm run validate` (the same validator CI runs — never surprised by CI); on failure, present file·field·fix and stop.
   - Run the `judge` skill inline (advisory; contributor may proceed regardless).
   - Branch `contribute/<id>`, commit, then `gh pr create` — with `platform.config.json`-driven host. **No-remote fallback (first-class on this machine):** create the local branch + commit, then print the exact push/PR commands.
2. **`paper-reader`** — structured reading of one contribution: loads `index.md` + its records via paths (not the site), outputs Summary → Claimed result → Evidence state (replications/endorsements with deltas) → How to replicate → Open questions. Ends by offering next actions (try it, replicate it — M7 skills named as "coming").
3. **`judge`** — advisory review, never blocking (F5): rubric = **Clarity** (would a busy engineer follow it?), **Claims vs. evidence** (is every quantitative claim backed by the bundle/benchmark?), **Reproducibility** (could another team run the bundle as-is?). Output: per-axis verdict (`strong / adequate / needs work`) + at most 5 concrete suggestions + one-line overall. The optional CI variant is **written but disabled** behind `platform.config.json` (`judge.ci: false`); it only labels/comments.

### Installer (`npx openresearch init`)

- `init`: detect `claude` CLI → `claude plugin marketplace add <toolkit path or repo URL from platform.config.json>` → `claude plugin install openresearch@openresearch` → print verification steps. Without `claude` CLI: print manual install instructions (copy path, marketplace add command). Idempotent (re-running repairs).
- `update`: re-resolve marketplace, reinstall pinned version; `--version <semver>` pins explicitly (checks `plugin.json` version).
- `doctor`: checks node ≥20, `claude` CLI presence, `gh` presence + auth (warn-only), validator runs.
- Bedrock verification from the parent spec is a `doctor` warn-only probe stub (real probe is CBA-port work).
- Pure Node, no dependencies; testable via `node --test` (arg parsing, config resolution, command planning — the `claude`/`gh` invocations behind a `--dry-run` flag that prints the exact commands, which the tests assert).

### `platform.config.json` (repo root — the portability seam, contract at CP-B)

```json
{
  "name": "OpenResearch",
  "host": "github.com",
  "repo": null,
  "site": { "baseUrl": null },
  "judge": { "ci": false },
  "mcp": { "enabled": false }
}
```
`repo: null` = no-remote mode (this machine). `site/src/config.mjs` now reads this file (single seam; its `repoUrl` export becomes derived).

### `/toolkit` page (replaces placeholder)

Renders `toolkit/marketplace.json` at build time (derive step extends to copy it into `site/src/data/toolkit.json`): plugin card (name, version, description), per-skill rows (name, one-line purpose, "ships in M<N>" tag for M7 skills), and an install panel with the two copy-able commands (`npx openresearch init`, manual marketplace add). Imprint design; layout is design-layer (flexible).

## M4 — Seed content (to ≥10 contributions)

Six new contributions (current 4 → 10), fake-but-plausible, each with a working bundle; distributed for arena/profile signal (≥4 teams, ≥3 divisions — teams file `content/teams.yaml` is **not** introduced; team/division stay frontmatter strings until M6 decides aggregation):

| id | tier | team | evidence to seed |
|---|---|---|---|
| `retrieval-reranker-lite` | finding | Markets · markets-analytics | 2 replications (other teams), 1 endorsement |
| `pii-scrubber-prompts` | finding | Risk · risk-engineering | 1 replication, 1 adoption-ready endorsement |
| `batch-inference-queueing` | technical-report | Payments · payments-platform | 1 replication |
| `prompt-regression-harness` | tutorial | Cards · cards-experience | 2 replications |
| `context-window-budgeting` | note | Institutional · ib-quant | none (fresh note) |
| `eval-rubric-drift` | note | Risk · risk-engineering | 1 endorsement |

- At least one seed is **published through the `publish` skill's non-interactive path** (validate → branch → local-PR fallback) and its walkthrough transcript stored in that contribution's bundle — dogfooding proof for CP-B.
- New benchmark entries only where records need them (`rerank-eval-set`, reusing `internal-eval-suite`/`policy-rag-bench` elsewhere).
- All records must pass the M1 validator untouched; stats/arena implications (counts, teams) verified via derive output in the plan's tests.

## Testing (cycle gate)

- Installer: `node --test` unit tests (dry-run command planning, config resolution, doctor checks mocked by PATH manipulation).
- Skills: walkthrough scenarios executed once by an implementer subagent following SKILL.md literally; transcript committed.
- Site: existing suite + `/toolkit` page checks (marketplace JSON rendered, commands present) + derive counts (10 contributions, team spread).
- CI: validate + site-build jobs must stay green with the new content volume.

## Out of scope (unchanged)

MCP server implementation, `try-this-paper`/`write-replication` (M7); adoption records (M5); arena scoring (M6); real remote/PR creation (needs a remote — flows print exact commands instead).
