---
id: prompt-cache-evals
title: Prompt caching cut our eval suite cost by 60%
tier: finding
authors:
  - name: Nick
    team: Model Validation
category: evals
tags: [caching, cost]
status: published
created: 2026-07-13
updated: 2026-07-13
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
---

## Summary

Enabling prompt caching on shared eval prefixes cut cost 60% with identical scores.

## Context

Our nightly eval suite re-sends the same 4k-token system prompt for every case.

## Technique

Mark the shared prefix as cacheable; keep per-case content after the cache breakpoint.

## Evidence

Cost per run dropped from $18.40 to $7.30 across 30 nightly runs. Scores unchanged.

## How to replicate

Follow [the bundle](bundle/README.md) against any suite with a shared prefix over 1k tokens.
