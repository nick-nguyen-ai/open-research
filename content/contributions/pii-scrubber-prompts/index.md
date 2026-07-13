---
id: pii-scrubber-prompts
title: A two-pass prompt scrubber removes PII before it reaches the model
tier: finding
authors:
  - name: Daniel Okafor
    team: risk-engineering
    division: Risk
category: governance
tags: [pii, safety, prompting]
status: published
created: 2026-07-13
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: []
result: −98% PII leakage
result_detail: 5.2% → 0.1% prompts with residual PII · 3k-prompt audit
---

## Summary

A two-pass scrubber — a regex pre-pass followed by a small-model verification pass — cut prompts carrying residual PII from 5.2% to 0.1% across a 3k-prompt audit. The second pass catches the formats the regex has no pattern for, which is where nearly all the leakage was.

## Context

Upstream systems were assembling prompts that carried customer names and account numbers straight into the model, pulled in from retrieved documents and pasted user context. The single-regex scrubber we started with matched the obvious formats and reported a clean rate, but a manual sample showed it was missing names without honorifics, hyphenated account references, and numbers split across lines — so the low reported leakage was false confidence rather than real coverage.

## Technique

Pass one runs the existing regex set to strip known PII patterns cheaply, which removes the bulk of the volume. Pass two sends the pre-scrubbed prompt to a small model with a narrow instruction: flag any residual identifier the regex would have missed, returning spans to redact. Anything it flags is redacted before the main model call, so the primary request only ever sees scrubbed text.

## Evidence

On a 3k-prompt manual audit, the share of prompts with any residual PII dropped from 5.2% to 0.1%. The verification pass adds a small fixed latency cost per prompt — one extra small-model call ahead of the main request — which was well inside the assistant's response budget. No benchmark id is attached because this was measured directly on the production prompt workflow through manual audit rather than against a shared eval set.

## How to replicate

Follow [bundle/README.md](bundle/README.md) on your own prompt path: add the verification pass and re-audit. Expect residual-PII prompts to drop by an order of magnitude or more.
