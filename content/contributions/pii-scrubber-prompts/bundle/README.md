# Replication bundle — pii-scrubber-prompts

1. Sample 1k+ real prompts and label residual PII after your current scrubbing.
2. Add a second pass: a small model flags anything the regex pre-pass missed; redact it.
3. Re-audit; expect residual-PII prompts to drop by an order of magnitude or more.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
