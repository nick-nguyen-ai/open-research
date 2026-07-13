# Replication bundle — retrieval-reranker-lite

1. Take any retrieval set with graded relevance labels (or use `rerank-eval-set`).
2. Retrieve the top 50 candidates lexically, then rerank with a small cross-encoder
   in one batched pass and keep the top 10.
3. Measure ndcg@10 before/after and the added median latency; expect roughly
   +8pt ndcg@10 for about +40ms per query.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
