---
id: openwiki-repo-indexing
title: Indexing the codebase with OpenWiki cuts agent token spend by 61%
tier: technical-report
authors:
  - name: Fable
    team: platform-lab
category: agents
tags: [indexing, tokens, codebase, agents]
status: published
created: 2026-07-14
updated: 2026-07-14
replication_bundle: bundle/
result: −61% agent tokens per task
result_detail: 182k → 71k mean tokens · 40 tasks, 4 categories · answer quality unchanged
---

## Abstract

We measured what a generated codebase wiki does to coding-agent token budgets. Forty
agent tasks over a 210k-line internal repository ran twice: once with the agent
exploring the raw tree (grep, directory listings, file reads), and once with an
[OpenWiki](https://github.com/langchain-ai/openwiki)-generated wiki available as the
agent's first stop. Mean tokens per task fell from 182k to 71k (−61%) with task
success unchanged (34/40 vs 35/40). The saving concentrates in exploration turns:
the wiki answers "where does X live and what calls it" in one read instead of a
grep-and-read chain.

## Background

Agents spend most of their context discovering structure, not editing code. On our
baseline traces, 68% of tokens went to exploration — directory listings, wrong-file
reads, and re-derivations of module relationships that never change between tasks.
That structural knowledge is exactly what a codebase wiki captures once: OpenWiki
generates per-module pages (purpose, key symbols, call relationships, entry points)
from the repository itself, so the marginal cost of the N-th agent learning the
architecture drops to a page read.

## Method

We sampled 40 tasks across four categories — bug localisation (12), small feature
implementation (10), code-review questions (10), and onboarding questions (8) — on a
210k-line TypeScript/Python repository. Baseline runs gave the agent the raw checkout
and standard tools; treatment runs added the OpenWiki output (214 pages, generated
once, 41 minutes, 9.6M tokens amortised across all future tasks) with an instruction
to consult it before touching the tree. Both arms used the same model, same tool
budget, and the same graders: a task passed if its output matched the reference fix
or answer rubric.

## Results

Mean tokens per task: 182k → 71k (−61%). Median: 154k → 58k. The heaviest category,
bug localisation, fell 71% (241k → 69k) because the wiki collapses the
find-the-owning-module phase; onboarding questions fell least (−38%) since their
answers still require reading real code. Success rates were statistically
indistinguishable (34/40 baseline, 35/40 treatment). Wall-clock per task dropped 44%,
tracking the removed exploration turns. Per-category means and the grading protocol
are in the bundle.

## Discussion

The saving is a property of the task mix: repositories whose agents mostly edit
well-known files will see far less than 61%, and the wiki generation cost (9.6M
tokens) only amortises after roughly 87 agent tasks on our numbers. Staleness is the
operational risk — a wiki regenerated weekly was stale for 3 of 40 tasks touching
code merged that day, and the agent correctly fell back to the raw tree in each.
Treat the wiki as a cache with the repository as truth, regenerate on a schedule
tied to merge velocity, and the economics hold.

## How to replicate

Generate a wiki for your repository with [OpenWiki](https://github.com/langchain-ai/openwiki),
then run a fixed task sample through your agent with and without it, counting tokens
per task. The bundle in [bundle/README.md](bundle/README.md) contains the task
categories, grading rubric, and the per-task token table; expect the saving to scale
with how exploration-heavy your task mix is.
