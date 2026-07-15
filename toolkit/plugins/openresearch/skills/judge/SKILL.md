---
name: judge
description: Advisory, never-blocking review of an OpenResearch draft against three axes — Clarity, Claims-vs-evidence, and Reproducibility. Use before publishing, or when asked to "judge" / "review" a contribution. Outputs per-axis verdicts, at most five concrete suggestions, and a one-line overall. It never gates or fails anything.
---

# judge — advisory review of a contribution

You are giving a busy colleague a fast, honest read of a draft. This review is
**advisory and never blocking**: the contributor may publish regardless of what
you find. Say so if they ask.

## Inputs

- A contribution id `<id>`. Its draft lives at `content/contributions/<id>/index.md`.
- Its evidence records (optional): `content/records/replications/*.yaml` and
  `content/records/endorsements/*.yaml` whose `contribution_id` equals `<id>`.
- Its bundle (optional): `content/contributions/<id>/bundle/`.

## Procedure

1. Locate the files. Run exactly:
   - `ls content/contributions/<id>/` — confirm `index.md` (and any `bundle/`).
   - `cat content/contributions/<id>/index.md`
   - `grep -rl "contribution_id: <id>" content/records/` then `cat` each match.
2. Read the draft and every record end to end before writing anything.
3. Score each axis `strong` / `adequate` / `needs work`, with one sentence of why:
   - **Clarity** — would a busy engineer follow this and know what to do? Is the
     title the result, not the topic? Are the required sections actually filled?
   - **Claims vs. evidence** — is every *quantitative* claim in the prose backed by
     the bundle, a benchmark, or a record? Flag any number with no source. A claim
     with zero replications is not wrong — but say the evidence is self-reported.
   - **Reproducibility** — could another team run the bundle as-is and reach the
     stated result? Is the benchmark/workflow named? Are steps copy-pasteable?
4. Write **at most five** concrete, actionable suggestions (file · what · why).
   Fewer is better. Do not pad to five.
5. End with a one-line overall verdict.
6. **Write the referee report as a record.** Create or overwrite
   `content/records/reviews/<id>--judge.yaml` with exactly what you printed:

   ```yaml
   contribution_id: <id>
   reviewer:
     kind: llm-judge
     model: <your model id, e.g. claude-fable-5>
   verdicts:
     clarity: <strong|adequate|needs-work>          # "needs work" spells needs-work in YAML
     claims_vs_evidence: <strong|adequate|needs-work>
     reproducibility: <strong|adequate|needs-work>
   statement: <the one-line overall verdict>
   suggestions:                                      # omit the key if you had none
     - "<file · concrete change · why>"
   date: <today, YYYY-MM-DD>
   ```

   This record publishes openly on the contribution's page (open peer review).
   It is still not a gate — `publish` reads it and applies the editorial policy.
   Never write the `override:` block yourself; only `publish` adds it, on the
   contributor's explicit decision.

## Output format (print exactly this shape)

```
judge · <id>  (advisory — never blocking)

Clarity            <strong|adequate|needs work> — <one sentence>
Claims vs evidence <strong|adequate|needs work> — <one sentence>
Reproducibility    <strong|adequate|needs work> — <one sentence>

Suggestions (<=5):
1. <file · concrete change · why>
2. ...

Overall: <one line>. This is advisory; you may publish as-is.
```

## Rules

- The review record file is the **only** file you write. Never edit the draft or
  any other file. Never run the validator here (that is `publish`'s job).
- Never say "rejected", "blocked", or "must fix" — you have no authority to gate.
- If a record exists but contradicts a claim, name the record file and the delta.
- Be specific. "Tighten the Summary" is useless; "Summary claims −60% but the
  bundle shows −48% on 20 runs — reconcile the headline" is the bar.

## CI variant (written, disabled)

There is a planned CI variant that runs this same rubric on a pull request and
posts the verdict as a **label + comment only** — it never fails the check. It is
gated behind `platform.config.json` `judge.ci`. That value is `false` this cycle,
so no CI job runs judge; the skill is session-driven only. When `judge.ci` becomes
`true` (a later cycle), the CI job comments this exact output shape and adds a
`judge:<overall>` label. Do not add a CI workflow while `judge.ci` is `false`.
