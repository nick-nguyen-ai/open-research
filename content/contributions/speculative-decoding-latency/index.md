---
id: speculative-decoding-latency
title: Speculative decoding with a distilled draft model cuts p95 latency 41%
tier: research-paper
authors:
  - name: Tomas Vidal
    team: risk-engineering
    division: Risk
  - name: Wei
    team: Model Validation
category: tooling
tags: [latency, inference, tokens]
status: published
created: 2026-07-14
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
result: −41% p95 latency
result_detail: 3.1s → 1.8s p95 · 78% draft acceptance · quality parity on 3 suites
related:
  internal: [batch-inference-queueing]
  external:
    - https://arxiv.org/abs/2211.17192
    - https://arxiv.org/abs/2302.01318
---

## Abstract

Interactive risk-triage assistants live and die by tail latency, and ours breached
its 3-second p95 budget whenever prompts crossed 6k tokens. We distilled a 1.1B
draft model from our production 34B target and served the pair with speculative
decoding. On a fixed replay of 5,000 production requests, p95 latency fell from
3.1s to 1.8s (−41%) and p50 from 1.4s to 0.9s, with the target model verifying
every token — output distribution is unchanged by construction, and all three
quality suites confirm parity. The draft model accepts 78% of proposed tokens on
our domain; the paper reports where acceptance collapses and when the technique
is not worth the second model's memory.

## Introduction

Latency work on serving stacks usually targets throughput — batching, paging,
quantisation — but an assistant that a human is waiting on needs single-request
latency, where decoding is serial and each token costs a full forward pass. This
paper answers one question: how much wall-clock does speculative decoding recover
on a real internal workload, with a draft model we can actually train and host?
After reading it you should be able to decide whether the technique clears your
own latency budget before committing GPU memory to a second resident model.

## Related work

Speculative sampling ([Leviathan et al.](https://arxiv.org/abs/2211.17192),
[Chen et al.](https://arxiv.org/abs/2302.01318)) proves the target-distribution
guarantee we rely on; we contribute deployment numbers, not theory. Internally,
[batch-inference-queueing](../batch-inference-queueing/index.md) attacked the
same symptom at the scheduler layer — its −35% queue-wait is complementary and
stacks with ours, since it removes waiting before decoding starts and we shorten
decoding itself.

## Method

The draft is a 1.1B decoder distilled for 3 epochs on 2.1B tokens of in-domain
transcripts (teacher: the production 34B, temperature 1.0, forward KL). Serving
uses standard speculative decoding with draft window K=5, rejection sampling
against the target's logits, greedy target verification. Evaluation replays a
frozen sample of 5,000 production requests (median prompt 4.2k tokens) on an
otherwise idle A100 pair; we pre-registered p50/p95 latency, draft acceptance
rate, and score deltas on `internal-eval-suite` plus two in-house suites as the
only metrics before running either arm.

## Results

p95 latency: 3.1s → 1.8s (−41%); p50: 1.4s → 0.9s (−36%). Mean acceptance was
78% overall, but bimodal: 84% on templated risk summaries, 61% on free-form
analyst questions. Quality was parity by construction and measured: eval-suite
deltas were 0.0, +0.2, and −0.1 points (all within run-to-run noise). Acceptance
below ~50% — which we could only induce with out-of-domain prompts — made the
pair slower than the target alone. The null result worth keeping: 4-bit
quantising the draft saved 0.6GB but dropped acceptance 9 points, a net latency
loss; we shipped the fp16 draft.

## Discussion

The guarantee that output distribution is unchanged makes this the rare latency
optimisation needing no quality sign-off, which mattered more for shipping than
the speedup itself. Limits: the draft is only as good as its domain overlap —
our 61% acceptance on free-form questions suggests teams with open-ended
workloads should measure before adopting; the second model costs 2.2GB resident
memory per replica; and distillation is a real project (about one engineer-week
plus 400 A100-hours). What would falsify the headline: a workload where
acceptance sits under 50%, which we predict for code generation against our
chat-tuned draft.

## Conclusion

Speculative decoding turned a budget-breaching assistant into one with headroom,
at the price of hosting a 1.1B draft and one distillation run. Next experiments:
a shared multi-tenant draft for the three risk assistants, and re-measuring
acceptance after each quarterly target-model refresh to learn how fast the pair
drifts apart.

## How to replicate

The bundle in [bundle/README.md](bundle/README.md) has the distillation recipe,
serving parameters, and the replay-harness protocol. Expect a successful
replication to show p95 dropping by at least a quarter at acceptance ≥70% on
your own frozen request sample — and treat acceptance under 50% as the technique
telling you your draft is out of domain, not as a failed replication.
