# judge — walkthrough scenario (the skill's test)

Follow SKILL.md **literally** against a known-good, fully-evidenced contribution
and confirm the output shape. Commit the transcript.

## Scenario

Target: `prompt-cache-evals` (a published finding with a bundle, one replication,
and one adoption endorsement).

## Steps

1. `ls content/contributions/prompt-cache-evals/`
   Expect: `index.md` and `bundle/`.
2. `cat content/contributions/prompt-cache-evals/index.md`
3. `grep -rl "contribution_id: prompt-cache-evals" content/records/`
   Expect: one replication (`--payments.yaml`) and one endorsement (`--cards.yaml`).
4. `cat` each matched record.
5. Produce the review in the exact output block from SKILL.md.

## Expected observable result

- Three axis lines, each `strong`/`adequate`/`needs work` + one sentence.
- `Claims vs evidence` notes that the headline "−60% cost" is self-reported in the
  finding while the Payments replication measured "−55%" — a reconcilable delta,
  not a contradiction.
- `Reproducibility` is `strong` (bundle names the procedure and expected delta).
- At most five suggestions; a one-line overall ending "advisory; you may publish as-is".
- **No files changed** (`git status --porcelain` empty afterwards).

Paste the full session transcript below the line when running this walkthrough.

---

## Transcript

```
$ ls content/contributions/prompt-cache-evals/
bundle
index.md
```

```
$ cat content/contributions/prompt-cache-evals/index.md
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
result: −60% cost per run
result_detail: $18.40 → $7.30 · 30 nightly runs · scores unchanged
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
```

```
$ grep -rl "contribution_id: prompt-cache-evals" content/records/
content/records/endorsements/prompt-cache-evals--cards.yaml
content/records/replications/prompt-cache-evals--payments.yaml
```

```
$ cat content/records/replications/prompt-cache-evals--payments.yaml
contribution_id: prompt-cache-evals
replicator:
  name: Ada
  team: Payments Engineering
benchmark_id: internal-eval-suite
method: Re-ran the bundle against our payments eval set with cache enabled.
outcome: replicated
measured_delta: eval cost -55%, latency unchanged
date: 2026-07-20
```

```
$ cat content/records/endorsements/prompt-cache-evals--cards.yaml
contribution_id: prompt-cache-evals
type: adoption
by:
  name: Grace
  team: Cards
statement: Adopted in our nightly eval pipeline; savings match the reported numbers.
pipeline: cards-nightly-evals
date: 2026-07-21
```

```
$ cat content/contributions/prompt-cache-evals/bundle/README.md
# Replication bundle — prompt-cache-evals

1. Pick an eval suite whose system prompt exceeds 1k tokens.
2. Run it twice: once as-is, once with the shared prefix marked cacheable.
3. Record cost per run and score deltas; expect cost to drop by roughly half with scores unchanged.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

### Review produced

judge · prompt-cache-evals  (advisory — never blocking)

Clarity            strong — Title states the result ("cut our eval suite cost by 60%"), not just the topic, and every required section (Summary, Context, Technique, Evidence, How to replicate) is filled with concrete detail.
Claims vs evidence adequate — The headline "−60% cost" ($18.40 → $7.30) is self-reported in the finding; the Payments replication (`prompt-cache-evals--payments.yaml`) measured −55% on the internal-eval-suite — a reconcilable delta, not a contradiction, but the finding doesn't mention it.
Reproducibility    strong — The bundle names the benchmark (internal-eval-suite) and the exact technique (mark the shared prefix cacheable, keep per-case content after the breakpoint); `How to replicate` points straight at `bundle/README.md` with a clear applicability condition (shared prefix over 1k tokens).

Suggestions (<=5):
1. index.md · Evidence section · Add a line citing the Payments replication ("Ada/Payments Engineering measured −55% on internal-eval-suite") so the headline −60% reads as one data point among several, not the only one.
2. index.md · Evidence section · Note the Cards adoption endorsement (savings match reported numbers) to strengthen claims-vs-evidence with independent confirmation.
3. index.md · result_detail · Consider widening the reported range (e.g. "−55% to −60% across two teams") instead of a single self-reported number, now that a second measurement exists.

Overall: Strong, reproducible write-up with self-reported headline evidence that a one-line cross-reference to the Payments replication would fully ground. This is advisory; you may publish as-is.

### Post-check

```
$ git status --porcelain
```
No `content/` paths appear in the output — the walkthrough only read files
under `content/`; it never wrote or edited any of them.

