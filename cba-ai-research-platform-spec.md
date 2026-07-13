# CBA AI Research Platform — Project Specification

**Status:** Draft v1.0 · **Owner:** Nick · **Date:** July 2026
**Purpose of this doc:** Source of truth for scope, target state, and design principles. Input to the implementation plan (to be built in Claude Code).

---

## 1. Objective

Build an internal, bank-wide AI research platform — an "agentic arXiv" — where **anyone at CBA can contribute and consume applied AI research effortlessly**, with quality established through **verified evidence (replications, measured impact)** rather than gatekeeping.

The platform consists of two coupled products:

1. **The Site** — a static, world-class reading/publishing surface hosted on on-prem GitHub Enterprise Pages.
2. **The Toolkit** — a marketplace of Claude Code skills/plugins/MCP servers that make reading, experimenting, validating, and publishing near-zero-effort, running locally against AWS Bedrock.

## 2. Background & Problem Statement

- The AI Research Department is currently the only sanctioned channel for research. Its output skews academic ("novelty chasing" or overly ambitious), leaving a gap between research and what measurably improves the bank's workflows.
- Practitioners across the bank (many with PhDs) regularly discover practical improvements (e.g., eval-pipeline techniques) but have **no channel to share them** and no recognition for doing so.
- Colleagues are busy: any contribution process with friction will fail. Ease of use is the adoption strategy, not a nice-to-have.

## 3. Vision & Positioning

- **Positioning axis:** *verified impact*, not novelty. The platform is framed publicly as the **applied research layer, complementary** to the AI Research Department — never as a rival. It competes on an axis the research dept structurally cannot occupy: evidence, replication, and adoption.
- **Unit of value:** not "a paper" but "a technique, replicated by N teams, with measured deltas, adopted into M pipelines."
- **North star:** leadership sees a live dashboard of value captured (replications, adoption, hours saved) that no publication count can match.

## 4. Selling Points & Design Principles

| # | Principle | Implication |
|---|-----------|-------------|
| P1 | **Anyone can contribute** | No role/department gating. Contribution tiers legitimize small findings, not just papers. |
| P2 | **Contribute effortlessly** | One-command install; braindump → published Finding in minutes via skills. |
| P3 | **Gate attention, not entry** | Everything passing mechanical CI gets in. Visibility (front page, arena, digest) is earned via verified signals. Weak content is invisible, not rejected. |
| P4 | **Evidence is the quality model** | Replications, measured deltas, endorsements ARE quality control. Anything discoverable is, by construction, verified. |
| P5 | **Content-as-data, everything derived** | Git repo = single source of truth (documents + structured records). Site, arena, dashboard, digest, search index are all derived build artifacts. |
| P6 | **Intelligence lives in the toolkit, not the site** | The site is a pure read surface. All agentic capability runs locally in Claude Code (Bedrock), via skills + MCP. |
| P7 | **Fable-level UX on three hero loops** | Read / Try / Publish must feel like magic. Everything else is secondary. |

## 5. Personas

1. **Contributor** — practitioner (e.g., model validator, data scientist) who found a practical improvement and wants to share it in <30 min of effort.
2. **Validator/Replicator** — engineer who tests a published technique against their own workflow/evals; earns arena credit for doing so.
3. **Reader/Learner** — anyone keeping up with AI; consumes tutorials, digests, collections; asks corpus-wide questions from Claude Code.
4. **Team Lead / Middle Manager** — tracks team stats; promotes platform use because it evidences team impact.
5. **Executive** — consumes the leadership dashboard; the audience for "too good to ignore."
6. **Platform Maintainer** (Nick, initially) — curates, seeds content, maintains CI, schemas, and toolkit.

## 6. Target State — The Hero Loops

### Loop 1: Read
Open any contribution (or external paper) and converse with it **in the context of your own work** — "how does this apply to my current pipeline?" — via the `paper-reader` skill. Corpus-wide Q&A via MCP: "has anyone at CBA tried X?" answered with citations to internal contributions.

### Loop 2: Try
One command from "interesting claim" to "running against my own evals": the `try-this-paper` skill scaffolds an experiment from the contribution's replication bundle, runs it locally, and produces a structured result. Submitting that result as a **replication record** (a PR) takes one more command.

### Loop 3: Publish
`publish` skill turns a rough braindump into a formatted contribution (correct template + frontmatter), runs the local LLM-judge review, and opens the PR. Target: **under 15 minutes** from draft to submitted Finding.

## 7. Feature Set by Phase

