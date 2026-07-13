---
id: retrieval-reranker-lite
title: A lite cross-encoder reranker lifts research retrieval without the latency tax
tier: finding
authors:
  - name: Sofia Marchetti
    team: markets-analytics
    division: Markets
category: rag
tags: [retrieval, reranking, latency]
status: published
created: 2026-07-13
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [rerank-eval-set]
result: +8pt ndcg@10
result_detail: 0.61 → 0.69 ndcg@10 · +40ms median · 500-pair eval set
---

## Summary

A small distilled cross-encoder reranking the top-50 BM25 candidates raised ndcg@10 from 0.61 to 0.69 at +40ms median per query. The gain came entirely from reordering passages we already retrieved, so recall and index cost stayed fixed.

## Context

Markets research retrieval was already surfacing the right passages but ranking them poorly — the relevant answer often sat at position 6 or 7 while a lexically similar but less useful passage led. Sending the candidate set through a full LLM reranker fixed the ordering, but at 300–600ms and a per-query token bill it was not viable on the online search path. We wanted the ordering quality without paying LLM latency on every query.

## Technique

Retrieval stays lexical: BM25 returns the top 50 candidates. Those 50 query-passage pairs go through a small distilled cross-encoder (roughly 20M parameters) in a single batched forward pass that scores all pairs at once, and we return the top 10 by score. Batching the whole candidate set into one pass is what keeps the added latency bounded — the cost is one model call per query, not per candidate, and the model is small enough to run on the existing CPU serving box.

## Evidence

On the 500-pair `rerank-eval-set`, ndcg@10 went from 0.61 to 0.69, an 8-point lift, for +40ms median added latency. The gain held across both query slices we track — short factual lookups and longer analyst questions — with no slice regressing, so the improvement is not concentrated in one query shape. Tail latency stayed inside the online budget because the batched pass has a fixed shape regardless of candidate content.

## How to replicate

Run the pipeline in [bundle/README.md](bundle/README.md) against any retrieval set with graded relevance labels. Expect roughly +8pt ndcg@10 for about +40ms of added median latency per query.
