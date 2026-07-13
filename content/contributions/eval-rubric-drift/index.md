---
id: eval-rubric-drift
title: Your LLM-judge rubric drifts — pin it and diff it every run
tier: note
authors:
  - name: Tomas Vidal
    team: risk-engineering
    division: Risk
category: evals
tags: [llm-judge, drift, evals]
status: published
created: 2026-07-13
updated: 2026-07-14
---

An LLM judge has an effective rubric that is the sum of its prompt and its model
weights — and both of those move underneath you. Swap the judge model for a newer
snapshot, or tweak a single "be strict about citations" line in the judge prompt, and the
scores shift for the whole suite. Nothing about the system under test changed, but your
dashboard says it got better or worse, and someone will act on that number.

The fix is to treat the judge as a versioned dependency, not a constant. Pin the exact
judge model (including the provider's snapshot date, not just the family name) and pin the
rubric text, then check both into the same place as your eval harness. Now a score
movement is attributable: either the system changed or the judge did, and you can tell
which.

Cheapest insurance is a diff. Store the rubric as a file and print a diff of it against
the previous run's copy at the top of every eval report; if the diff is non-empty, the
run's scores are not comparable to the last one until you say so. We caught a silent
half-point swing this way that we had already started blaming on a prompt change — it was
the judge snapshot rolling forward.
