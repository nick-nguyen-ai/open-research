# Replication bundle — prompt-cache-evals

1. Pick an eval suite whose system prompt exceeds 1k tokens.
2. Run it twice: once as-is, once with the shared prefix marked cacheable.
3. Record cost per run and score deltas; expect cost to drop by roughly half with scores unchanged.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
