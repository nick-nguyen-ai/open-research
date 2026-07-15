# Handoff — openresearch (main), session 0e6da831, 2026-07-14

Session renamed to "openresearch (main)"; this file supersedes this session's earlier
snapshot (`2026-07-14-platform-complete-0e6da831.md`). The /goal (M1–M8 + CP-E) was
already COMPLETE at that snapshot; everything below is post-goal work, all merged to `main`.

## State

All on `main`, clean tree, nothing in flight, no feature branches. 145 tests green
(validator 59, site 72, installer 14); `npm run validate`, `npm run site:build`,
`node site/scripts/check-links.mjs site/dist` all pass. A leftover preview-style server
serves the current `site/dist` at **http://localhost:4321/** (background process, safe to
kill; `site/package.json` has no `preview` script — restart with `cd site && npx astro preview`).

## Post-goal work merged today (newest first — see git log for diffs)

| merge | what |
|---|---|
| `9f96fd6` | **True landing page** — home is a 7-section editorial narrative (hero + folio/stamp/ink-wipe, The loop 01-03, The culture with live evidence specimen from `evidence.json['heading-aware-chunking']` incl. the `partial`, toolkit terminal card, arena top-3 with animated bars, 3-card Latest verified, closing CTA). Dashboard feeds moved off home — `/browse` is the workspace. All motion rides the existing `.rv` observer; pre-states are `html.js`-guarded; reduced-motion → final states. |
| `7bd2fc0` | **Determinism fix** — `build-index.mjs` normalizes CRLF→LF before chunking; committed `qa-index.json` is now byte-identical regardless of git autocrlf. |
| `e3b3ee4` | **Emphasis design pass** — color roles (oxblood = brand/interactive ONLY; `--verified` green = evidence ONLY; 5 tier hues via `[data-tier]`→`var(--tier)`, spines/eyebrows/band-rules only). Card result promoted to 18px display slot; article h2s → slate; arena leader callout. Spec: `docs/superpowers/specs/2026-07-14-emphasis-design-delta.md`. |
| `74afbff` | **Samples + toolkit gallery** — 2 mock research papers (`speculative-decoding-latency` multi-author + adoption record; `prompt-compression-long-context` closes watchlist `llmlingua-2` as `resulting_contribution`). 14 contributions, 2–3 per tier, every writing/record template exercised. `/toolkit` gained "See it in action" + cards.json-driven sample gallery. |
| `8b58319` | **research-paper tier** — 5th tier, additive to the frozen enum (`CONTRACTS.md` updated); template + validator headings (8 sections) + site treatment (result band, contents list, abstract lede). |

## Facts a fresh agent must not trip over

- **Arena gate**: a site test pins Sofia Marchetti #1 (75). New content authored by low-scorers
  keeps this safe (Priyanka 35 / Tomas 31 / Wei 28); check `arena.json` top-5 before adding
  authored/adoption/replication records.
- `site/public/qa-index.json` is **committed**: rebuild + recommit whenever contributions change
  (now LF-normalized — a diff after rebuild means content actually changed).
- The `partial` replication (`heading-aware-chunking--platform-lab`) and the landing page's
  specimen showing it are **intentional** — the honesty is the pitch. Do not "fix".
- Landing-page animation pattern: pre-animation states must be written as
  `:global(html.js) .thing:not(.on) { … }` so no-JS renders complete. Follow it for new motion.
- Duplicate-id glob-loader WARNs after branch switching = stale cache → `Remove-Item -Recurse -Force site\.astro`.
- PowerShell 5.1: double quotes inside `git commit -m @'…'@` here-strings break native arg
  passing — keep commit messages quote-free.
- Digest window anchors to newest content date (seeds run to 2026-07-21), so items dated
  2026-07-14 don't appear in `/digest` — by design.

## Where the truth lives

| what | path |
|---|---|
| SDD ledger (M1–M8 + CP-E execution record) | `.superpowers/sdd/progress.md` |
| Frozen interfaces (CP-A→CP-D; tier enum note) | `CONTRACTS.md` |
| Design deltas (emphasis system is the newest) | `docs/superpowers/specs/` |
| Plans (master + 4 cycles with delta appendices) | `docs/superpowers/plans/` |
| Project memory (status incl. post-goal additions) | `~/.claude/projects/D--Project-OpenResearch/memory/` |

## Open thread / likely next work

1. **User's visual verdict on the landing page + emphasis pass** — feedback expected on section
   order, specimen pacing, copy, hues. All design-layer (freely changeable); each is a small dial
   in `site/src/pages/index.astro` or `site/src/styles/global.css`.
2. Possible follow-ups the user has raised or approved in spirit: install the toolkit plugin
   locally to try skills live; contribute a real research paper through the publish flow to
   exercise the new tier end-to-end.
3. Phase 3 features (F18 leadership dashboard, F19 collections, F20 bounty board) — new spec
   delta + plan cycle, same machinery.
4. Deferred minors: grep `Minor (deferred)` / `backlog` in the ledger.

## Suggested skills

- `superpowers:brainstorming` → `superpowers:writing-plans` → `superpowers:subagent-driven-development`
  for any Phase-3 cycle (model policy: Sonnet/Opus implementers + reviewers, Fable QC).
- The toolkit's own `publish` / `paper-reader` / `write-replication` skills (in
  `toolkit/plugins/openresearch/skills/`) for contributing content through the platform's flows.
- `/handoff` — update this file at session end.
