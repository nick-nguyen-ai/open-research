# Session transcript — the contributor loop, run for real (2026-07-14)

Captured from the Claude Code session (Fable) that produced this tutorial. Trimmed
only for length; commands and outputs are verbatim.

## 1 · paper-reader on `heading-aware-chunking`

```
$ cat content/contributions/heading-aware-chunking/index.md
$ grep -rl "contribution_id: heading-aware-chunking" content/records/
content/records/adoptions/heading-aware-chunking--payments-platform.yaml
content/records/replications/heading-aware-chunking--payments.yaml
content/records/replications/heading-aware-chunking--risk.yaml
$ ls content/contributions/heading-aware-chunking/bundle/ && cat .../bundle/README.md
```

Reading (as emitted):

```
Heading-aware chunking beats fixed windows on policy documents  —  tutorial · rag

Summary
  Split documents along their heading tree (depth 2, 200-token merge floor,
  800-token cap) instead of fixed windows. On the policy corpus this lifted
  recall@10 from 0.71 to 0.82 with no other retrieval changes.

Claimed result
  +11pt recall@10 — 0.71 → 0.82 recall@10 on the policy corpus. Source: bundle.

Evidence state
  Replications (2 replicated / 2 total):
    - Payments Engineering · replicated · recall@10 +9pt · policy-rag-bench
    - Risk Analytics · replicated · recall@10 +12pt · own workflow
  Endorsements (0): none — but 1 active adoption (payments-platform, doc-search
  reranking path, "recall gain held at production scale").
  Read: independently replicated by 2 teams; adopted by a third.

How to replicate
  Point corpus/ at a policy document set; chunk with depth 2 / merge 200 / cap 800;
  index both chunkings; report recall@10 each. Expect a positive delta at identical
  index size.

Open questions
  - Does the gain survive corpora whose documents are short enough to fit a single
    window? (Spoiler: that is exactly what our run below measured.)
```

## 2 · Implementation + measured run

`chunk-eval.mjs` (this bundle) implements steps 1–3 of the tutorial verbatim and
runs 30 heading-derived queries over the repo's 29 markdown documents:

```
$ node bundle/chunk-eval.mjs
corpus: 29 docs, 30 queries
fixed-800   : chunks=104 recall@10=1.000 (30/30)
heading-aware: chunks=35 recall@10=1.000 (30/30)
delta: 0.0pt recall@10
```

A heading-only ambiguous-query variant produced the same parity. Conclusion: on
short-document corpora each document fits one window, so there is no heading/body
split to repair — the claim's mechanism is real but its gain does not transfer here.
What does transfer: one third the chunks at equal recall.

## 3 · write-replication

Interview → `content/records/replications/heading-aware-chunking--platform-lab.yaml`
(outcome `partial`, metrics recorded, notes explain the non-transfer), then:

```
$ npm run validate
✓ content validation passed (D:\Project\OpenResearch\content)
$ git checkout -b contribute/heading-aware-chunking-replication
$ git add content/records/replications/heading-aware-chunking--platform-lab.yaml
$ git commit -m "replicate(heading-aware-chunking): partial by platform-lab" ...
No git remote configured (platform.config.json repo: null).
Local branch contribute/heading-aware-chunking-replication is committed. To publish once a remote exists:

  git remote add origin <REMOTE_URL>
  git push -u origin contribute/heading-aware-chunking-replication
  gh pr create --fill --base main --head contribute/heading-aware-chunking-replication
```

## 4 · publish (this tutorial)

The `publish` flow for `using-openresearch` itself — validate, judge (advisory),
`contribute/using-openresearch` branch, no-remote fallback — is recorded in the
commit history of this repository; the judge's advisory verdict is reproduced in
the contribution's PR description block in that commit message.
