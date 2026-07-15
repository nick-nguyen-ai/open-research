# Review process design — two-stage, journal-modeled

Date: 2026-07-15 · Status: approved direction, spec for planning
Decisions made in session: **soft gate** at PR time; **full build** (gate + rails);
**no separate `/review-process` page** — everything consolidates into `/contribute`.

## 1. The process (policy)

Modeled on the modern open-review journal (arXiv/eLife), not the gatekeeping one —
because at launch there are no human reviewers, and the platform must still show a
credible quality bar.

| Journal stage | OpenResearch mechanism | State |
|---|---|---|
| Desk check (format, scope) | Validator — blocks | exists |
| Referee report | `judge` skill: Clarity / Claims-vs-evidence / Reproducibility | exists; gains one duty: write its report as a review record |
| Revise & resubmit | Any axis `needs-work` pauses `publish`; contributor revises, judge re-reviews | new (in `publish`) |
| Editorial decision | **Soft gate in `publish`**: all axes ≥ `adequate` → merge; else revise **or** override with a stated reason, recorded and shown on the page | new |
| Peer review | Post-publication, human, never blocking: signed `review` records + existing endorsements / replications / adoptions. A replication is the strongest review | new record type |
| Reviewer incentive | Arena credit: human review = 5 points (judge = 0) | new scoring input |
| Errata / retraction | Changelog on each contribution | exists |

Principles preserved:
- The **validator** remains the only hard gate (CP-A).
- The **judge never blocks** (CP-B wording stays literally true): it referees and
  writes its report; the gate logic lives entirely in `publish`, the editor role.
- A determined contributor can always publish — but dissent is on the record.
- Future (out of scope now): when human editors exist, the `research-paper` tier can
  require one human review pre-merge via a `platform.config.json` key. No key is
  added in this cycle.

## 2. Data model — the `review` record

Path: `content/records/reviews/<contribution-id>--<reviewer-slug>.yaml`
(the judge's slug is literally `judge`, so at most one machine review per
contribution; humans use their handle-style slug).

Schema `content/schemas/review.schema.json`:

```yaml
contribution_id: heading-aware-chunking        # required, slug pattern, must resolve
reviewer:                                      # required, exactly one of the two forms
  kind: human | llm-judge
  # kind: human     → name, team required (person shape shared with other records)
  # kind: llm-judge → model required (free string, e.g. "claude-fable-5")
verdicts:                                      # required, all three axes
  clarity: strong | adequate | needs-work
  claims_vs_evidence: strong | adequate | needs-work
  reproducibility: strong | adequate | needs-work
statement: >-                                  # required, 20–2000 chars
  One-paragraph overall read, same register as an endorsement statement.
suggestions:                                   # optional, max 5 items, each 10–300 chars
  - "index.md · reconcile the −60% headline with the bundle's −48% · claims must match evidence"
override:                                      # optional — present only when published over a needs-work
  by: { name: ..., team: ... }                 # person shape
  reason: >-                                   # 20–500 chars, rendered verbatim on the page
    Why the author publishes despite the objection.
  date: 2026-07-15
date: 2026-07-15                               # required
```

Validator rules:
- Schema validation (new schema file) + crossref: `contribution_id` resolves to an
  existing contribution directory.
- `reviewer.kind` discriminates the required fields (human → person, llm-judge → model).
- `override` requires at least one `needs-work` verdict in the same record
  (an override with nothing to override is a data error).

Loader: `loadContent(root)` gains `reviews: [{file, data}]` — **additive**, the same
pattern as `adoptions` (CP-C) and `watchlist` (CP-D). Existing keys unchanged.

## 3. Toolkit changes

**`judge` SKILL.md** — unchanged rubric, output shape, and advisory voice. One added
step: after printing the report, write/overwrite
`content/records/reviews/<id>--judge.yaml` with the same verdicts, statement
(the one-line overall), and suggestions, `reviewer: {kind: llm-judge, model: <own model id>}`.
Verdict spelling maps `needs work` → `needs-work` in YAML.

**`publish` SKILL.md** — step 3 becomes the editorial gate:
1. Run `judge` (which now also writes the record). Show the report.
2. All axes ≥ `adequate` → proceed to branch + commit (record included in the `git add`).
3. Any axis `needs-work` → present both paths, contributor chooses:
   - **Revise**: stop; contributor edits; re-run `publish` (judge re-reviews, record
     is overwritten — the published record is always the latest review).
   - **Override**: collect a written reason, append the `override` block to the
     judge's review record, then proceed. Never proceed silently.
4. `git add` grows `content/records/reviews/` alongside the existing paths.

