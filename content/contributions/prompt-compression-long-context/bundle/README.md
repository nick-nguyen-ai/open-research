# Replication bundle — learned prompt compression on long-context workloads

Protocol (mock-consistent numbers; rerun against your own prompts):

1. **Freeze the sample.** ≥1,000 production prompts from your longest-context
   workflows, each with a graded reference answer (ours: 1,200 prompts,
   median 12.4k tokens, `policy-rag-bench` grading).
2. **Four arms at matched token budgets:**
   - baseline (uncompressed)
   - learned compressor (LLMLingua-2-style token classifier, off the shelf)
   - head-tail truncation to the same budget
   - random token dropping to the same budget
3. **Sweep ratios** 2x / 3x / 5x. Pre-register: benchmark score, answer
   length, $/request, time-to-first-token.
4. **Grade blind** — graders must not know which arm produced an answer.

Recorded run (2026-07-14, quality delta vs baseline on policy-rag-bench):

| ratio | learned | truncation | random |
|---|---|---|---|
| 2x | −0.3pt | −4.1pt | −7.6pt |
| 3x | −1.2pt | −9.8pt | −14.3pt |
| 5x | −4.7pt | −18.2pt | −23.9pt |

Side effects at 3x: −$0.019/request, −28% time-to-first-token, answer length
unchanged. Dominant 5x failure: numeric cells dropped from tables — audit for
table integrity before shipping any ratio above 3x.

Success for your rerun: learned arm within ~2pt of baseline at 3x while both
naive arms degrade several points. If truncation ties the learned arm, your
prompts lack the redundancy this technique needs — also worth publishing.
