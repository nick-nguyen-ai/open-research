---
id: batch-inference-queueing
title: A priority queue in front of batch inference cut tail latency by half
tier: technical-report
authors:
  - name: Hana Kim
    team: payments-platform
    division: Payments
category: tooling
tags: [inference, latency, queueing]
status: published
created: 2026-07-12
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
result: −52% p99 latency
result_detail: 8.9s → 4.3s p99 · same throughput · 24h replay
---

## Abstract

A small priority queue with size-aware batching in front of our batch inference
endpoint halved p99 latency at equal throughput over a 24-hour production replay.
The queue buckets requests by expected token count and assembles mixed batches under
a latency SLO, so a handful of large jobs can no longer stall the interactive tail.
Throughput and output quality were unchanged, verified against the internal eval suite.

## Background

Our batch endpoint filled batches first-come-first-served: whatever arrived next got
packed until the batch was full or a fixed timer fired. Because generation time scales
with sequence length, a few long jobs landing together would monopolize a batch and
head-of-line-block the short interactive requests queued behind them. The result was a
p99 dominated not by load but by unlucky ordering.

## Method

We inserted a priority queue ahead of the endpoint that buckets each request by its
expected token count — short, medium, and long — and admits a mixed batch drawn across
buckets, capped so no single batch's projected completion exceeds a latency SLO. A short
fill-time cap bounds how long a partially full batch waits before dispatch, trading a
little padding efficiency for predictability. We validated the change by replaying 24
hours of captured production traffic through both the old and new paths.

## Results

p99 latency fell from 8.9s to 4.3s (−52%) across the replay, while throughput held flat
within measurement noise — the same batches are formed, just composed more evenly. p50
was essentially unchanged, confirming the win is concentrated in the tail rather than a
uniform speedup. The internal eval suite showed no quality movement, as expected: the
queue reorders and groups requests but never alters their contents.

## Discussion

The technique pays off precisely when request sizes are heterogeneous, which is where
FIFO batching does its worst head-of-line blocking. On a uniform-size workload there is
nothing to reorder, so the queue adds a thin layer of overhead for no tail-latency
benefit and is not worth deploying.

## How to replicate

Follow [bundle/README.md](bundle/README.md): replay a representative traffic window
before and after inserting the size-aware queue. Expect p99 to fall substantially —
roughly a halving on mixed-size workloads — at flat throughput and unchanged eval scores.
