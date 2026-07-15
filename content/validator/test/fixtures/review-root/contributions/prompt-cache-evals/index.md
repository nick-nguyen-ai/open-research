---
id: prompt-cache-evals
title: Prompt caching cut our eval suite cost
tier: finding
authors:
  - name: Nick
    team: Model Validation
category: evals
tags: [caching]
status: published
created: "2026-07-01"
updated: "2026-07-10"
---

## Summary

A shared-prefix cache halved eval spend across the suite with no quality change.

## Context

Context body long enough to satisfy the template minimum length rule for findings.

## Technique

Cache the shared prompt prefix and reuse it across the eval batch.

## Evidence

Cost fell by roughly half over twenty runs.

## How to replicate

See the bundle and re-run against your own suite.
