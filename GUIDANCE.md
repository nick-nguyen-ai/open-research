# GUIDANCE — working standard for this repo

Written by Fable (Claude Fable 5), 2026-07-15, for the Opus instance working
this repo on Nick's company laptop. I built and reviewed most of what's here
across M1–M8, the CP-E acceptance test, and the CP-F review process. Nick will
keep both machines in sync through this remote, so assume I may pick work back
up behind you — leave the repo the way you'd want to find it.

This is not a style guide. It's the judgment layer: what I check, when I slow
down, and where this specific repo bites. Read it end to end once before your
first change, then keep it open. Where it conflicts with something Nick says
in-session, Nick wins; where it conflicts with your own defaults, it wins.

---

## 0. Orientation — what this is and where truth lives

OpenResearch is an internal-research-platform prototype: verified AI findings
with evidence trails (replications, endorsements, adoptions, reviews), an
arena that scores contributors, and a Claude Code toolkit that publishes
content *through* the platform's own flows. One architecture rule carries the
whole thing: **all data flows `content/` → validator loader → derive scripts →
`site/src/data/*.json` → pages.** Presentation never reads content directly;
the toolkit never imports from the site.

| What | Where | In your clone? |
|---|---|---|
| Frozen interfaces (CP-A → CP-F) | `CONTRACTS.md` | yes — read before anything else |
| Program history (M2–M8 master plan) | `docs/superpowers/plans/` | yes — history, **not** a to-do list |
| Design specs incl. review process | `docs/superpowers/specs/` | yes |
| Session handoff (open threads, gotchas) | `handoff/` | yes |
| SDD execution ledger | `.superpowers/sdd/progress.md` | **no — gitignored.** Its hard-won lessons are quoted in §3; recreate the ledger fresh on your machine (see §2 step 5) |
| Derived JSON (`arena.json`, `cards.json`, …) | `site/src/data/` | **no — gitignored.** Run `npm run derive` before inspecting any of it |

Commands that must be green before you call anything done:

```
npm run validate          # content validator — the only hard gate
npm test --workspaces     # validator + site + installer suites
npm run site:build        # derive → astro build → pagefind index
node site/scripts/check-links.mjs site/dist
```

The suite was ~150 tests across three workspaces at the CP-F merge. Don't
memorize the number; memorize the rule: *all of them, every time, not just
the ones near your change* — cross-script coupling here is real (derive, the
QA index, and the arena scorer all read the same content).

---

## 1. The rule that outranks everything: features are static, designs are flexible

This is Nick's standing directive and the spine of every decision I made here.

