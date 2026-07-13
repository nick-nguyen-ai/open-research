# Replication bundle — OpenWiki codebase indexing vs raw exploration

1. Generate a wiki for your repository: [github.com/langchain-ai/openwiki](https://github.com/langchain-ai/openwiki)
   (one generation pass; record its token cost — ours was 9.6M for 210k lines / 214 pages).
2. Fix a task sample before you start: ours was 40 tasks — bug localisation (12),
   small feature implementation (10), code-review questions (10), onboarding (8) —
   each with a reference answer or fix to grade against.
3. Run every task twice with the same model and tool budget: baseline (raw checkout)
   and treatment (wiki available, "consult it first" instruction). Count total tokens
   per task, both arms.
4. Report mean/median per category and overall, plus pass rates.

Recorded run (2026-07-14, per-category means, tokens per task):

| category            | n  | baseline | with wiki | delta |
|---------------------|----|----------|-----------|-------|
| bug localisation    | 12 | 241k     | 69k       | −71%  |
| feature implementation | 10 | 176k  | 74k       | −58%  |
| code-review questions  | 10 | 158k  | 76k       | −52%  |
| onboarding questions   |  8 | 121k  | 75k       | −38%  |
| **overall mean**       | 40 | **182k** | **71k** | **−61%** |

Pass rates: 34/40 baseline · 35/40 treatment. Break-even on generation cost:
9.6M ÷ (182k − 71k) ≈ 87 tasks.

Success for your rerun looks like: a per-task token table for both arms on a fixed,
pre-registered task sample — whatever your delta turns out to be.
