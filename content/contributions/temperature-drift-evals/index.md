---
id: temperature-drift-evals
title: Temperature-0 still drifts — pinning eval determinism
tier: note
authors:
  - name: Wei
    team: Model Validation
category: evals
tags: [determinism, drift]
status: published
created: 2026-07-11
updated: 2026-07-11
---

Three places nondeterminism sneaks into "deterministic" eval runs, found while
chasing a 0.4pt score wobble across identical nightly runs.

First, temperature 0 does not guarantee byte-identical outputs across provider
infrastructure changes — treat model version pins as part of the eval config.
Second, unordered JSON serialization in the harness changed few-shot example order
between runs; sort keys before hashing prompts. Third, wall-clock timestamps in a
shared system prompt broke prompt-cache hits and shifted sampling; template them out.

Pinning all three held scores byte-stable for 14 consecutive runs. If you measure
drift after that, it is the model, not your harness.