### Phase 1 — Publish loop (MVP)
- **F1. Contribution repo + schemas** — markdown contributions with strict frontmatter; contribution tiers: `finding` (1-page), `technical-report`, `tutorial`, `note`.
- **F2. Static site** — browse, read, search (client-side), tag/category filtering, beautiful reading UI. Built by GitHub Actions on merge.
- **F3. PR-based publishing** — templates per tier; merge = publish; git history = versioning + attribution.
- **F4. CI sanity checks (blocking, mechanical only)** — frontmatter schema validation, template compliance, link checks, build passes, **secrets/PII scanning**.
- **F5. Local LLM-judge skill (advisory, never blocking)** — pre-submission review of clarity, claims-vs-evidence, reproducibility of the bundle. Optionally posts an advisory PR comment/label in CI.
- **F6. Toolkit v1 + marketplace page** — marketplace attached to the site as a dedicated page; skills: `publish`, `paper-reader`, bootstrap installer (`npx <platform> init`) that installs the starter kit, configures MCP, verifies Bedrock access; includes version pinning + `update` command.
- **F7. Seed content** — ≥10 of Nick's own contributions, each with a working replication bundle.

### Phase 2 — Evidence & arena (the defensible phase)
- **F8. Replication records** — structured data files submitted via PR (skill-assisted): who ran it, against what benchmark/workflow, measured delta, pass/fail, notes.
- **F9. Evidence trail on each contribution** — replication list, endorsements, adoption declarations rendered on the contribution page.
- **F10. Arena / leaderboards** — individual + team + division rankings. Scoring weighted to non-gameable signals: replication count (by *other* teams), adoption, measured deltas, downstream contributions. Validating others' work earns points comparably to contributing (reviewer incentive).
- **F11. Contributor profiles** — auto-generated personal pages (internal "Google Scholar"): contributions, replications performed, adoption stats. Designed to be linkable in performance reviews.
- **F12. Corpus-wide Q&A MCP** — embedding/search index published as a build artifact; MCP server consumed by Claude Code locally.
- **F13. `try-this-paper` + `write-replication` skills.**
- **F14. External paper watchlist** — tracked arXiv/industry papers; "claim to test internally" flow; resulting Findings link back.
- **F15. Shared benchmark registry** — catalog of internal eval sets/benchmarks that replication records reference, making deltas comparable across teams.
- **F16. Discussions** — GitHub Discussions embedded per contribution (giscus self-hosted for GHE). Living documents with visible changelogs (git-native).
- **F17. Weekly digest** — auto-generated by Actions (email or page).

### Phase 3 — Undeniable
- **F18. Leadership dashboard** — live page: contributions, replications, adoption, estimated hours saved, techniques in production. The executive pitch artifact.
- **F19. Curated collections / learning tracks** — editor- or Claude-curated tracks assembled from existing contributions.
- **F20. Request/bounty board** — teams post problems ("anyone found a good approach to X?"); contributors claim them; matches problems to underused expertise.

### Explicit non-goals (v1)
Real-time collaboration · in-browser notebooks · chat/social features · custom auth (GHE identity only) · custom comment system · any backend service (until a dynamic need forces one).

## 8. Quality Model

1. **Blocking gates are mechanical only** (F4). An LLM judge never blocks a merge.
2. **LLM judge is local-first and advisory** (F5) — improves quality before submission; CI variant only labels/comments.
3. **Visibility is earned**: front page, arena, and digest surface only contributions with verified signals. Unvalidated content remains published but low-visibility.
4. **Human merge decision** stays with maintainers/CODEOWNERS per category (lightweight, checklist-based — not academic peer review).
5. **Anti-gaming**: replications only count from users outside the author's team; endorsements are attributed and public; scoring formula published openly.

## 9. Architecture

### 9.1 Principles
- **Single source of truth:** one GHE repo (or small set) containing contributions (markdown) + structured records (YAML/JSON: replications, endorsements, benchmarks, adoption declarations) under strict schemas.
- **Everything derived:** site, search/embedding index, arena, profiles, dashboard, digest are build artifacts regenerated by GitHub Actions on merge. New features = new consumers of the same data; no database, no migrations.
- **Stable contracts:** frontmatter schema + record schemas are the public API. Skills, MCP, and site are all thin clients over these contracts.
- **Writes go through git, never the site.** Site is read-only; actions (endorse, replicate, publish) happen via skills opening PRs or pre-filled issue/PR deep links.
- **Escape hatch:** if a genuinely dynamic need emerges, add one small internal API service behind the same data contracts; nothing else changes.

