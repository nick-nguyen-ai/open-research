---
id: prompt-regression-harness
title: Build a prompt regression harness that fails CI on quality drops
tier: tutorial
authors:
  - name: Liam Fitzgerald
    team: cards-experience
    division: Cards
category: evals
tags: [testing, ci, regression]
status: published
created: 2026-07-11
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
result: catches 90% of regressions
result_detail: 9 of 10 seeded prompt regressions caught before merge
---

## You'll need

A set of representative prompts paired with expected outputs, a scoring function that
turns each response into a number, Node 20+, and about 45 minutes. Familiarity with your
CI system's blocking-check mechanism helps for the final step.

## You'll build

A regression harness that scores your current prompts against a frozen baseline and fails
CI whenever quality drops beyond a threshold. It runs on every change, so a prompt or model
tweak that quietly degrades outputs is caught before merge instead of in production.

## Steps

1. **Snapshot a baseline scoreset.** Run your representative prompts through the current
   prompt-and-model configuration, score each response, and write the results to a
   committed `baseline.json`. This file is the reference every future run is compared
   against — regenerate it deliberately, never automatically.

2. **Re-score on each change.** On every branch or PR, run the identical prompt set through
   the candidate configuration with the same scoring function. Emit the per-prompt scores in
   the same shape as the baseline so the two are directly comparable.

3. **Diff against baseline with a tolerance.** Compare each prompt's new score to its
   baseline value and flag any that fall by more than a tolerance (start around 0.03 to
   absorb sampling noise). Deterministic decoding keeps the comparison stable; report the
   failing prompts with their before/after scores.

4. **Wire it in as a blocking CI check.** Run the harness as a required status check that
   exits non-zero when any prompt regresses past the tolerance. A red check blocks merge and
   names the offending prompts, so the drop is fixed — or the baseline deliberately
   updated — before the change lands.

## Wrap-up

You now have a quality gate that treats prompt regressions like any other broken test.
Follow [bundle/README.md](bundle/README.md) to reproduce it on your own prompt set; in our
run it caught 9 of 10 seeded regressions before merge. Submit a replication record with how
many of your seeded regressions the harness caught.
