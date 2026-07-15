# publish — walkthrough scenario (the skill's test)

This walkthrough is executed for real against a seed in Task 10 (the dogfood), which
captures its transcript into that seed's `bundle/publish-walkthrough.md`. Here we
record the non-interactive, no-remote path the skill takes.

## Scenario (no-remote mode)

`platform.config.json` has `repo: null`, so publish must use the fallback: validate →
branch → commit → **print** push/PR commands (never call gh).

## Steps (exact)

1. `npm run validate` → expect `✓ content validation passed`.
2. Run `judge` on the target `<id>` inline — it prints the referee report and writes
   `content/records/reviews/<id>--judge.yaml`. Apply the editorial soft gate: all axes
   ≥ adequate → continue; any `needs work` → contributor chooses revise or
   override-with-reason (the override is appended to the record). Re-run
   `npm run validate` if a record was written.
3. `git checkout -b contribute/<id>`
4. `git add content/contributions/<id>/ content/records/ content/benchmarks/`
5. `git commit -m "contribute(<id>): <title>" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"`
6. Because `repo` is null, print the fallback block from SKILL.md — do not push.

## Expected observable result

- Validator exits 0.
- A local branch `contribute/<id>` exists with exactly one new commit.
- The fallback block is printed with the three later-commands; `gh` is never invoked.
- `git branch --show-current` returns `contribute/<id>` during the run.

Paste the full session transcript below the line (Task 10 stores the real one).

---
