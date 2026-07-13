# Cycle 3 — M5 Evidence Trail + M6 Arena & Profiles: Design Delta

**Date:** 2026-07-14 · **Status:** Approved (design decisions delegated to Fable per /goal) · **Parents:** [`2026-07-14-m2-m8-master-plan.md`](../plans/2026-07-14-m2-m8-master-plan.md) §5, [`2026-07-13-openresearch-prototype-design.md`](2026-07-13-openresearch-prototype-design.md) (F8, F9, F10, F11)

Everything not covered here inherits the parent specs and the frozen contracts in `CONTRACTS.md`.

## M5 — Replication records complete + evidence trail (F8, F9)

### Adoption record schema (new, freezes at CP-C)

`content/schemas/adoption.schema.json` + `content/records/adoptions/*.yaml`. The M1 endorsement schema already carries `type: adoption` as a lightweight variant; that stays valid (backward compatible). The new first-class adoption record adds what leaderboards and dashboards need:

```yaml
contribution_id: <id>            # required, resolves
adopter: {name, team, division?} # required person (same person shape as elsewhere)
pipeline: <string>               # required — where it runs (e.g. cards-nightly-evals)
status: active | trialing | retired   # required
since: <date>                    # required
impact: <string>                 # optional one-line measured effect
date: <date>                     # required — record date
```

Validator: new schema file + `adoptions/` directory support in the loader (`content.adoptions`), same crossref rule (contribution_id resolves), template-style docs in `content/templates/adoption.yaml` (commented example, like records the M1 templates established).

### Evidence trail on contribution pages (F9)

- Derive: `evidence[slug]` gains `adoptions[]` (from the new records) and `changelog[]` — last 5 non-merge commits touching the contribution's directory: `{rev, date, subject}` via `git log` (empty when history unavailable; same graceful degradation as citation rev).
- Rail (finding/report/tutorial): adoption annotations render between replications and endorsements — caps key `Adoption · <team>`, pipeline line, status chip (`active` = seal-style oxblood box, `trialing`/`retired` = hairline chip). Verified seal count unchanged (replications only).
- New **Changelog section** at the article's end (all tiers, before citation block): caps "Changelog" label, list of `rev · date · subject` lines, links nowhere in M5 (no remote) — it is the git-native "living document" affordance (F16's visible-changelog half; discussions half is M8).
- Note tier: closing bar gains adoption count when > 0 (`N replications · N adoptions · Tried it? Add evidence →`).

## M6 — Arena / leaderboards + contributor profiles (F10, F11)

### Scoring v1 (delegated decision, documented here; freezes as *inputs* at CP-C — weights stay tunable)

Per parent spec: weighted to non-gameable signals; validating others' work earns comparably to contributing.

Points per person:
- **Authored contribution published:** 10 (per contribution, any tier).
- **Replication of your contribution by another team:** 15 per record (the strongest signal — someone else reproduced your result).
- **Replication you performed on someone else's contribution:** 12 per record (reviewer incentive ≈ authoring).
- **Adoption of your contribution (active or trialing):** 8 per record; +4 if a measured `impact` is recorded.
- **Endorsement of your contribution:** 3 per record (adoption-type endorsements from the M1 shape count as adoptions: 8).
- Self-team replications count 0 (non-gameable rule: `replicator.team === any author team` → excluded from both sides).

Team score = sum of member scores attributed while on that team (person→team from the record/frontmatter at event time). Division rolls up team scores. Ties break by replication count, then alphabetically. Formula documented on the arena page footer ("How scoring works" section) — transparency is the anti-gaming device.

### Derive + pages

- `site/scripts/derive.mjs` gains `deriveArena(content)` → `site/src/data/arena.json` (additive; frozen outputs untouched):
  `{individuals: [{handle, name, team, division, score, breakdown:{authored, replicationsReceived, replicationsPerformed, adoptions, endorsements}}], teams: [{team, division, score, members}], divisions: [{division, score, teams}], generated: <iso-date>}`
  `handle` = lowercase-hyphenated name (slug) — used for profile routes. Fails loud on unknown shapes.
- `/arena` (replaces placeholder): three boards (Individuals / Teams / Divisions) as tabs (server-rendered all three, CSS/JS tab switching, first tab visible without JS); rank + name + team + score with tabular-nums; top-3 rows get an oxblood rank numeral; "How scoring works" footer section.
- `/people/<handle>` (new route, freezes at CP-C): auto-generated profile — name, team · division, score + rank line; sections: Contributions (cards), Replications performed (annotation-style rows), Adoptions & endorsements received (compact rows). Imprint anatomy; linkable in performance reviews (parent spec F11).
- Masthead nav unchanged (arena already present); profile pages linked from arena rows and contribution bylines.

### Seed evidence for arena signal

Cycle 2 left adoptions empty. Add 4–6 adoption records across the 10 contributions (verbatim in plan) so boards and profiles have realistic spread; at least one `trialing`, one with `impact`, one `retired` (renders correctly, scores 0 for retired — decision: only active/trialing score).

## Testing (cycle gate)

- Validator: adoption schema fixtures (valid + 3 invalid variants), loader `adoptions` array, crossref.
- Derive: `deriveArena` unit tests on fixtures (scoring table cases: self-team exclusion, adoption impact bonus, retired = 0, tie-break) + evidence extension tests (adoptions[], changelog[] shape, no-git graceful).
- Site: build + check-links green with `/arena` + one `/people/<handle>` in requiredRoutes; profile pages generated for every scored person.
- CP-C gate self-QC: arena ranks the seeded teams plausibly; profiles render for every seed author; evidence rails show adoptions; changelog sections present.

## Out of scope (unchanged)

Discussions embed (M8), watchlist (M8), Q&A/MCP + M7 skills, per-claim anchoring (deferred beyond M8), real-time anything.
