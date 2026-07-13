---
id: structured-output-kyc
title: Structured output ends regex post-processing in KYC extraction
tier: technical-report
authors:
  - name: Priya
    team: Financial Crime
category: prompting
tags: [structured-output, extraction]
status: published
created: 2026-07-03
updated: 2026-07-11
replication_bundle: bundle/
result: −83% parse failures
result_detail: 4.1% → 0.7% failure rate over 12k documents
---

## Abstract

Schema-constrained generation removed the brittlest stage of our KYC entity
extraction pipeline. This report covers the migration from free-text prompts with
regex post-processing to structured output, its failure modes, and the measured result.

## Background

The KYC pipeline extracts entities from onboarding documents. The legacy design
prompted for free text and recovered fields with 40+ regexes; every model or prompt
change shifted output phrasing and broke recovery in new ways.

## Method

We replaced the free-text stage with a JSON-schema-constrained generation call,
validated model output against the schema, and routed schema violations to a retry
with the validator error in context. We ran both pipelines in parallel on 12k
production documents for two weeks.

## Results

Parse failures fell from 4.1% to 0.7% of documents (−83%). Field-level precision
was unchanged; recall improved slightly on multi-value fields. Latency rose 6%,
within budget.

## Discussion

The retry-with-error loop accounts for most of the residual failures it recovers;
truncated documents remain the dominant unrecoverable case. Regex maintenance cost
went to zero, which is the real win for the on-call rotation.

## How to replicate

Follow [bundle/README.md](bundle/README.md): it contains the schema, the retry
policy, and a parallel-run harness that reports failure-rate deltas on your corpus.
