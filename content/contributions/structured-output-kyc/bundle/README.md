# Replication bundle — structured output for extraction

1. Take any extraction task currently using free text + regex recovery.
2. Constrain generation with the JSON schema in this bundle; validate outputs.
3. On violation, retry once with the validation error prepended to the prompt.
4. Run legacy and constrained pipelines in parallel; report the parse-failure delta.