The CI variant stays dormant: `platform.config.json` `judge.ci` remains `false`; no
workflow is added.

## 4. Derive + arena

- `evidence[slug]` gains `reviews: [{reviewer: {kind, name|model, team|null}, verdicts,
  statement, suggestions, override: {by, reason, date}|null, date}]` — additive.
- `cards[]` rows gain `reviewStatus: "none" | "machine" | "human"` — additive.
  `machine` = a judge review exists; `human` = at least one human review exists
  (human supersedes machine in the ladder; `verified` remains the existing
  replications count, already on cards).
- Arena `POINTS.reviewPerformed = 5`; **only `reviewer.kind: human` reviews score**,
  and only on published contributions (same rule as every other event). Reviewing
  your own contribution scores 0. `breakdown` gains `reviewsPerformed` (additive);
  `people.json` profiles gain `reviewsPerformed: [{slug, title, date}]`.
- **Hard constraint:** the pinned arena test (Sofia Marchetti #1) stays green. Seed
  reviews go only to people with enough gap below the leaders; verify empirically
  before merge.

## 5. Site treatment

**Contribution page (`[slug].astro` / `Rail.astro`)** — the big change:
- New **Peer review** section rendering every review record openly: a compact
  three-axis scorecard (verdict words, not colors doing the work), the statement,
  reviewer identity — "Machine referee · <model>" vs. a linked person — and date.
- If `override` is present: a set-off block titled **Published with dissenting
  review**, showing the objecting verdicts and the author's reason verbatim. This is
  the design's signature moment; it must read as honest, not shameful.
- Status ladder near the byline: `Machine-reviewed → Human-reviewed → Verified (n
  replications)`, showing the highest rung reached. Color discipline: review/verified
  markers use `--verified` green (they are evidence); never oxblood.

**Cards (`Card.astro`)** — one restrained chip from `reviewStatus` ("machine-reviewed"
/ "peer-reviewed"); replications stay the dominant evidence signal.

**`/contribute` (consolidated front door — replaces the planned `/review-process` page):**
- Keeps: tier table, template flow.
- Rewrites "The flow" as the two-stage process: validate → referee report → merge
  (or revise / override with reason) → post-publication review.
- Fixes the now-false line "mechanical CI is the only gate" and the stale "From M3…"
  paragraph.
- New closing section **Review for the arena**: what a human review is, how to file
  one (record template), and that reviews earn 5 arena points / replications 12 —
  the recruiting pitch.
- A `review.md` record template is added to `content/templates/` and the templates
  table on the page mentions it.

**Landing page** — one clause only: step 03 "Publish" mentions the referee report.
No structural change.

**Masthead** — already done (Contribute CTA merged, fc4a085). Contract note: nav
remains 4 reading items + search; Contribute is a CTA, not a fifth nav item.

## 6. Seeds (mock data, consistent with existing fixtures)

1. `speculative-decoding-latency--judge.yaml` — clean pass (strong/strong/adequate):
   shows the ordinary machine-reviewed state.
2. `prompt-compression-long-context--judge.yaml` — `claims_vs_evidence: needs-work`
   **with an override** by Priyanka Nair (reason: quality delta measured on the
   team's own bench, external replication invited): demonstrates the dissent block.
3. `heading-aware-chunking--wei.yaml` — human review by Wei (Model Validation, 28
   pts; cross-team, not an author — the contribution is Marcus's, Group Data). +5
   takes Wei to 33, below every current top-5 score, so the pinned ordering is
   undisturbed. Demonstrates human-reviewed status and the arena credit.

## 7. Tests

- Validator: schema accept/reject fixtures (both reviewer kinds, override-without-
  needs-work rejected, dangling `contribution_id` rejected); loader `reviews` key.
- Derive: `evidence.reviews` shape; `reviewStatus` ladder (none/machine/human);
  scoring — human review +5, judge review +0, self-review 0, draft contribution 0;
  breakdown key; Sofia stays #1.
- Site: contribution page renders scorecard + dissent block (fixture-driven);
  `/contribute` copy contains the two-stage flow; existing 145 tests stay green.

## 8. Contracts (recorded at merge, all additive)

New CP-F rows: review record shape (`review.schema.json`), loader `reviews` key,
`evidence[slug].reviews`, `cards[].reviewStatus`, arena input `reviewPerformed 5
(human only, published only, self 0)`, breakdown `reviewsPerformed`, review template
in `content/templates/`. Masthead note amended as in §5.

## Out of scope

Digest section for reviews; human-editor requirement for `research-paper`
(future config key); enabling `judge.ci`; any change to replication/endorsement/
adoption shapes.
