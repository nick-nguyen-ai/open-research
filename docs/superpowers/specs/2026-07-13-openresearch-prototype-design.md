# OpenResearch Prototype — Design

**Date:** 2026-07-13 · **Status:** Approved · **Parent spec:** [`cba-ai-research-platform-spec.md`](../../../cba-ai-research-platform-spec.md)

This document records the decisions and design that turn the CBA AI Research Platform spec (Phase 1 + Phase 2, features F1–F17) into a buildable prototype. The parent spec remains the source of truth for vision, principles, and feature definitions; this doc resolves what the spec deferred to implementation planning.

## Locked decisions

| Decision | Choice | Rationale |
|---|---|---|
| Scope of first plan | Phase 1 + Phase 2 (F1–F17), as a sequenced roadmap of sub-plans | User decision; milestones keep it executable |
| Environment | Portable prototype in this repo, generic GitHub-compatible tooling | Personal machine; port to CBA GHE later |
| Repo layout | Monorepo with `content/`, `site/`, `toolkit/` mirroring the three future repos | Simplest to develop/demo; split when porting |
| Working name | **OpenResearch** | Matches directory; installer is `npx openresearch init`; easy rebrand |
| Site stack | Astro + Pagefind | Content-first SSG, zero-backend search, fits GHE Pages |
| Marketplace | Built fresh (standard Claude Code plugin marketplace) | No existing asset reused |
| Seed content | Placeholder contributions (fake-but-plausible), ≥10, all tiers | Real drafts don't exist yet; placeholders double as integration fixtures |

## Monorepo layout

```
OpenResearch/
├─ content/                    # → platform-content repo later
│  ├─ schemas/                 # JSON Schema: frontmatter + all record types (the public API)
│  ├─ contributions/<id>/      # index.md + replication bundle/
│  ├─ records/                 # replications/, endorsements/, adoptions/ (YAML)
│  ├─ benchmarks/              # benchmark registry entries (YAML)
│  └─ watchlist/               # tracked external papers (YAML)
├─ site/                       # → platform-site: Astro app + derive scripts
│  └─ scripts/                 # build-time: arena scores, profiles, digest, search/QA index
├─ toolkit/                    # → platform-toolkit
│  ├─ marketplace.json         # Claude Code plugin marketplace (also rendered as a site page)
│  ├─ plugins/openresearch/    # skills: publish, paper-reader, judge, try-this-paper, write-replication
│  │  └─ mcp/                  # corpus Q&A MCP server
│  └─ installer/               # npx openresearch init (+ update, version pinning)
└─ .github/workflows/          # validate.yml (blocking), build-site.yml, digest.yml
```

## Key design choices

- **One validation engine, used twice.** A Node CLI (driven by `content/schemas`) performs schema validation, template compliance, link checks, and secrets/PII scanning (gitleaks + pattern rules). CI calls it as the blocking gate (F4); the `publish` skill calls the same CLI locally pre-submission, so contributors are never surprised by CI.
- **LLM judge needs no API keys.** The judge (F5) is a Claude Code skill running in the contributor's own session — Bedrock-backed at CBA, whatever the local session uses here. No provider integration code in the prototype. An optional CI judge variant is written but disabled behind config; it only labels/comments, never blocks.
- **Derived-everything as build scripts.** Arena scores, profiles, evidence trails, dashboard data, and digest are Node scripts that read `content/` and emit JSON; Astro pages render that JSON. New feature = new script + page. No database, no migrations (P5).
- **Q&A index without Bedrock.** The corpus index (F12) is a build artifact: chunked contributions + BM25 lexical search in the prototype. The indexer sits behind an interface so CBA can swap in Bedrock embeddings without touching the MCP server.
- **PR flows via `gh` CLI.** Skills open PRs through `gh`, which works identically on github.com and GHE (`GH_HOST`). With no remote configured, skills fall back to creating a local branch plus instructions.
- **Portability seam.** A single `platform.config.json` holds host, repo names, and model-provider settings — the only file that changes when porting to CBA's environment.

## Milestones (each becomes a sub-plan at execution)

1. **M1** — Schemas + content structure + CI (F1, F4)
2. **M2** — Site MVP: browse, read, search, tag/category filtering (F2, F3)
3. **M3** — Toolkit v1: `publish`, `paper-reader`, judge skill, installer, marketplace page (F5, F6)
4. **M4** — Seed content: ≥10 placeholder contributions across all tiers (F7)
   → *soft-launch demo state*
5. **M5** — Replication records + evidence trail (F8, F9)
6. **M6** — Arena/leaderboards + contributor profiles (F10, F11)
7. **M7** — Q&A MCP + `try-this-paper` / `write-replication` skills (F12, F13)
8. **M8** — Watchlist, benchmark registry, discussions (giscus, stubbed locally), weekly digest (F14–F17)

## Error handling

- Validator output is human-readable and actionable (file, field, expected vs. found); CI surfaces it directly in the PR.
- Skills validate before opening PRs and report failures with the exact fix, never a stack trace.
- Build scripts fail the site build loudly on malformed records rather than silently dropping content.

## Testing

- Validator: unit tests with valid/invalid fixtures per schema.
- Site: build smoke test in CI (build must pass on every merge — itself a blocking gate).
- Skills: each ships with a scripted walkthrough scenario.
- Seed content is the integration fixture: every feature (evidence trail, arena, profiles, digest) must render correctly from it.

## Out of scope (per parent spec)

Phase 3 (F18–F20), real-time collaboration, in-browser notebooks, custom auth, custom comments, any backend service. Arena scoring formula v1 weights, digest delivery channel, and governance are resolved during their respective milestones, not here.
