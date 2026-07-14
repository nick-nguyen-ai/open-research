# Replication bundle — speculative decoding p95 latency

Protocol (mock-consistent numbers; rerun against your own stack):

1. **Distil a draft.** Teacher = your production model, student ≈ 1/30th its
   parameters, forward-KL on ≥1B tokens of in-domain transcripts (ours: 1.1B
   student, 34B teacher, 2.1B tokens, 3 epochs, ~400 A100-hours).
2. **Freeze a request sample.** Replay-capture ≥5,000 production requests
   before measuring anything; ours had median prompt 4.2k tokens.
3. **Pre-register metrics.** p50/p95 wall-clock, draft acceptance rate, and
   your quality suites — declared before running either arm.
4. **Run both arms** on identical, otherwise idle hardware: target-only
   baseline vs speculative pair (our serving params: draft window K=5,
   rejection sampling, fp16 draft — do not quantise the draft first, see
   Results: 4-bit cost 9 acceptance points and was net slower).
5. **Report** per-arm p50/p95, acceptance overall and per request family, and
   quality deltas.

Recorded run (2026-07-14):

| metric | target only | speculative pair |
|---|---|---|
| p50 | 1.4s | 0.9s (−36%) |
| p95 | 3.1s | 1.8s (−41%) |
| acceptance (templated / free-form) | — | 84% / 61% |
| eval-suite deltas | — | 0.0 · +0.2 · −0.1 pts |

Success for your rerun: p95 down ≥25% at acceptance ≥70% on a frozen sample.
Acceptance <50% means your draft is out of domain — a finding, not a failure.
