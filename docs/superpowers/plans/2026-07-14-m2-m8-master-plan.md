# OpenResearch M2–M8 Master Plan

> **For agentic workers:** This is the program-level plan for completing the platform. Each execution cycle below expands into a code-level implementation plan (superpowers:writing-plans, complete code, TDD) written just-in-time against the real repo, then executed with superpowers:subagent-driven-development. Do not execute milestones from this document directly — it defines contracts, sequencing, and gates, not file contents.

**Goal:** Complete the OpenResearch platform (features F2–F17 of `cba-ai-research-platform-spec.md`) as a world-class AI research platform — made by Fable — with every feature implemented, visually observed at checkpoints, and proven by a final acceptance test in which Fable uses the platform's own flows to contribute real content.

**Date:** 2026-07-14 · **Status:** Active · **Parents:** [`2026-07-13-openresearch-prototype-design.md`](../specs/2026-07-13-openresearch-prototype-design.md) (milestone map), [`2026-07-13-m2-site-design.md`](../specs/2026-07-13-m2-site-design.md) (M2 design), [`2026-07-13-m2-site-mvp.md`](2026-07-13-m2-site-mvp.md) (M2 task plan, in flight)

---

## 1. The governing principle: features vs. designs

**Features are static. Designs are flexible.** (User directive, M2 onward.)

- A **feature contract** is anything a later milestone, a skill, CI, or an external consumer depends on: content schemas, record shapes, derived-JSON shapes, URL routes, CLI/skill interfaces, MCP tool signatures, config seams. Once a contract ships at a milestone gate, it is **frozen** — later work may add to it, never break it.
- A **design** is how a feature looks and feels: design tokens, component markup/CSS, motion, page layout, copy tone. Designs may be revised at any time — including after M8 — and doing so must never touch a feature contract. The architecture enforces this: all data flows through `content/` → derive scripts → `site/src/data/*.json` → pages; presentation lives entirely in `site/src/{styles,components,layouts,pages}` and `toolkit/` never imports from it.
- The registry of frozen contracts lives in **`CONTRACTS.md`** at the repo root (created at Gate CP-A). Every cycle plan states which contracts it adds. A contract change after freezing requires an explicit human decision recorded in that file.

### Contracts already frozen (M1, M2-so-far)

| Contract | Where | Frozen since |
|---|---|---|
| Contribution frontmatter schema (4 tiers; optional `result`/`result_detail`) | `content/schemas/contribution.schema.json` | M1 / M2-T1 |
| Replication + endorsement record shapes | `content/schemas/*.schema.json` | M1 |
| Tutorial required headings: You'll need / You'll build / Steps / Wrap-up | validator `rules/template.js` | M2-T1 |
| Validator loader API: `loadContent(root)` via `@openresearch/validator/load` | `content/validator` | M2-T1 |
| Derived JSON shapes: `stats`, `cards[]`, `filters`, `evidence{}` | `site/scripts/derive.mjs` | M2-T3 |
| Routes: `/`, `/browse`, `/contributions/<id>`, `/tags/<t>`, `/categories/<c>`, `/contribute`, `/benchmarks`, `/arena`, `/toolkit` | `site/src/pages` | M2 |
| Design tokens as CSS custom properties (the *mechanism* is contract; the *values* are design) | `site/src/styles/global.css` | M2-T2 |

---

## 2. Execution model

Seven milestones compress into **four execution cycles**. Each cycle:

1. **Spec deltas** (only where design decisions remain — listed per cycle below; decided with the user or, where delegated, by Fable following the world-class spirit).
2. **Code-level plan** written just-in-time (writing-plans: complete code, exact paths, TDD).
3. **SDD execution** — Sonnet/Opus implementers, per-task reviewer subagents, Fable QC (standing model policy).
4. **Milestone review** — whole-branch code review at maximum capability.
5. **Visual gate** — the user observes the built site/toolkit before merge (checklist provided per gate).

