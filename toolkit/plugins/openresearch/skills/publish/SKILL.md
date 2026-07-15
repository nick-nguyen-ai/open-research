---
name: publish
description: Guide an OpenResearch contribution from draft to pull request. Use when asked to "publish", "submit", or "open a PR for" a contribution. Scaffolds from the tier templates if needed, runs the real validator (blocking), applies the editorial soft gate over judge's referee report (revise or override-with-reason on a needs-work), then branches contribute/<id>, commits, and either opens a PR with gh or — in no-remote mode — prints the exact push/PR commands.
---

# publish — draft to pull request

Take a contribution from wherever it is to a reviewable branch. The validator is the
only hard gate. You are the **editor**: `judge` referees and writes its report;
you apply the soft gate — a `needs work` pauses the flow for revision or an
explicit, recorded override. The contributor can always publish; dissent goes on
the record, never in the void. If there is no git remote, you still produce the
local branch + commit and print the exact commands a human runs later.

## Inputs

- A contribution id `<id>` (kebab-case; equals the directory name).
- `platform.config.json` at the repo root — read `host` and `repo`.

## Procedure

1. **Locate or scaffold the draft.**
   - `ls content/contributions/<id>/ 2>/dev/null` — if `index.md` exists, use it.
   - Else offer the tier templates and scaffold:
     `mkdir -p content/contributions/<id>` then copy the chosen tier, e.g.
     `cp content/templates/finding.md content/contributions/<id>/index.md`
     (tiers: `finding`, `technical-report`, `research-paper`, `tutorial`, `note`). Fill `id`, `title`,
     `authors`, dates; set `status: published` when ready.
2. **Validate (blocking).** Run exactly: `npm run validate`
   - On failure, the validator prints `path  [rule]  message` lines. Present each as
     **file · field · fix** and STOP. Do not branch or commit a failing draft.
   - On success it prints `✓ content validation passed`.
3. **Referee report + editorial soft gate.** Run the `judge` skill on `<id>` inline
   (it prints the report AND writes `content/records/reviews/<id>--judge.yaml`).
   Show its output, then apply the policy:
   - **Every axis `strong` or `adequate`** → accepted; continue to step 4.
   - **Any axis `needs work`** → revisions requested. Present the two paths and let
     the contributor choose — never proceed silently and never refuse outright:
     1. **Revise:** stop here; the contributor edits the draft and re-runs `publish`
        (judge re-reviews and overwrites its record — the published report is
        always the latest review).
     2. **Override:** ask for a written reason (one paragraph, 20–500 chars). Append
        to the judge's review record:
        ```yaml
        override:
          by:
            name: <contributor name>
            team: <contributor team>
          reason: >-
            <their reason, verbatim>
          date: <today, YYYY-MM-DD>
        ```
        Tell them plainly: the dissenting review and this reason will render
        together on the published page. Then continue to step 4.
   - Re-run `npm run validate` after any record write; it must still pass.
4. **Branch + commit.** Run:
   - `git checkout -b contribute/<id>` — if git reports the branch already exists
     (`fatal: a branch named 'contribute/<id>' already exists`), run
     `git checkout contribute/<id>` instead.
   - `git add content/contributions/<id>/ content/records/ content/benchmarks/`
     (`content/records/` includes the judge's review record and any override)
   - First run: `git commit -m "contribute(<id>): <title>" -m "Co-Authored-By: <author> <email>"`
   - Re-run (the branch already had this contribution's commit): amend it rather
     than creating a second one — `git commit --amend --no-edit` (drop `--no-edit`
     if the title changed).
5. **Open the PR — config-driven.**
   - **If `platform.config.json.repo` is set** (remote mode): run
     `gh pr create --fill --base main --head contribute/<id>`
     (host follows `gh`'s auth for `platform.config.json.host`).
   - **If `repo` is `null`** (no-remote mode — this machine): do NOT call `gh`.
     Print, verbatim, the exact commands for later:
     ```
     No git remote configured (platform.config.json repo: null).
     Local branch contribute/<id> is committed. To publish once a remote exists:

       git remote add origin <REMOTE_URL>
       git push -u origin contribute/<id>
       gh pr create --fill --base main --head contribute/<id>
     ```

## Rules

- The validator is authoritative and **blocks**. `judge` **never** blocks — the
  soft gate is yours (the editor's), and the contributor can always override it
  with a recorded reason. Never add an `override:` block without their explicit
  words; never proceed past a `needs work` without their choice.
- Never invent a remote or run `git push`/`gh` in no-remote mode — print instead.
- Never commit on `main`; always the `contribute/<id>` branch.
- Use the commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  when you (the assistant) author the commit on the contributor's behalf.
- Re-running is safe: if the branch exists, `git checkout contribute/<id>` and amend.