- A **feature contract** is anything another milestone, skill, CI, or external
  consumer depends on: schema shapes, loader return keys, derived-JSON shapes,
  routes, skill CLI surfaces, MCP tool signatures, `platform.config.json`
  keys. Once frozen in `CONTRACTS.md` it never changes shape. You may **add**
  (new optional field, new derived key, new enum value called out explicitly —
  that's how `research-paper` became the fifth tier). You never rename,
  remove, or reinterpret without an explicit human decision recorded in that
  file.
- A **design** is how it looks and reads: token *values* (the token *names*
  are contract), component markup, motion, layout, copy tone. Free to revise
  any time — provided no contract moves underneath.

The tell that you're about to violate this: you're in a schema, a derive
output, a route, or a SKILL.md interface, and your instinct says "this is
cleaner this way." Clean is not the bar. Frozen is. When a change is genuinely
additive, say so *explicitly in the plan*, and append the row to `CONTRACTS.md`
at the gate — every cycle before you did exactly that.

Second-order version of the same rule: **some tests encode contracts on
purpose.** The site suite pins Sofia Marchetti at arena rank #1. Any content
you add (authored, replication, adoption, review records) shifts scores. The
procedure is empirical, not arithmetic: add the content → `npm run derive` →
run the site tests → confirm the pin holds. If your work legitimately needs to
break a pinned test, that's a contract conversation with Nick, not a test
edit.

---

## 2. How work moves through this repo

Don't invent a process; the one below shipped eight milestones with zero
contract regressions. Every step exists because skipping it cost something
once.

1. **`superpowers:brainstorming`** before any creative work. Resolve intent
   and design questions *before* planning, or the plan encodes guesses as
   decisions.
2. **`superpowers:writing-plans`** — one plan per execution cycle, written
   just-in-time **against the real repo**, not the spec's imagined state.
   Exact paths, complete code, TDD ordering. The plans in
   `docs/superpowers/plans/` are the reference for what "plan" means here: a
   competent implementer can execute one without asking a single question.
3. **`superpowers:subagent-driven-development`** — execute task by task, one
   implementer subagent and one *fresh* reviewer subagent per task. This is
   where the quality actually comes from (§3). Do not do the work serially in
   your own context because delegation feels like overhead — a reviewer with
   no memory of writing the code catches what you'd rationalize past.
4. **Whole-branch final review** before merge. It exists to catch composition
   bugs: two tasks each individually correct, jointly contradictory. That
   class of bug appeared in this repo at least twice and only ever surfaced at
   this step.
5. **Ledger as you go.** Keep `.superpowers/sdd/progress.md` (create it —
   it's gitignored scratch, per-machine) updated per task: what was verified,
   what was deferred, why. Reconstructed-from-memory ledgers lie.
6. **Visual/functional gate.** A green suite is not a visual gate. Run
   `npm run site:dev`, click through what you changed, screenshot if the
   change is visual. For toolkit changes, *run the skill/installer for real*.
7. **`CONTRACTS.md` + plan-delta sync, then merge.** Plans drift from
   reality during execution; the deltas section is where the doc stops lying.

Model policy Nick set for cycle work: Sonnet/Opus implementer and reviewer
subagents, top-model QC on the results. On your machine that means Opus
delegating to Opus/Sonnet subagents — the *structure* (separate implementer,
separate fresh reviewer) matters more than the model mix.

---

## 3. The review bar — what it actually means, with receipts

The ledger isn't in your clone, so here is its distilled lesson: **every
Important bug this repo ever caught was invisible in the diff and visible when
you ran the thing.** Real examples, so you know the bar:

- Hero count-up animation ran twice and doubled the number — a second `init()`
  call re-observed elements. Found by re-running the page interaction, not by
  reading the animation code.
- Two tier-label lookups drifted ("Report" vs "Technical report") — found by
  grepping for a *second* definition after the first looked correct.
- A note's date rendered "13 Jul July 2026" — found by rendering a real note
  and reading the output.
- BM25 indexer: a token literally named `"constructor"` collided with
  `Object.prototype` and silently corrupted term frequencies — found by
  adversarial input, not the happy path.
- `publish` re-run: unconditional `git checkout -b` fails the *second* time
  you publish the same id — found by running the flow twice.
- The installer had two Windows-only bugs (`.cmd` shim spawning, manual-path
  fallback) that POSIX-shaped reading would never catch — found by executing
  it on the actual OS.

So the standard is: **execute the path the code claims to handle and watch
what happens.** A build that "should pass" gets run. A fixture that "is
consistent" gets read. A subagent report that says "verified X" is a *claim*
— spend the thirty seconds confirming it before you write "review clean"
anywhere. `superpowers:verification-before-completion` is the codified form
of this; treat it as mandatory before any done/fixed/passing statement.

Findings get triaged into three tiers, and the discipline is in the writing:

- **FIXED (Important)** — behavior-changing. Fix in the same task, record
  what broke and how, and sync the plan doc if it contradicted reality.
- **Minor (deferred)** — real but low blast radius. Record *why* it's safe to
  defer ("untested branch, correct by inspection, no current caller hits it"),
  not just that it is. The reasoning is the artifact; the next reader needs
  your logic, not your confidence.
- **DEVIATION (justified)** — implementation intentionally departs from plan.
  "Zero blast radius" is something you *check* (enumerate call sites), never
  something you assert.

Silently fixing without a ledger line, or skipping the empirical check because
the diff looked clean, is exactly how quality erodes one task at a time until
the whole-branch review finds five things that should have died at task 3.

---

## 4. Calibrating yourself — Opus defaults vs. what this repo needs

We're the same lineage tuned differently. Correct for these deliberately:

- **Ask less on small things, never on frozen things.** You'll want to pause
  on naming, formatting, which of two equivalent approaches. Don't — pick
  one, note it, move on. The questions worth asking are exactly three:
  does it change a `CONTRACTS.md` shape, is it destructive
  (delete/force-push/history rewrite), is the *intent* genuinely ambiguous
  such that guessing wrong wastes real work. Everything else: decide and
  record the decision.
- **Delegate more than feels natural.** The SDD model *is* the quality
  mechanism. Spawn the implementer, spawn the fresh reviewer, parallelize
  independent tasks. Fresh-context verification beats self-critique — that's
  not a preference, it's why the bug list in §3 got caught.
- **Take the whole task spec up front, then run long.** Get the full plan
  written before executing; don't drip-feed yourself scope mid-flight. Well-
  specified up front is where you do your best autonomous work.
- **The ledger is the exception to terseness.** Between tool calls, be quiet.
  In the ledger and in handoffs, be *complete* — one line per task recording
  what was verified and what was deferred is what lets a future session (or
  me) trust your cycle without re-reading it.
- **Report the unflattering parts.** This platform's own pitch is honesty —
  a `partial` replication sits on the landing page unprettified, on purpose
  (do not "fix" it). Hold your status reports to the platform's standard: a
  skipped test, an inspection-only branch, a thing you ran out of budget to
  verify — say it plainly. An omission in a "done" report is worse than the
  gap itself.
- **Don't re-litigate settled decisions.** Feature-vs-design, the skill
  sequence, the scoring weights, the review-process policy — all decided and
  recorded. Check `docs/superpowers/` and `handoff/` before treating a
  question as open. Most of what feels open here was closed once already;
  the record is the point.

---

## 5. Checklist: building a new feature

1. Brainstorm first — separate the genuine design questions from the ones the
   repo's history already answers.
2. Contract audit: list which `CONTRACTS.md` rows the feature touches. Only
   additive changes; name them in the plan.
3. Find the existing pattern and match it. Every shape of work here has one:
   validator rules are pure functions over the loader's output (see
   `content/validator/src/rules/reviews.js` — that's the house style);
   derive scripts fail loud, never fall back silently; record types follow
   schema + loader-key + crossref + template + derive + page, in that order
   (the review record, e7a5893…78118e6, is the freshest end-to-end example);
   skills are SKILL.md instruction docs, not code. A second way to do the
   same thing is precisely how the tier-label drift happened.
4. Plan with exact paths and TDD tasks. "Add tests for X" without naming the
   behaviors and the file is a hope, not a task.
5. Execute with implementer + fresh-reviewer subagents; ledger as you go.
6. Whole-branch review hunting composition bugs specifically.
7. Visual/functional gate — actually run it.
8. `CONTRACTS.md` rows + plan deltas + rebuild-and-recommit
   `site/public/qa-index.json` if contribution content changed, then merge.

## 6. Checklist: revising something that exists

Revision is riskier than greenfield because the blast radius is invisible in
the diff.

1. **Grep for every consumer before changing anything.** Loader keys, derive
   outputs, schema fields all have multiple readers (pages, tests, other
   derive scripts, the toolkit). Correct-for-the-caller-you-checked and
   wrong-for-the-one-you-didn't is the most common failure mode in a mature
   codebase.
2. Design change? Free — but check whether a test quietly encodes the design
   (exact copy assertions, the pinned arena rank, count floors like the
   `>=10` contributions test). Run the affected suites, don't reason about
   them.
3. Contract change? Don't. Add alongside. If it genuinely must change shape,
   that's Nick's call, recorded in `CONTRACTS.md`.
4. Full suite + full build + link check, not the nearby tests.
5. If you touched contribution content: `npm run derive`, verify the arena
   pin, rebuild `qa-index.json`, recommit it. It's LF-normalized, so any diff
   after rebuild means content really changed — investigate, don't shrug.

---

## 7. Conventions in force (load-bearing, not preferences)

- Node ≥ 20, pure ESM, **no TypeScript**, bare `node --test`. CI portability
  depends on the toolchain staying boring.
- Comments are rare and state WHY — a non-obvious invariant in one line —
  never WHAT the next line does. If you're narrating code, delete the comment
  and improve the name.
- Validator rules never re-parse files; they consume the loader's output.
  Derive scripts fail loud on malformed input — never add a "helpful"
  fallback to empty/default; silence is how corrupt data reaches the site.
- Small real diffs. No speculative abstraction for a second caller that
  doesn't exist; three similar lines beat a premature helper. This codebase
  stayed simple across eight milestones because nobody reached for cleverness
  early.
- Commit trailer: this repo's history uses
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. You are not me —
  use your own model identity in the trailer. Accurate attribution beats
  cosmetic consistency.
- Content is fictional-but-plausible on purpose (fake teams, mock benchmarks
  with internally consistent numbers). If you write seed content, keep the
  numbers self-consistent end to end — the judge and the reviewers check
  claims against bundles, and so should you.

---

## 8. Repo-specific traps, already paid for once

- **Derived data is gitignored.** `site/src/data/*.json` won't exist after a
  fresh clone until `npm run derive` (or `site:build`) runs. Anything that
  reads it — including your own inspection — needs the derive first.
- **`site/public/qa-index.json` is committed**, deliberately (consumers get
  it raw). Rebuild + recommit whenever contributions change.
- **The arena pin** (§1). Empirical check, every content change.
- **Stale `.astro` cache** after branch switches produces duplicate-id
  glob-loader warnings that look like a real bug and aren't. Delete
  `site/.astro`, rebuild, *then* chase anything that remains.
- **Windows PowerShell 5.1:** double quotes inside `git commit -m @'…'@`
  here-strings break native arg passing — keep commit messages quote-free or
  use bash for quoting-heavy git commands. Toolkit scripts have known
  Windows/POSIX duality risk: if you touch `toolkit/installer/`, execute it
  on the real OS before calling it done.
- **Digest window anchors to the newest content date**, not today — items can
  be legitimately absent from `/digest`. By design; don't "fix."
- **The `partial` replication** (`heading-aware-chunking--platform-lab`) and
  its landing-page specimen are intentional. The honesty is the pitch.
- **`publish` is config-driven:** `platform.config.json` `repo: null` means
  no-remote mode — the skill prints push/PR commands instead of calling `gh`.
  A real remote now exists (`github.com/nick-nguyen-ai/open-research`), but
  flipping `repo` changes contract-frozen behavior — that's Nick's explicit
  call, not a drive-by config edit.

---

## 9. The harness layer (`.harness/`, Nick, `.claude/skills/`)

Nick plans to grow this layer over time, so know its rules before extending
it. open-harness is a local-first secondary harness on top of Claude Code;
its state lives under `.harness/` (config, workflow registry, episodic
memory, traces), deliberately separate from product files.

- **Nick (`.claude/skills/nick/`) is a thin dispatcher — keep it thin.** It
  reads `.harness/registry/workflows.yaml`, matches the request, retrieves
  the session dashboard, then *delegates* to the owning domain skill or the
  workflow runner. Adding a feature to the harness means: a registry entry
  (id, description, phases, expected artifacts) **plus** a domain skill that
  owns the logic. Logic inlined into Nick's SKILL.md is a defect, even when
  it would be shorter.
- **`needs_agent` from the workflow runner is expected, not an error** — it
  means the workflow is semantic work the deterministic runner can't do, and
  the owning skill carries it instead.
- **Outcomes go through hooks / the `open-harness event` CLI**, not ad-hoc
  notes — the episodic record is only useful if it's complete.
- **The alias is cosmetic.** Renaming "Nick" re-stamps prose in two files;
  directory names and frontmatter `name:` never change.
- Same discipline as the platform applies: registry entry shapes and skill
  CLI surfaces are *contracts* once something depends on them; the prose
  inside a SKILL.md is *design*.

---

## 10. Definition of done

A change is done when — and only when — all of these are true, in this order:

1. The full suite, validator, site build, and link check are green — run,
   not assumed.
2. The changed path was **executed and observed**, not just tested: page
   clicked, skill invoked, installer run, flow re-run for the re-entrancy
   case.
3. The ledger records what was verified and what was consciously deferred,
   with reasoning.
4. `CONTRACTS.md` and the plan's delta section match what actually shipped.
5. Derived artifacts that are committed (`qa-index.json`) are rebuilt and
   staged when content changed.
6. Your summary to Nick states outcomes faithfully — including what you did
   *not* verify.

If you can't check one of those boxes, the task isn't done; say which box and
why. That sentence is worth more than a confident "complete."

Run the thing before you believe it works. Everything else in this file is a
footnote to that.

— Fable
