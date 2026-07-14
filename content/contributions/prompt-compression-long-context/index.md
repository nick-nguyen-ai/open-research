---
id: prompt-compression-long-context
title: Learned prompt compression holds answer quality to 3x on long-context work
tier: research-paper
authors:
  - name: Priyanka Nair
    team: ib-quant
    division: Institutional
category: prompting
tags: [context, tokens, cost, retrieval]
status: published
created: 2026-07-14
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [policy-rag-bench]
result: 3x compression, −1.2pt quality
result_detail: 71% token cut on 12k-token prompts · −1.2pt on policy-rag-bench · −$0.019/request
related:
  internal: [context-window-budgeting]
  external:
    - https://arxiv.org/abs/2310.05736
    - https://arxiv.org/abs/2403.12968
---

## Abstract

Deal-desk research assistants routinely send 12k-token prompts where most of the
context is boilerplate the model never cites. We evaluated learned prompt
compression (LLMLingua-2 style token classification) against three cheaper
baselines on 1,200 production prompts. At 3x compression the learned compressor
lost 1.2 points on `policy-rag-bench` while truncation lost 9.8 and random token
dropping lost 14.3; per-request cost fell $0.019 at unchanged answer length. At
5x the losses steepen to 4.7 points — the technique has a working range, and this
paper maps where it ends. Compression also cut time-to-first-token 28%, an
unplanned but consistent side effect.

## Introduction

The obvious responses to oversized prompts — truncate, summarise, or pay — are
respectively lossy, slow, and expensive. Learned compression claims a fourth
option: drop the tokens a small classifier predicts the large model won't need.
The claim matters here because our prompt volume is dominated by a few
long-context workflows, so a safe 3x on those is a budget-level saving. This
paper answers whether the published quality-retention numbers survive contact
with our prompts, and at what compression ratio they stop holding.

## Related work

[LLMLingua](https://arxiv.org/abs/2310.05736) and
[LLMLingua-2](https://arxiv.org/abs/2403.12968) report near-lossless 3-5x on
public QA benchmarks; our [watchlist entry](../../watchlist/llmlingua-2.yaml)
for the second is what this paper resolves as `resulting_contribution`.
Internally, [context-window-budgeting](../context-window-budgeting/index.md)
showed most of our long prompts carry never-cited sections — the observation
that made compression look viable — and its section-level accounting is what we
used to stratify the evaluation sample.

## Method

Sample: 1,200 frozen production prompts from two long-context workflows (deal
research, policy lookup), median 12.4k tokens, each with a graded reference
answer. Arms: uncompressed baseline; learned compressor (multilingual BERT-base
token classifier, off the shelf, no fine-tuning); head-tail truncation; random
token dropping — the last two at matched token budgets so every arm pays the
same context bill. Pre-registered metrics: `policy-rag-bench` score, answer
length, per-request cost, and time-to-first-token. Compression ratios swept at
2x, 3x, 5x.

## Results

At 3x: learned compression −1.2pt vs baseline; truncation −9.8pt; random
−14.3pt. At 2x the learned arm is statistically flat (−0.3pt); at 5x it loses
4.7pt and starts clipping numbers inside tables, which graders flagged as the
dominant failure mode. Cost: −$0.019/request at 3x, which at current volume
amortises the compressor's own serving cost in under two days. Time-to-first
token fell 28% at 3x — fewer prefill tokens — which users noticed before anyone
looked at the dashboard. Null result: fine-tuning the classifier on 10k
in-domain examples moved quality by +0.1pt, within noise; the off-the-shelf
checkpoint is enough here.

## Discussion

The working range is the finding: 2-3x is safe on our workloads, 5x is not, and
the failure mode at 5x (numeric cells dropped from tables) is exactly the kind
of silent damage a finance workflow cannot absorb — audit compressed prompts
for table integrity before shipping. Threats to validity: both workflows are
retrieval-heavy, so token redundancy is high; generative-drafting prompts may
compress worse. The compressor adds a 60ms serial hop, negligible against the
prefill saving at our lengths but not at short ones — below ~4k tokens the
economics invert. A quality drop steeper than 2pt at 3x on your sample would
falsify the central claim for your workload.

## Conclusion

Learned prompt compression at 3x is a shippable cost lever for long-context,
retrieval-heavy workflows: 71% fewer context tokens for a ~1-point quality
price and faster first tokens. Follow-ups: a table-aware compressor to push
past 3x without the numeric-cell failure, and testing on generative-drafting
prompts where redundancy is lower.

## How to replicate

The bundle in [bundle/README.md](bundle/README.md) contains the arm
definitions, the ratio sweep, and the grading protocol. Freeze ≥1,000 prompts
with reference answers, run all four arms at matched token budgets, and expect
the learned arm to sit within ~2 points of baseline at 3x while both naive
arms fall off a cliff — if truncation matches learned compression on your
sample, your prompts weren't redundant enough to need any of this.
