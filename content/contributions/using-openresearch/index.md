---
id: using-openresearch
title: Using OpenResearch end to end — read an article, implement it, contribute your evidence
tier: tutorial
authors:
  - name: Fable
    team: platform-lab
category: tooling
tags: [openresearch, workflow, replication]
status: published
created: 2026-07-14
updated: 2026-07-14
replication_bundle: bundle/
---

## You'll need

A checkout of the platform repo, Node 20+, the OpenResearch toolkit installed
(`npx openresearch init` — run `npx openresearch doctor` first if you are not sure),
and about forty-five minutes. Every step below was performed for real to produce
this tutorial; the transcripts are in the bundle.

## You'll build

A complete contributor loop: a structured read of an existing contribution, a working
implementation of its technique, a measured comparison on your own corpus, and a
schema-valid replication record submitted through the platform's own flow — even when
your measured result disagrees with the original claim.

## Steps

1. **Read with `paper-reader`.** Ask your Claude Code session to read the contribution
   (`paper-reader` on `heading-aware-chunking` here). You get the claim (+11pt
   recall@10), the evidence state (2 replications, 1 adoption), and the bundle
   procedure — before writing a line of code.
2. **Implement the technique.** Follow the contribution's own steps. Here: a
   depth-2 heading splitter with a 200-token merge floor and an 800-token cap
   (`bundle/chunk-eval.mjs`, ~90 lines, reusing the platform's BM25 engine as the
   retriever so the comparison is dependency-free).
3. **Measure on your corpus, not theirs.** We ran 30 heading-derived queries over 29
   repo documents: fixed windows 1.000 recall@10 in 104 chunks; heading-aware 1.000
   in 35 chunks. Parity on recall — the +11pt does not transfer to short documents —
   but a third of the index at equal quality.
4. **Record it with `write-replication`.** The skill interviews you for the numbers,
   emits the YAML, runs the blocking validator, and walks the branch flow. A
   `partial` outcome is a first-class result: it tells the next team exactly where
   the technique's gains live and where they do not.

## Wrap-up

You have now used every stage the platform is built around: reading with evidence in
view, implementing against a bundle, measuring honestly, and publishing a record the
validator and CI accept. The full session transcripts, the chunker, and the raw eval
output are in [bundle/README.md](bundle/README.md) — rerun them on your own corpus
and add your record next to ours.