### 9.2 Dynamic-feature workarounds on GitHub Pages
| Need | Mechanism |
|------|-----------|
| Profiles, arena, dashboard, collections, digest | Build-time generation from repo data (updates ~minutes after merge) |
| Live PR/review status, recent activity | Client-side calls to GHE REST/GraphQL using user's session |
| Comments/discussions | Embedded GitHub Discussions (giscus for GHE) |
| Endorse / replicate / publish actions | Skills open PRs; or deep-linked issue/PR templates |
| AI features (Q&A, reading, experiments) | Local Claude Code + Bedrock; MCP consumes published index artifact |
| Notifications | Digest via Actions + GitHub native notifications |

### 9.3 Stack (proposed, to confirm in implementation plan)
- **Hosting:** on-prem GitHub Enterprise Pages · **CI:** GitHub Actions (self-hosted runners; Bedrock access needed only if CI runs the advisory judge)
- **Site:** static site generator (Astro proposed) + client-side search (e.g., Pagefind)
- **Toolkit:** existing plugin marketplace (Nick's), attached as a site page; npx-style installer; skills/plugins/MCP per Claude Code plugin spec
- **LLM:** AWS Bedrock (Claude), invoked locally by skills

### 9.4 Repos (proposed)
1. `platform-content` — contributions + records + schemas (the data repo)
2. `platform-site` — site generator, build pipelines, CI definitions
3. `platform-toolkit` — marketplace, skills, plugins, MCP server(s)

## 10. Data Schemas (to detail in implementation plan)

- **Contribution frontmatter:** id, title, tier, authors, team/division, category, tags, status, created/updated, replication-bundle path, benchmark refs, related (internal/external) links.
- **Replication record:** contribution id, replicator + team, benchmark/workflow ref, method, measured delta, outcome (replicated / partial / failed), date, artifacts link.
- **Benchmark registry entry:** id, owner, description, data pointer, metric definitions, access notes.
- **Endorsement / adoption record:** contribution id, endorser/adopting team, type, statement, date.
- **Arena scoring config:** published weights over replications, adoption, deltas, downstream builds, validation work performed.

## 11. Success Metrics

- **Adoption:** MAU of toolkit (installer telemetry or opt-in ping), unique contributors, unique replicators, % contributors outside AI/data roles.
- **Evidence:** replications per contribution (target ≥1 for 50% of Findings within 60 days), cross-team replication rate.
- **Impact:** techniques adopted into production, aggregate measured deltas, estimated hours saved (dashboard).
- **Effort:** median time from draft to submitted Finding (<15 min), bootstrap-to-first-use time (<10 min).
- **Political:** leadership dashboard viewed by ≥1 EGM; platform cited in ≥1 performance review cycle.

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| "Low-quality dumping ground" criticism | Gate attention not entry (P3/P4); anything discoverable is verified; publish scoring formula |
| Political conflict with AI Research Dept | Position as complementary applied layer; never frame as rival; invite them to contribute/endorse |
| Empty-platform cold start | Seed ≥10 contributions with working bundles before any demo; demo the Try loop to teams directly |
| No one replicates (empty evidence trail) | Reviewer incentives in arena scoring; bounty board (P3); make replication a 1-command skill |
| Data/PII leakage into bank-wide repo | Blocking secrets/PII CI scan from day one; contribution checklist; maintainer review |
| Skill drift across machines | Version pinning + `update` command in installer; marketplace shows versions |
| LLM judge false positives demoralize contributors | Judge is advisory-only, local-first, never blocks |
| Gamed leaderboard discredits arena | Non-gameable signals only; cross-team replication requirement; public formula |
| Maintainer bottleneck (single owner) | Checklist-based merge criteria; recruit category CODEOWNERS early; automate everything mechanical |

## 13. Open Questions (resolve during implementation planning)

1. Confirm GHE Pages + self-hosted Actions runner capabilities/quotas on-prem; runner access to Bedrock (needed only for CI advisory judge).
2. Single content repo vs. per-division repos (start single; revisit at scale).
3. Embedding index format + hosting path for the Q&A MCP artifact.
4. Digest delivery channel (email via internal SMTP from Actions vs. page-only).
5. Arena scoring formula v1 (weights, decay, team normalization).
6. Naming/branding of the platform.
7. Governance: who besides Nick can merge in each category at launch.

## 14. Build Sequence (input to implementation plan)

1. Schemas + content repo + CI (F1, F4) → 2. Site MVP (F2, F3) → 3. Publish skill + installer + marketplace page (F5, F6) → 4. Seed content (F7) → **[internal soft launch to friendly teams]** → 5. Replication records + evidence trail (F8, F9) → 6. Arena + profiles (F10, F11) → 7. Q&A MCP + try/replicate skills (F12, F13) → 8. Watchlist, benchmarks, discussions, digest (F14–F17) → **[leadership demo]** → 9. Dashboard, collections, bounty board (F18–F20).
