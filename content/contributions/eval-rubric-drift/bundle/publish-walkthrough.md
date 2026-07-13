# publish — dogfood transcript (no-remote path)

Contribution: `eval-rubric-drift`. Executed the `publish` skill's non-interactive,
no-remote path (validate -> branch -> commit -> printed fallback). Proof for CP-B that
the flow works end to end on a machine with no git remote.

## Scope

The publish skill's step 3 (judge, advisory) is a session-interactive step and is
deliberately outside this non-interactive transcript; the judge flow is exercised
separately in `toolkit/plugins/openresearch/skills/judge/walkthrough.md`.

## Transcript

```text
$ npm run validate

> validate
> node content/validator/bin/validate.js

✓ content validation passed (D:\Project\OpenResearch\content)

$ git checkout -b contribute/eval-rubric-drift
Switched to a new branch 'contribute/eval-rubric-drift'

$ git add content/contributions/context-window-budgeting/ content/contributions/eval-rubric-drift/ content/records/endorsements/eval-rubric-drift--institutional.yaml site/scripts/check-links.mjs
warning: in the working copy of 'content/contributions/context-window-budgeting/index.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'content/contributions/eval-rubric-drift/index.md', LF will be replaced by CRLF the next time Git touches it
warning: in the working copy of 'content/records/endorsements/eval-rubric-drift--institutional.yaml', LF will be replaced by CRLF the next time Git touches it

$ git commit -m "contribute(eval-rubric-drift): pin and diff your LLM-judge rubric" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
[contribute/eval-rubric-drift 7b75e4b] contribute(eval-rubric-drift): pin and diff your LLM-judge rubric
 4 files changed, 72 insertions(+)
 create mode 100644 content/contributions/context-window-budgeting/index.md
 create mode 100644 content/contributions/eval-rubric-drift/index.md
 create mode 100644 content/records/endorsements/eval-rubric-drift--institutional.yaml

$ git branch --show-current
contribute/eval-rubric-drift
No git remote configured (platform.config.json repo: null).
Local branch contribute/eval-rubric-drift is committed. To publish once a remote exists:
  git remote add origin <REMOTE_URL>
  git push -u origin contribute/eval-rubric-drift
  gh pr create --fill --base main --head contribute/eval-rubric-drift
```

## Result

- Validator exited 0 (blocking gate passed).
- Local branch `contribute/eval-rubric-drift` created with one commit.
- No push/PR attempted (repo is null); exact later-commands printed above.
