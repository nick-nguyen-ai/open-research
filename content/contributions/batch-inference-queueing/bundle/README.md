# Replication bundle — batch-inference-queueing

1. Replay a representative traffic window through your current batch endpoint; record p50/p99.
2. Insert a priority queue that buckets by expected token count and admits mixed batches under a latency SLO.
3. Replay again; expect p99 to fall substantially at equal throughput, with eval scores unchanged.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
