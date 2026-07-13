# Replication bundle — using OpenResearch end to end

This bundle contains the real artifacts behind the tutorial: the chunker/eval script
and the session transcripts of each platform flow.

1. `node bundle/chunk-eval.mjs` (from the repo root's contribution directory, or any
   checkout — paths resolve relative to the bundle). It builds both chunkings of the
   repo's own markdown corpus and reports recall@10 for each via the platform's BM25
   engine. The recorded run (2026-07-14) measured: fixed-800 → 1.000 recall@10 in
   104 chunks; heading-aware → 1.000 in 35 chunks; delta +0pt, index −66%.
   The corpus is the live repo, so chunk counts drift upward as contributions land.
2. `loop-transcript.md` — the paper-reader read, the write-replication interview
   summary and validator output, and the publish flow's no-remote fallback, captured
   verbatim from the session that produced this tutorial.
3. The resulting record: `content/records/replications/heading-aware-chunking--platform-lab.yaml`
   (outcome `partial` — see the tutorial's step 3 for why that is the honest call).

Success for your own rerun looks like: a measured recall@10 for both chunkings on
your corpus, whatever the delta, submitted as a replication record that passes
`npm run validate`.
