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
