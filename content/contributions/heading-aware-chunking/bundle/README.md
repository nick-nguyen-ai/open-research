# Replication bundle — heading-aware chunking

1. Point `corpus/` at any internal policy document set (markdown or HTML).
2. Run the chunker with depth 2, merge floor 200 tokens, cap 800 tokens.
3. Index both chunkings and run your retrieval eval; report recall@10 for each.

Success looks like a positive recall delta at identical index size.
