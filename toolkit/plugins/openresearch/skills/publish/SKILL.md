---
name: publish
description: Guide an OpenResearch contribution from draft to pull request. Use when asked to "publish", "submit", or "open a PR for" a contribution. Scaffolds from the tier templates if needed, runs the real validator (blocking), runs judge (advisory), then branches contribute/<id>, commits, and either opens a PR with gh or — in no-remote mode — prints the exact push/PR commands.
---

# publish — draft to pull request

Take a contribution from wherever it is to a reviewable branch. The validator is the
only gate. `judge` is advisory. If there is no git remote, you still produce the
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
     (tiers: `finding`, `technical-report`, `tutorial`, `note`). Fill `id`, `title`,
     `authors`, dates; set `status: published` when ready.
2. **Validate (blocking).** Run exactly: `npm run validate`
   - On failure, the validator prints `path  [rule]  message` lines. Present each as
     **file · field · fix** and STOP. Do not branch or commit a failing draft.
   - On success it prints `✓ content validation passed`.
3. **Judge (advisory).** Run the `judge` skill on `<id>` inline. Show its output.
   The contributor may proceed regardless — never block on judge.
4. **Branch + commit.** Run exactly:
   - `git checkout -b contribute/<id>`
   - `git add content/contributions/<id>/ content/records/ content/benchmarks/`
   - `git commit -m "contribute(<id>): <title>" -m "Co-Authored-By: <author> <email>"`
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

- The validator is authoritative and **blocks**. `judge` **never** blocks.
- Never invent a remote or run `git push`/`gh` in no-remote mode — print instead.
- Never commit on `main`; always the `contribute/<id>` branch.
- Use the commit trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
  when you (the assistant) author the commit on the contributor's behalf.
- Re-running is safe: if the branch exists, `git checkout contribute/<id>` and amend.
