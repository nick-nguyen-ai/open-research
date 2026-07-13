---
name: paper-reader
description: Structured reading of one OpenResearch contribution and its evidence, straight from content/ (not the built site). Use when asked to "read", "explain", or "walk me through" a contribution. Outputs Summary, Claimed result, Evidence state (replications/endorsements with deltas), How to replicate, and Open questions, then offers next actions.
---

# paper-reader — read one contribution in context

Give a colleague a faithful, skimmable read of a single contribution and the state
of its evidence. Work from the source files, not the website.

## Inputs

- A contribution id `<id>`.
- Files: `content/contributions/<id>/index.md`, its `bundle/` if present, and every
  record in `content/records/{replications,endorsements}/` whose `contribution_id`
  is `<id>`.

## Procedure

1. Load the files. Run exactly:
   - `cat content/contributions/<id>/index.md`
   - `grep -rl "contribution_id: <id>" content/records/` then `cat` each match.
   - If `content/contributions/<id>/bundle/` exists: `ls` it and `cat` its `README.md`.
2. Read all of it before writing.
3. Emit the sections below. For **Evidence state**, list each replication as
   `team · outcome · measured_delta · (benchmark|own workflow)` and each endorsement
   as `type · by · one-line statement`. Compute the honest picture: how many
   replications with `outcome: replicated`, from how many distinct teams, and whether
   any are `partial`/`failed`.

## Output format

```
<title>  —  <tier> · <category>

Summary
  <2–3 sentences: what they did and the measured effect>

Claimed result
  <result> — <result_detail if present>. Source: <bundle | benchmark id | prose>.

Evidence state
  Replications (<n> replicated / <m> total):
    - <team> · <outcome> · <measured_delta> · <benchmark|own workflow>
  Endorsements (<k>):
    - <type> · <by> · "<short statement>"
  Read: <one honest line — e.g. "independently replicated by 2 teams" or
         "self-reported; one partial replication">.

How to replicate
  <the bundle's procedure in 2–4 steps, and the expected delta>

Open questions
  - <what the draft does not answer / where it might not transfer>
```

## Next actions (offer, do not perform)

End by offering:
- "Want to **try this** against your own workflow? The `try-this-paper` skill runs
  the bundle for you — **coming in M7**."
- "Ran it already? The `write-replication` skill turns your run into a record —
  **coming in M7**."
- "Or open the bundle yourself: `content/contributions/<id>/bundle/`."

## Rules

- Read from `content/`, never from `site/dist/` or a URL.
- Do not invent evidence. If there are zero records, say "no replications yet".
- Do not edit files.
