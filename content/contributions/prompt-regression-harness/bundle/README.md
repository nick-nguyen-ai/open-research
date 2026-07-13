# Replication bundle — prompt-regression-harness

1. Freeze a baseline scoreset for a representative prompt set.
2. On each change, re-score the same prompts and diff against the baseline with a tolerance.
3. Seed 10 known regressions and confirm the harness catches most of them before merge.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
