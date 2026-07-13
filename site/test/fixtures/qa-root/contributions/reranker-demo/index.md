---
id: reranker-demo
title: A lite cross-encoder reranker lifts retrieval
tier: finding
authors:
  - name: Demo Author
    team: demo-team
category: rag
tags: [retrieval, reranking]
status: published
created: "2026-07-10"
updated: "2026-07-12"
result: +8pt ndcg@10
result_detail: 0.61 to 0.69 ndcg@10 on the demo eval set
---

## Summary

A distilled cross-encoder reranker lifts research retrieval without the latency tax.

## Technique

Rerank the top fifty candidates with a small cross-encoder scoring model.

## Evidence

Ndcg at ten rose from 0.61 to 0.69 across five hundred query passage pairs.

## How to replicate

Run the bundle against your own graded relevance set.
