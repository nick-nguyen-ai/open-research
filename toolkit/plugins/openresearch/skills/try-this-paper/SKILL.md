---
name: try-this-paper
description: Run one OpenResearch contribution's replication bundle against the user's OWN workflow and capture the measured delta. Use when asked to "try", "run", or "apply" a contribution to my setup. Reads the contribution and its bundle, guides the user through executing it on their data, records the real before/after numbers, and offers to hand off to write-replication. Never fabricates measurements.
---

# try-this-paper — run a contribution on your own workflow

Take a published contribution and help the user actually run it against their own
pipeline, then capture what changed. The whole value is a **real, measured** number —
never invent one, never estimate when you could measure.

## Inputs

- A contribution id `<id>`. Draft: `content/contributions/<id>/index.md`; bundle (if any):
  `content/contributions/<id>/bundle/`.
- The user's own workflow, data, or eval set (they supply or point at it).

## Procedure

1. **Summarize first.** Run the `paper-reader` skill on `<id>` inline so the user sees
   the claimed result, the evidence state, and the replication steps before running anything.
2. **Locate the bundle.** Run exactly:
   - `ls content/contributions/<id>/bundle/` — if absent, say the contribution ships no
     bundle and fall back to the "How to replicate" section of `index.md`.
   - `cat content/contributions/<id>/bundle/README.md` (when present) for the procedure.
3. **Establish the baseline.** Ask the user for their current setup and the metric that
   matters (the same metric the contribution reports, or the closest they have). Measure
   or have them measure the **baseline** number first. Write it down verbatim.
4. **Apply the technique.** Walk the bundle's steps against the user's workflow, adapting
   paths/models to their environment. Change one thing — the technique under test — not five.
5. **Measure the treatment.** Re-run the same metric. Record the **treatment** number.
6. **Report the delta honestly.** State baseline → treatment, the metric, the sample size,
   and whether it matches, beats, or misses the contribution's claimed result. If it missed,
   say so plainly — a negative or partial result is still worth recording.

## Output format (print exactly this shape)

```
try-this-paper · <id>

Claimed result   <result from the contribution>
Your setup       <one line: pipeline / data / metric>
Baseline         <metric> = <value>  (n = <sample size>)
Treatment        <metric> = <value>  (n = <sample size>)
Measured delta   <value change>  →  <replicated | partial | failed vs the claim>

Notes: <caveats — where it transferred, where it did not>
```

## Next action (offer, do not perform)

End by offering the handoff:
- "Want this to count? The `write-replication` skill turns these numbers into a
  schema-valid replication record and opens the PR. Say the word and I'll run it."

## Rules

- **Never fabricate a measurement.** If the user cannot run it now, capture the plan and
  stop — do not print invented numbers.
- Read from `content/`, never from the built site or a URL.
- Do not edit files or write records here — that is `write-replication`'s job.
- Adapt the bundle to the user's environment, but change only the technique under test so
  the delta is attributable.
