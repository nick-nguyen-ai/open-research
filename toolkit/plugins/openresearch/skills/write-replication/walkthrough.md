# write-replication — walkthrough scenario (the skill's test)

Follow SKILL.md literally and produce a REAL, schema-valid record. Git discipline is
explicit: the record is committed on the active cycle branch as seed evidence (Task 5,
Step 3 of the Cycle-4 plan) — never on `main`, and the `contribute/*` branch flow is
shown as printed commands, not executed.

## Scenario (no-remote mode)

`platform.config.json` has `repo: null`. Record a cross-team replication of
`context-window-budgeting` (a note by Priyanka Nair · ib-quant · Institutional) by
`risk-engineering`, replicated against the team's own agent-context workflow.

## Steps (exact)

1. Interview → the fields below (measured on the replicating team's own workflow).
2. Emit `content/records/replications/context-window-budgeting--risk-engineering.yaml`
   with exactly this content:

   ```yaml
   contribution_id: context-window-budgeting
   replicator:
     name: Daniel Okafor
     team: risk-engineering
     division: Risk
   workflow: risk research agent with a fixed 32k context budget across tool results and retrieved chunks
   method: Adopted named context line-items with hard per-item caps and re-ran the agent over our 60-task eval, comparing task completion before and after.
   outcome: replicated
   measured_delta: task completion +7pt, context overflows -80%
   date: 2026-07-14
   ```

3. `npm run validate` → expect `✓ content validation passed`.
4. Show the no-remote branch/PR commands from SKILL.md as PRINTED text (do not execute a
   `contribute/*` branch during seeding).

## Expected observable result

- The record validates (crossref resolves `context-window-budgeting`; `workflow` satisfies
  the `benchmark_id | workflow` requirement).
- The printed no-remote block names `contribute/context-window-budgeting-replication` and
  the three later commands; `gh` is never invoked.
- The seed record is committed on the cycle branch (Task 5, Step 3), never on `main`.

Paste the full session transcript below the line.

---

## Session transcript (real run, Cycle-4 Task 5)

**Interview**

- `contribution_id`: `context-window-budgeting` — resolves to the published note by
  Priyanka Nair · ib-quant · Institutional.
- `replicator`: Daniel Okafor, team `risk-engineering`, division `Risk`.
- `workflow`: "risk research agent with a fixed 32k context budget across tool results
  and retrieved chunks" (no registered `benchmark_id` fit this internal workflow, so
  `workflow` is used — satisfies the `benchmark_id | workflow` requirement).
- `method`: "Adopted named context line-items with hard per-item caps and re-ran the
  agent over our 60-task eval, comparing task completion before and after." (73 chars,
  clears the 20-char floor.)
- `outcome`: `replicated`.
- `measured_delta`: "task completion +7pt, context overflows -80%".
- `date`: `2026-07-14`.

**Emit**

Wrote `content/records/replications/context-window-budgeting--risk-engineering.yaml`
with exactly the content in Step 2 above.

**Validate**

```
$ npm run validate
✓ content validation passed
```

**Branch + PR — shown, not executed**

Per the git-discipline decision for this seed (Task 5 of the Cycle-4 plan), the record
is committed directly on the active cycle branch (`c4-qa-platform`) as seed evidence —
the `contribute/*` branch below is what a real external contributor would run, and is
never created during seeding:

```
git checkout -b contribute/context-window-budgeting-replication
git add content/records/replications/context-window-budgeting--risk-engineering.yaml
git commit -m "replicate(context-window-budgeting): replicated by risk-engineering" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

`platform.config.json.repo` is `null` (no-remote mode), so the PR step prints instead
of calling `gh`:

```
No git remote configured (platform.config.json repo: null).
Local branch contribute/context-window-budgeting-replication is committed. To publish once a remote exists:

  git remote add origin <REMOTE_URL>
  git push -u origin contribute/context-window-budgeting-replication
  gh pr create --fill --base main --head contribute/context-window-budgeting-replication
```

`gh` was never invoked; no `contribute/*` branch was created. `git branch --show-current`
remained `c4-qa-platform` throughout.
