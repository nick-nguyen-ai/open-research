---
name: write-replication
description: Turn a replication run into a submitted replication record. Use when asked to "record", "submit", or "write up" a replication of a contribution. Interviews for the measured numbers, emits a schema-valid YAML record into content/records/replications/, runs the real validator (blocking), then hands off to a publish-style branch flow (contribute/<id>-replication) — or the no-remote fallback. Never fabricates numbers.
---

# write-replication — a run becomes a record

Convert a real replication run into a `content/records/replications/<id>--<team>.yaml`
record that the frozen validator accepts, then get it onto a branch for review. The
validator is the only gate.

## Inputs

- The contribution id `<id>` you replicated (must be a published contribution).
- Your measured numbers: baseline, treatment, the metric, sample size, outcome.
- `platform.config.json` at the repo root — read `host` and `repo`.

## Procedure

1. **Interview** for the record fields (do not invent — ask):
   - `contribution_id`: `<id>` (must resolve to a published contribution).
   - `replicator`: your `name` + `team` (+ optional `division`, `email`).
   - Either `benchmark_id` (a registered benchmark) **or** a `workflow` string (≥10 chars)
     describing what you ran it against — exactly one is required.
   - `method`: how you replicated (≥20 chars).
   - `outcome`: `replicated` | `partial` | `failed`.
   - `measured_delta`: a short human string, e.g. `recall@10 +9pt`.
   - Optional `metrics: [{name, baseline, treatment}]`, `artifacts`, `notes`.
   - `date`: today (YYYY-MM-DD).
2. **Emit** the YAML to `content/records/replications/<id>--<your-team-slug>.yaml`.
3. **Validate (blocking).** Run exactly: `npm run validate`
   - On failure, present each `path  [rule]  message` line as **file · field · fix** and STOP.
     Do not branch a failing record.
   - On success it prints `✓ content validation passed`.
4. **Branch + commit — config-driven.**
   - `git checkout -b contribute/<id>-replication`
   - `git add content/records/replications/<id>--<your-team-slug>.yaml`
   - `git commit -m "replicate(<id>): <outcome> by <team>" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`
5. **Open the PR — config-driven.**
   - **If `platform.config.json.repo` is set** (remote mode):
     `gh pr create --fill --base main --head contribute/<id>-replication`
   - **If `repo` is `null`** (no-remote mode — this machine): do NOT call `gh`. Print, verbatim:
     ```
     No git remote configured (platform.config.json repo: null).
     Local branch contribute/<id>-replication is committed. To publish once a remote exists:

       git remote add origin <REMOTE_URL>
       git push -u origin contribute/<id>-replication
       gh pr create --fill --base main --head contribute/<id>-replication
     ```

## Rules

- **Never fabricate numbers.** Every field comes from the user's real run or is asked for.
- The validator is authoritative and **blocks**. Fix the record; never bypass it.
- Never commit on `main`; always the `contribute/<id>-replication` branch (remote mode) —
  or, when seeding demo evidence in this repo, directly on the active cycle branch, never `main`.
- Never invent a remote or run `git push`/`gh` in no-remote mode — print the commands instead.
- One record per file; name it `<id>--<team-slug>.yaml`.
