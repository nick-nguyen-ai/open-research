# paper-reader — walkthrough scenario (the skill's test)

Follow SKILL.md literally and confirm the five-section output plus the M7 next-actions.

## Scenario

Target: `heading-aware-chunking` (a tutorial with a bundle and two `replicated`
replications from different teams — Payments and Risk).

## Steps

1. `cat content/contributions/heading-aware-chunking/index.md`
2. `grep -rl "contribution_id: heading-aware-chunking" content/records/`
   Expect two replication files (`--payments.yaml`, `--risk.yaml`).
3. `cat` each; `ls content/contributions/heading-aware-chunking/bundle/` and
   `cat` its `README.md`.
4. Emit the exact five-section block.

## Expected observable result

- **Claimed result** reads "+11pt recall@10 — 0.71 → 0.82 on the policy corpus".
- **Evidence state** shows `Replications (2 replicated / 2 total)` from two distinct
  teams, one via `policy-rag-bench`, one via "own workflow".
- **Read** line notes independent replication by two teams.
- Ends with the two M7 next-action offers and the bundle path.
- No files changed.

Paste the full session transcript below the line.

---

## Transcript

```
$ cat content/contributions/heading-aware-chunking/index.md
---
id: heading-aware-chunking
title: Heading-aware chunking beats fixed windows on policy documents
tier: tutorial
authors:
  - name: Marcus
    team: Group Data
category: rag
tags: [chunking, retrieval]
status: published
created: 2026-07-05
updated: 2026-07-09
replication_bundle: bundle/
benchmarks: [policy-rag-bench]
result: +11pt recall@10
result_detail: 0.71 → 0.82 recall@10 on the policy corpus
---

## You'll need

A markdown or HTML policy corpus, Node 20+, and about 30 minutes. Familiarity with
basic retrieval evaluation (recall@k) helps but is not required.

## You'll build

A structure-aware chunker that splits documents along their heading tree instead of
fixed token windows, plus a small recall@10 comparison against your current chunking.

## Steps

1. Parse each document's headings into a tree — markdown structure is your chunk
   boundary map.
2. Split at heading depth 2; merge leaves under 200 tokens into their parent so no
   chunk is a fragment.
3. Cap chunks at 800 tokens; when a section exceeds the cap, split at paragraph
   boundaries and repeat the heading path as context.
4. Re-index and run your retrieval eval. On our policy corpus recall@10 rose from
   0.71 to 0.82 with no other changes.

## Wrap-up

You now have a chunker that respects how policy documents are actually written.
Follow the bundle in [bundle/README.md](bundle/README.md) to reproduce the comparison
on your own corpus, and submit a replication record with your measured delta.
```

```
$ grep -rl "contribution_id: heading-aware-chunking" content/records/
content/records/replications/heading-aware-chunking--payments.yaml
content/records/replications/heading-aware-chunking--risk.yaml
```

```
$ cat content/records/replications/heading-aware-chunking--payments.yaml
contribution_id: heading-aware-chunking
replicator:
  name: Ada
  team: Payments Engineering
benchmark_id: policy-rag-bench
method: Re-ran the bundle's comparison against our payments policy corpus.
outcome: replicated
measured_delta: recall@10 +9pt
date: 2026-07-10
```

```
$ cat content/records/replications/heading-aware-chunking--risk.yaml
contribution_id: heading-aware-chunking
replicator:
  name: Rui
  team: Risk Analytics
workflow: Risk policy retrieval workflow over 4k documents with in-house eval set.
method: Applied depth-2 chunking to our own retrieval workflow and compared recall.
outcome: replicated
measured_delta: recall@10 +12pt
date: 2026-07-12
```

```
$ grep -rl "contribution_id: heading-aware-chunking" content/records/endorsements/
(no matches — zero endorsements)
```

```
$ ls content/contributions/heading-aware-chunking/bundle/
README.md
```

```
$ cat content/contributions/heading-aware-chunking/bundle/README.md
# Replication bundle — heading-aware chunking

1. Point `corpus/` at any internal policy document set (markdown or HTML).
2. Run the chunker with depth 2, merge floor 200 tokens, cap 800 tokens.
3. Index both chunkings and run your retrieval eval; report recall@10 for each.

Success looks like a positive recall delta at identical index size.
```

### Reading produced

heading-aware-chunking  —  tutorial · rag

Summary
  Marcus (Group Data) built a structure-aware chunker that splits policy documents
  along their heading tree instead of fixed token windows, merging small leaves and
  capping large sections. Re-indexing with this chunking and re-running retrieval
  eval raised recall@10 measurably on the policy corpus.

Claimed result
  +11pt recall@10 — 0.71 → 0.82 recall@10 on the policy corpus. Source: prose (bundle: bundle/).

Evidence state
  Replications (2 replicated / 2 total):
    - Payments Engineering · replicated · recall@10 +9pt · policy-rag-bench
    - Risk Analytics · replicated · recall@10 +12pt · own workflow
  Endorsements (0):
    - none
  Read: independently replicated by 2 teams, both positive (+9pt and +12pt), bracketing the
        author's own +11pt measurement.

How to replicate
  1. Point corpus/ at any internal policy document set (markdown or HTML).
  2. Run the chunker with depth 2, merge floor 200 tokens, cap 800 tokens.
  3. Index both chunkings and run your retrieval eval; report recall@10 for each.
  Expected delta: a positive recall@10 gain at identical index size (author measured +11pt;
  replications measured +9pt and +12pt).

Open questions
  - The draft doesn't say how heading-depth choice (2) was tuned, or whether it holds for
    corpora with deeper or shallower heading trees.
  - No data on documents lacking clear heading structure (e.g. scanned PDFs, unstructured text).

Want to **try this** against your own workflow? The `try-this-paper` skill runs the bundle
for you — **coming in M7**.
Ran it already? The `write-replication` skill turns your run into a record — **coming in M7**.
Or open the bundle yourself: `content/contributions/heading-aware-chunking/bundle/`.
```

### Post-check

```
$ git status --porcelain
```
No `content/` paths appear in the output — the walkthrough only read files
under `content/`; it never wrote or edited any of them.