Standing constraints (all cycles): Node ≥ 20, pure ESM, no TypeScript, bare `node --test`, no CDN assets, fail-loud derive scripts, `prefers-reduced-motion` support, commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`, SDD ledger at `.superpowers/sdd/progress.md`.

---

## 3. Cycle 1 — finish M2 (site MVP) · Gate CP-A

**Branch:** `m2-site-mvp` (in flight — Tasks 1–6 complete, Task 7 committed awaiting review).

Remaining: Task 7 review; Task 8 contribution pages (per-tier anatomies + evidence rail); Task 9 Pagefind search overlay; Task 10 static pages + 404; Task 11 link check + CI site-build job + docs; final whole-branch review; **new closing task: create `CONTRACTS.md`** recording §1's table. Then finishing-a-development-branch (merge to `main`).

**Contracts added at CP-A:** everything in §1's table.

**Gate CP-A (visual):** user runs `npm run site:dev`, checks: home signature moments (masthead rule-draw, stat count-up — fires once), browse filtering, all four tier anatomies (finding result band / report contents+rail / tutorial twin-box+steps / note no-ceremony), evidence rail annotations + verified seal + stamp animation, ⌘K search, dark mode, reduced-motion, 404. Checklist ships in `site/README.md` (Task 11).

## 4. Cycle 2 — M3 toolkit + M4 seed content · Gate CP-B

Merged because seed content is the toolkit's integration fixture: every seed contribution is published *through* the `publish` skill, proving F3/F5/F6 end-to-end while creating F7.

**M3 features (contracts added):**
- `toolkit/plugins/openresearch/` Claude Code plugin: skills `publish` (validate → brief judge pass → branch/PR via `gh`, local-branch fallback when no remote) and `paper-reader` (structured reading of a contribution + its evidence).
- LLM judge skill (F5): advisory only, session-model-backed, never blocks; optional CI comment variant shipped disabled behind `platform.config.json`.
- `toolkit/marketplace.json` (standard Claude Code marketplace format) + `/toolkit` page rendering it (replaces placeholder).
- Installer: `npx openresearch init` (+ `update`, version pinning) configuring plugin + MCP stub.
- `platform.config.json` portability seam (host, repo names, model provider).
- **Skill CLI names, marketplace.json shape, and config-seam keys freeze at CP-B.**

**M4 features:** ≥10 contributions across all four tiers (the 4 existing + ≥6 new), each with a working replication bundle; distributed across ≥4 fictional teams/divisions so M6's arena has signal. Written by Opus implementers, content-reviewed by Fable for fake-but-plausible quality.

**Design surface (flexible):** `/toolkit` marketplace page layout; judge-output formatting; seed-content prose style.

**Gate CP-B (visual + functional):** marketplace page renders; `npx openresearch init` succeeds on this machine; user (or Fable, observed) runs `publish` on a draft and sees the validated local-branch flow; browse shows ≥10 contributions across tiers. *Soft-launch demo state per parent spec.*

## 5. Cycle 3 — M5 evidence trail + M6 arena & profiles · Gate CP-C

Merged because both are derive-script + page work over the same records, and arena scoring is meaningless before the evidence trail exists.

**M5 features (contracts added):**
- Adoption record schema (`content/records/adoptions/`) joining replications/endorsements (F8 complete).
- Evidence trail on contribution pages (F9): full replication list, endorsements, adoptions, git-native changelog section; the M2 rail slots these in (rail architecture already anticipates it).
- `write-replication`-ready record shapes (consumed by M7's skill).
- **Adoption schema + extended `evidence{}` derive shape freeze at CP-C.**

**M6 features (contracts added):**
- Arena scoring script → `site/src/data/arena.json`: weights favor non-gameable signals — replications *by other teams*, adoption count, measured deltas, downstream contributions; validating others' work scores comparably to contributing (F10). **Scoring formula v1 decided at cycle-3 spec time (delegated to Fable, documented in the spec delta).**
- `/arena` page (replaces placeholder): individual + team + division boards.
- Contributor profiles (F11): `/people/<handle>` auto-generated — contributions, replications performed, adoption stats; linkable in performance reviews. **Route + profile JSON shape freeze at CP-C.**

**Design surface (flexible):** arena board layout, profile page anatomy, evidence-trail visual treatment.

**Gate CP-C (visual):** contribution pages show full evidence trails; arena ranks the seeded teams plausibly; profile pages render for every seed author; all Imprint-consistent.

## 6. Cycle 4 — M7 Q&A + M8 platform completeness · Gate CP-D

**M7 features (contracts added):**
- Corpus index build artifact: chunked contributions + BM25 lexical search (indexer behind an interface so CBA can swap Bedrock embeddings) (F12).
- Q&A MCP server in `toolkit/plugins/openresearch/mcp/`, consumed by Claude Code locally. **MCP tool names/signatures freeze at CP-D.**
- `try-this-paper` + `write-replication` skills (F13) — the read→implement→evidence loop.

**M8 features (contracts added):**
- Watchlist (F14): `content/watchlist/*.yaml`, page, "claim to test internally" flow linking resulting findings back.
- Benchmark registry page (F15): `/benchmarks` (replaces placeholder) rendering `content/benchmarks/`.
- Discussions (F16): giscus embed per contribution, stubbed locally behind `platform.config.json`.
- Weekly digest (F17): Actions-generated digest page.

**Design surface (flexible):** watchlist/registry/digest page layouts, discussion embed placement.

**Gate CP-D (visual + functional):** Q&A MCP answers a corpus question in a live Claude Code session; watchlist claim flow works; digest page generates; every placeholder route now has its real page — **all F2–F17 features observable.**

## 7. Final acceptance test · Gate CP-E (the /goal)

Fable proves the platform by using it as a contributor — through the real toolkit flows, not by hand-placing files:

1. **Tutorial contribution:** *"Using OpenResearch: read an article, implement it, and contribute your results."* Produced by actually running the loop — `paper-reader` on an existing contribution, a small implementation, `write-replication` for the evidence, `publish` to open the branch/PR. The tutorial's own bundle contains the transcript/artifacts of that run.
2. **Technical-report contribution:** *"Codebase indexing with OpenWiki: cutting agent token spend ~60%."* Subject: LangChain's OpenWiki (remote referenced from the bundle; exact URL verified at execution). Benchmark data mocked but internally consistent (per-task token counts, with/without index, ~60% aggregate saving); published through `publish` with a judge pass.

**Pass criteria:** both contributions pass validator + full CI, render with correct tier anatomy and evidence rail, appear in browse/search/tags, the tutorial's replication appears on its target's evidence trail, arena/profiles update, and the user visually confirms the end state. Defects found here are platform bugs — fixed before the program is called complete.

## 8. Sequencing, risks, decisions reserved to the user

- **Order is fixed:** CP-A → CP-B → CP-C → CP-D → CP-E. Each gate requires the previous merge.
- **User decision points:** gate sign-offs; any frozen-contract change; giscus vs. fully-stubbed discussions (CP-D); digest delivery form (page vs. email format, CP-D); rebranding from "OpenResearch" (any time — it's a design, token-level change).
- **Delegated to Fable** (world-class spirit, documented in cycle spec deltas): arena scoring v1 weights, profile anatomy, Q&A chunking strategy, all visual design within the Imprint system.
- **Risks:** `gh`/no-remote fallback paths must stay first-class (this machine has no remote); Windows/POSIX path duality in toolkit scripts (M1/M2 conventions carry over); giscus needs a real Discussions backend — local stub is the deliverable, live wiring is a port-time task; token-budget spikes in M4 content writing (mitigate: Opus with tight briefs, Fable reviews).
