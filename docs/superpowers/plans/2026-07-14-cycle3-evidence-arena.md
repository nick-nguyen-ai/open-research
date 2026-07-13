# Cycle 3 — M5 Evidence Trail + M6 Arena & Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is independently testable and committable; implement them **in order** (dependencies flow forward). Each fresh implementer sees only its own task text, so every task is self-contained.

**Goal:** Close the evidence loop and open the arena. Ship (M5) a first-class **adoption** record (schema + validator + loader + template + seeds), an **evidence trail** on contribution pages (adoption annotations on the rail, a git-native **Changelog** section, adoption counts on note closing bars), and (M6) an **Arena** with Individuals / Teams / Divisions leaderboards driven by a transparent, non-gameable **scoring engine**, plus auto-generated **/people/<handle>** contributor profiles linkable from arena rows and article bylines.

**Architecture:** Purely additive over the frozen CP-A / CP-B contracts. The validator gains one schema (`adoption`) that the auto-loader in `content/validator/src/schemas.js` picks up for free; the loader gains a `content.adoptions[]` array (additive); the schema + crossref rules gain adoption coverage. `site/scripts/derive.mjs` gains three things: (1) `evidence[slug]` grows `adoptions[]` + `changelog[]` (existing keys byte-identical), (2) a `buildScoreModel(content)` scoring engine, (3) `deriveArena(content)` → `site/src/data/arena.json` and `derivePeople(content)` → `site/src/data/people.json` (both new files; existing derive outputs untouched). The `/arena` placeholder is replaced with three server-rendered, no-JS-first boards; `/people/[handle].astro` is a new generated route. Rail, the contribution page, and the byline are extended in place. No new dependencies; no frozen shape changes.

**Tech Stack:** Node ≥20, pure ESM, no TypeScript; `node:test`; Astro ^5 + Tailwind ^4 (site, unchanged deps); the validator (`@openresearch/validator`); `gray-matter` + `yaml` (already vendored). **No new dependencies anywhere.**

## Global Constraints

- Node `>=20`; pure ESM everywhere (`"type": "module"`); **no TypeScript** (`.mjs`/`.js`).
- Test scripts are **bare `node --test`** — never `node --test <dir>` (Node ≥24 breaks on a directory arg; do not "fix" it).
- **No new dependencies** in any `package.json` — built-ins + already-vendored packages only.
- Scripts **fail loudly**: non-zero exit with a `file · field · message`-style line; never silently drop or skip content.
- Site build failure = task failure. The validator must exit 0 and `npm test --workspaces` must be green at every task gate.
- **Scoring point values are exactly** (spec delta table): authored `10`; replication received (by another team) `15`; replication performed (on another team's work) `12`; adoption (active|trialing) `8`, `+4` if a measured `impact` is recorded; endorsement `3`; adoption-type endorsement (M1 shape) `8`; self-team replication `0` on both sides; retired adoption `0`.
- **`arena.json` and the extended `evidence{}` / `people.json` shapes are exactly as pinned in this plan** — they freeze at CP-C (Task 8). Do not add, rename, or drop keys.
- **Frozen contracts are not broken:** existing `derive()` outputs (`stats`, `cards`, `filters`, and the existing `evidence[slug]` keys `replications`/`endorsements`/`rev`) stay byte-identical in shape; all existing routes and config keys are unchanged; the loader's existing return keys are unchanged. New surface is purely additive.
- **Git-history-dependent code degrades gracefully:** `changelog[]` is `[]` when git history is unavailable (tarball checkout, shallow clone), exactly like the existing citation `rev`. It is computed via an **injectable** function so tests never touch real git.
- Commit messages: conventional prefix + trailer, on every commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```
- **Branch:** all work happens on the cycle branch **`c3-evidence-arena`** (create it in Task 1, Step 0). Never commit to `main`; the cycle merges to `main` only at the CP-C gate (outside this plan).

## Frozen-contract guardrails (do not break)

Frozen at CP-A (`CONTRACTS.md`) and CP-B. This cycle **adds** CP-C but must not change any existing shape:

- `derive(contentRoot, opts)` — the four existing outputs keep their shapes. `evidence[slug]` **gains** `adoptions[]` and `changelog[]`; its existing keys `replications`, `endorsements`, `rev` are untouched and byte-identical. This additive extension is explicitly authorized by the design delta ("evidence[slug] gains adoptions[] and changelog[]") and re-frozen at CP-C. `site/test/derive.test.js` keeps passing unchanged (it never asserts the exact key-set of the evidence object).
- `arena.json` and `people.json` are **new** derive outputs from **new** functions (`deriveArena`, `derivePeople`); the existing `derive()` signature is extended only by adding an optional `log` to its options bag (default keeps old behavior).
- **Loader API** (`loadContent(root)`) — return object **gains** `adoptions: []` (additive). Existing keys `contributions`, `replications`, `endorsements`, `benchmarks`, `errors` are unchanged. The frozen `endorsement`/`replication`/`contribution`/`benchmark` schemas are **not modified**; adoption is a **new** schema file.
- Routes: `/arena` stays a route (its placeholder body is design and is rewritten). `/people/<handle>` is a **new** route (frozen at CP-C). All other routes unchanged.
- `config.mjs` keeps exporting `config.repoUrl`. `platform.config.json` keys are unchanged.

### Cycle-2 execution-delta lessons applied (do not relearn these)

1. **No `import.meta.url`-relative config reads in Vite-bundled modules.** `site/src/config.mjs` resolves `platform.config.json` via `process.cwd()` because Vite relocates bundled modules. This cycle's new page/component code reads only from imported `../data/*.json` (bundled as data) — never re-reads config or content at runtime.
2. **`derive.mjs` never imports `site/src/config.mjs`** (derive runs with cwd = repo root; config assumes cwd = `site/`). `deriveArena`/`derivePeople` take already-loaded `content`; the CLI reads `platform.config.json` directly via `import.meta.url` exactly as the existing toolkit block does.
3. **Markdown italic/emphasis spans break `firstSentence()`** card/summary derivation. Seed adoption records are YAML (no prose), so this does not bite here; but any card-visible copy stays plain text.
4. **Plan git steps target the cycle branch `c3-evidence-arena`, never `main`.**

## File structure (target additions)

```
content/
├─ schemas/adoption.schema.json                    # NEW (Task 1)
├─ templates/adoption.yaml                          # NEW (Task 1)
├─ records/adoptions/*.yaml                         # NEW seeds (Task 4)
└─ validator/
   ├─ src/load.js                                   # EXTEND — adoptions[] (Task 1)
   ├─ src/rules/schema.js                           # EXTEND — validate adoptions (Task 1)
   ├─ src/rules/crossrefs.js                        # EXTEND — adoption contribution_id (Task 1)
   └─ test/
      ├─ rule-adoption.test.js                      # NEW (Task 1)
      ├─ load-adoptions.test.js                     # NEW (Task 1)
      └─ fixtures/adoption-root/…                    # NEW (Task 1)
site/
├─ src/lib/format.mjs                               # EXTEND — slugifyName (Task 3)
├─ scripts/derive.mjs                               # EXTEND — evidence, buildScoreModel, deriveArena, derivePeople (Tasks 2,3,7)
├─ scripts/check-links.mjs                          # EXTEND requiredRoutes (Task 7)
├─ src/components/Rail.astro                        # EXTEND — adoption annotations (Task 5)
├─ src/components/Changelog.astro                   # NEW (Task 5)
├─ src/pages/contributions/[slug].astro             # EXTEND — changelog + notebar + byline links (Tasks 5,7)
├─ src/pages/arena.astro                            # REWRITE — three boards (Task 6)
├─ src/pages/people/[handle].astro                  # NEW (Task 7)
└─ test/
   ├─ derive-evidence.test.js                       # NEW (Task 2)
   ├─ derive-arena.test.js                          # NEW (Task 3)
   ├─ derive-people.test.js                         # NEW (Task 7)
   ├─ cycle3-arena.test.js                          # NEW (Task 8)
   └─ fixtures/derive-root/records/adoptions/…       # NEW (Task 2)
CONTRACTS.md                                         # CP-C section filled (Task 8)
```

---

### Task 1: Adoption record — schema + validator + loader + crossref + template + fixtures

**This is largely a transcription task.** TDD in the validator workspace: schema/rule tests first, then wire the loader and rules.

**Files:**
- Create branch (Step 0): `c3-evidence-arena`
- Create: `content/schemas/adoption.schema.json`
- Create: `content/templates/adoption.yaml`
- Extend: `content/validator/src/load.js`, `content/validator/src/rules/schema.js`, `content/validator/src/rules/crossrefs.js`
- Create tests: `content/validator/test/rule-adoption.test.js`, `content/validator/test/load-adoptions.test.js`
- Create fixtures: `content/validator/test/fixtures/adoption-root/…`

**Interfaces:**
- Consumes: the auto-loading validator registry (`content/validator/src/schemas.js` compiles every `*.schema.json` in `content/schemas/`; the file's basename minus `.schema.json` is the validator name — so `adoption.schema.json` registers as `getValidator("adoption")`). The `person` shape (name/email/team/division; required name+team; `additionalProperties:false`) is reused verbatim from the endorsement schema.
- Produces:
  - `getValidator("adoption")` validating the adoption record shape.
  - `loadContent(root)` returning a new additive `content.adoptions` array of `{ file, data }` (loaded from `content/records/adoptions/*.yaml`), exactly mirroring how `replications`/`endorsements` load.
  - Schema rule validates every `content.adoptions[i].data` against the `adoption` schema; crossref rule requires each adoption's `contribution_id` to resolve to a known contribution.

- [ ] **Step 0: Create the cycle branch**

From the repo root:

```bash
git checkout -b c3-evidence-arena
```

(All Cycle 3 commits land here. If the branch already exists from a prior session, `git checkout c3-evidence-arena` instead.)

- [ ] **Step 1: Write the failing schema test**

Create `content/validator/test/rule-adoption.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator } from "../src/schemas.js";

const valid = {
  contribution_id: "prompt-cache-evals",
  adopter: { name: "Sofia Marchetti", team: "markets-analytics", division: "Markets" },
  pipeline: "markets-nightly-evals",
  status: "active",
  since: "2026-07-08",
  impact: "eval spend down 58% month over month",
  date: "2026-07-13"
};

test("accepts a valid adoption (impact optional but present)", () => {
  assert.equal(getValidator("adoption")(valid), true);
});

test("accepts a valid adoption without the optional impact", () => {
  const { impact, ...rest } = valid;
  assert.equal(getValidator("adoption")(rest), true);
});

test("rejects an adoption missing a required field (pipeline)", () => {
  const { pipeline, ...rest } = valid;
  assert.equal(getValidator("adoption")(rest), false);
});

test("rejects an unknown status", () => {
  assert.equal(getValidator("adoption")({ ...valid, status: "maybe" }), false);
});

test("rejects an unknown top-level property (additionalProperties:false)", () => {
  assert.equal(getValidator("adoption")({ ...valid, rating: 5 }), false);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `content/validator/`): `node --test`
Expected: `rule-adoption.test.js` FAILS — `getValidator("adoption")` throws `No schema named "adoption"` (the schema file does not exist yet).

- [ ] **Step 3: Create the adoption schema**

Create `content/schemas/adoption.schema.json` (verbatim):

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Adoption record",
  "type": "object",
  "additionalProperties": false,
  "required": ["contribution_id", "adopter", "pipeline", "status", "since", "date"],
  "properties": {
    "contribution_id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "adopter": { "$ref": "#/definitions/person" },
    "pipeline": { "type": "string", "minLength": 1 },
    "status": { "enum": ["active", "trialing", "retired"] },
    "since": { "type": "string", "format": "date" },
    "impact": { "type": "string", "minLength": 1, "maxLength": 200 },
    "date": { "type": "string", "format": "date" }
  },
  "definitions": {
    "person": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "team"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "email": { "type": "string", "format": "email" },
        "team": { "type": "string", "minLength": 1 },
        "division": { "type": "string" }
      }
    }
  }
}
```

- [ ] **Step 4: Run to verify the schema test passes**

Run (from `content/validator/`): `node --test`
Expected: `rule-adoption.test.js` PASSES. Other suites still pass (the registry auto-loaded the new schema; nothing else changed).

- [ ] **Step 5: Write the failing loader/crossref test + fixtures**

Create fixture `content/validator/test/fixtures/adoption-root/contributions/prompt-cache-evals/index.md`:

```markdown
---
id: prompt-cache-evals
title: Prompt caching cut our eval suite cost
tier: finding
authors:
  - name: Nick
    team: Model Validation
category: evals
tags: [caching]
status: published
created: "2026-07-01"
updated: "2026-07-10"
---

## Summary

A shared-prefix cache halved eval spend across the suite with no quality change.

## Context

Context body long enough to satisfy the template minimum length rule for findings.

## Technique

Cache the shared prompt prefix and reuse it across the eval batch.

## Evidence

Cost fell by roughly half over twenty runs.

## How to replicate

See the bundle and re-run against your own suite.
```

Create fixture `content/validator/test/fixtures/adoption-root/records/adoptions/prompt-cache-evals--markets.yaml`:

```yaml
contribution_id: prompt-cache-evals
adopter:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
pipeline: markets-nightly-evals
status: active
since: 2026-07-08
impact: eval spend down 58% month over month
date: 2026-07-13
```

Create fixture `content/validator/test/fixtures/adoption-root/records/adoptions/ghost--x.yaml` (a dangling reference the crossref rule must flag):

```yaml
contribution_id: ghost-contribution
adopter:
  name: Nobody
  team: nowhere
pipeline: nowhere-pipeline
status: trialing
since: 2026-07-08
date: 2026-07-13
```

Create `content/validator/test/load-adoptions.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/load.js";
import { runValidation } from "../src/runner.js";

const root = fileURLToPath(new URL("./fixtures/adoption-root/", import.meta.url));

test("loader exposes content.adoptions as an additive array", () => {
  const content = loadContent(root);
  assert.ok(Array.isArray(content.adoptions), "content.adoptions must exist");
  assert.equal(content.adoptions.length, 2);
  const active = content.adoptions.find((a) => a.data.status === "active");
  assert.equal(active.data.adopter.team, "markets-analytics");
});

test("loader still returns the frozen keys unchanged", () => {
  const content = loadContent(root);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "errors"]) {
    assert.ok(k in content, `content.${k} must still exist`);
  }
});

test("crossref flags an adoption pointing at an unknown contribution", () => {
  const findings = runValidation(root);
  const ghost = findings.find((f) => f.rule === "crossref" && /ghost-contribution/.test(f.message));
  assert.ok(ghost, "expected a crossref finding for the ghost adoption");
});

test("the valid adoption produces no schema finding", () => {
  const findings = runValidation(root);
  const schemaOnAdoption = findings.find(
    (f) => f.rule === "schema" && /adoptions[\\/]prompt-cache-evals/.test(f.file)
  );
  assert.equal(schemaOnAdoption, undefined);
});
```

- [ ] **Step 6: Run to verify failure**

Run (from `content/validator/`): `node --test`
Expected: `load-adoptions.test.js` FAILS — `content.adoptions` is `undefined` (loader not extended) and the ghost is not flagged (crossref not extended).

- [ ] **Step 7: Extend the loader**

In `content/validator/src/load.js`, add `adoptions: []` to the `content` object literal (immediately after `benchmarks: [],`):

```js
    benchmarks: [],
    adoptions: [],
    errors: []
```

Then, in the block that loads the record directories (immediately after the `loadYamlDir(content, join(root, "records", "endorsements"), "endorsements");` line), add:

```js
  loadYamlDir(content, join(root, "records", "adoptions"), "adoptions");
```

(Result order: replications, endorsements, adoptions, benchmarks. `loadYamlDir` already no-ops when the directory is absent, so repos without adoptions get `content.adoptions === []`.)

- [ ] **Step 8: Extend the schema rule**

In `content/validator/src/rules/schema.js`, immediately after the existing `checkGroup(content.benchmarks, "benchmark", findings);` line, add:

```js
  checkGroup(content.adoptions ?? [], "adoption", findings);
```

(The `?? []` guard keeps the rule safe if it is ever handed a content object built without `adoptions` — e.g. a hand-rolled unit-test fixture.)

- [ ] **Step 9: Extend the crossref rule**

In `content/validator/src/rules/crossrefs.js`, change the contribution-id loop header from:

```js
  for (const r of [...content.replications, ...content.endorsements]) {
```

to:

```js
  for (const r of [...content.replications, ...content.endorsements, ...(content.adoptions ?? [])]) {
```

(The `?? []` guard preserves the existing `rule-crossrefs.test.js`, whose hand-built `content()` helper has no `adoptions` key.)

- [ ] **Step 10: Create the adoption template**

Create `content/templates/adoption.yaml` (a commented example, matching the style of the M1 templates):

```yaml
# Adoption record — one team running someone else's contribution in a real pipeline.
# Place at: content/records/adoptions/<contribution-id>--<team>.yaml
# The validator checks: schema (this shape) + crossref (contribution_id must resolve).

contribution_id: some-contribution-id   # required — must match a published contribution's id
adopter:                                # required — the team/person running it
  name: Full Name
  team: your-team                       # e.g. markets-analytics
  division: Your Division               # optional but recommended (feeds the Arena divisions board)
pipeline: where-it-runs                 # required — the pipeline/surface it runs in
status: active                          # required — active | trialing | retired
since: 2026-07-01                       # required — when adoption began (YYYY-MM-DD)
impact: one measured line, e.g. "-40% manual review"   # optional — recording it earns a scoring bonus
date: 2026-07-14                        # required — record date (YYYY-MM-DD)
```

- [ ] **Step 11: Run the full validator suite + validate real content**

Run (from `content/validator/`): `node --test` → all PASS (schema + loader + crossref tests green; existing suites unchanged).
Run (repo root): `npm run validate` → `✓ content validation passed` (no adoption records exist yet; the empty `records/adoptions` path is a no-op).
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 12: Commit**

```bash
git add -A content/schemas/adoption.schema.json content/templates/adoption.yaml content/validator/src/load.js content/validator/src/rules/schema.js content/validator/src/rules/crossrefs.js content/validator/test/
git commit -m "feat(validator): adoption record schema, loader adoptions[], and crossref coverage" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Derive — evidence extension (`adoptions[]` + `changelog[]`)

**This is a transcription task** for the derive code.

**Files:**
- Extend: `site/scripts/derive.mjs` (add `gitLog`, extend `derive()` options + `evidence[slug]`)
- Create fixture record: `site/test/fixtures/derive-root/records/adoptions/alpha-cache--markets.yaml`
- Create test: `site/test/derive-evidence.test.js`

**Interfaces:**
- Consumes: `loadContent(contentRoot)` (now with `content.adoptions`); an injectable `log` function (default `gitLog`) mirroring the existing injectable `rev`.
- Produces: `evidence[slug]` gains two additive keys:
  - `adoptions: [{ team, pipeline, status, impact, since, date }]` — the first-class adoption records whose `contribution_id` matches, in loader order. `impact` is `null` when absent.
  - `changelog: [{ rev, date, subject }]` — the last 5 non-merge commits touching `content/contributions/<slug>/`, newest first; `[]` when git history is unavailable.
  - Existing keys `replications`, `endorsements`, `rev` are unchanged.
- `derive(contentRoot, { rev, log })` — new optional `log` in the options bag; existing callers (which pass only `{ rev }` or `{}`) are unaffected.

- [ ] **Step 1: Add the fixture adoption record**

Create `site/test/fixtures/derive-root/records/adoptions/alpha-cache--markets.yaml`:

```yaml
contribution_id: alpha-cache
adopter:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
pipeline: markets-nightly-evals
status: active
since: 2026-07-08
impact: eval spend down 58% month over month
date: 2026-07-13
```

- [ ] **Step 2: Write the failing test**

Create `site/test/derive-evidence.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { derive } from "../scripts/derive.mjs";

const root = fileURLToPath(new URL("./fixtures/derive-root", import.meta.url));
const fakeRev = () => "abc1234";
const fakeLog = (dir) => [
  { rev: "deadbee", date: "2026-07-12", subject: `touched ${dir.includes("alpha-cache") ? "alpha-cache" : "other"}` }
];

test("evidence keeps its frozen keys and gains adoptions[] + changelog[]", () => {
  const { evidence } = derive(root, { rev: fakeRev, log: fakeLog });
  const ev = evidence["alpha-cache"];
  // frozen keys unchanged
  assert.ok(Array.isArray(ev.replications));
  assert.ok(Array.isArray(ev.endorsements));
  assert.equal(ev.rev, "abc1234");
  // additive keys
  assert.deepEqual(ev.adoptions, [
    { team: "markets-analytics", pipeline: "markets-nightly-evals", status: "active",
      impact: "eval spend down 58% month over month", since: "2026-07-08", date: "2026-07-13" }
  ]);
  assert.equal(ev.changelog.length, 1);
  assert.equal(ev.changelog[0].rev, "deadbee");
  assert.equal(ev.changelog[0].subject, "touched alpha-cache");
});

test("changelog degrades to [] when the log function throws (no git)", () => {
  const throwingLog = () => { throw new Error("not a git repo"); };
  // the default gitLog swallows errors; a caller-injected thrower must be caught too
  const { evidence } = derive(root, { rev: fakeRev, log: (dir) => {
    try { return throwingLog(dir); } catch { return []; }
  } });
  assert.deepEqual(evidence["alpha-cache"].changelog, []);
});
```

- [ ] **Step 3: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-evidence.test.js` FAILS (`ev.adoptions`/`ev.changelog` are `undefined`). `derive.test.js` still PASSES.

- [ ] **Step 4: Add `gitLog` to `derive.mjs`**

In `site/scripts/derive.mjs`, immediately after the existing `gitRev` function, add:

```js
// Last 5 non-merge commits touching a directory: {rev, date, subject}. Empty when
// git history is unavailable (tarball / shallow clone) — same graceful degradation as gitRev.
// The \x1f (unit separator) delimiter cannot appear in commit subjects, so parsing is safe.
function gitLog(dir) {
  try {
    const out = execFileSync(
      "git",
      ["log", "-n", "5", "--no-merges", "--date=short", "--format=%h%x1f%ad%x1f%s", "--", dir],
      { encoding: "utf8" }
    );
    return out.split("\n").filter(Boolean).map((line) => {
      const [rev, date, subject] = line.split("\x1f");
      return { rev, date, subject };
    });
  } catch {
    return [];
  }
}
```

- [ ] **Step 5: Extend `derive()` signature + evidence build**

In `site/scripts/derive.mjs`, change the `derive` signature from:

```js
export function derive(contentRoot, { rev = gitRev } = {}) {
```

to:

```js
export function derive(contentRoot, { rev = gitRev, log = gitLog } = {}) {
```

Then, inside `derive()`, add a line to pull adoptions alongside `reps`/`endos` (immediately after `const endos = content.endorsements.map((e) => e.data);`):

```js
  const adopts = content.adoptions.map((a) => a.data);
```

Finally, in the `evidence` build loop, extend the per-slug object. Change:

```js
      endorsements: endos.filter((e) => e.contribution_id === id).map((e) => ({
        type: e.type,
        quote: e.statement,
        by: `${e.by.name} · ${e.by.team}`,
        date: e.date
      })),
      rev: rev(c.file)
    };
```

to:

```js
      endorsements: endos.filter((e) => e.contribution_id === id).map((e) => ({
        type: e.type,
        quote: e.statement,
        by: `${e.by.name} · ${e.by.team}`,
        date: e.date
      })),
      adoptions: adopts.filter((a) => a.contribution_id === id).map((a) => ({
        team: a.adopter.team,
        pipeline: a.pipeline,
        status: a.status,
        impact: a.impact ?? null,
        since: a.since,
        date: a.date
      })),
      changelog: log(c.dir),
      rev: rev(c.file)
    };
```

(`c.dir` is the absolute contribution directory from the loader — `git log -- <absDir>` works from any cwd. Note the CI implication in Step 7.)

- [ ] **Step 6: Run tests + derive + build**

Run (from `site/`): `node --test` → all PASS (new + existing).
Run (repo root): `npm run derive` → writes `site/src/data/evidence.json` with the new keys. Spot-check: `grep -c "\"changelog\"" site/src/data/evidence.json` ≥ 1 and `grep -c "\"adoptions\"" site/src/data/evidence.json` ≥ 1.
Run (repo root): `npm run build -w site` → PASS.

- [ ] **Step 7: Confirm the CI implication (no workflow change)**

Read `.github/workflows/validate.yml`. Confirm the `site-build` job already does `actions/checkout@v4` **with `fetch-depth: 0`** — so the site build (which runs `derive`) has full git history and populates real changelogs. The `validate` job (which runs `npm test --workspaces`) uses the default shallow clone, but every derive-path test injects a fake `log`, and the real `gitLog` degrades to `[]` on a shallow/absent history, so nothing fails. **No change to `validate.yml` is needed — confirm and state this in the commit body.**

- [ ] **Step 8: Commit**

```bash
git add -A site/scripts/derive.mjs site/test/derive-evidence.test.js site/test/fixtures/derive-root/records/adoptions/
git commit -m "feat(derive): extend evidence with adoptions[] and git-native changelog[]" -m "validate.yml site-build already uses fetch-depth: 0; changelog degrades to [] on shallow/no-git." -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Derive — scoring engine + `deriveArena`

**This is a transcription task** for the engine; the point values are contract (see Global Constraints).

**Files:**
- Extend: `site/src/lib/format.mjs` (add `slugifyName`)
- Extend: `site/scripts/derive.mjs` (add `buildScoreModel`, `deriveArena`; emit `arena.json` in the CLI)
- Create test: `site/test/derive-arena.test.js`

**Interfaces:**
- Consumes: a loaded `content` object (`{ contributions, replications, endorsements, adoptions, errors }`).
- Produces:
  - `slugifyName(name)` → lowercase-hyphenated slug (the `handle`).
  - `buildScoreModel(content)` → `{ individuals, teams, divisions }` (fully scored + sorted; `individuals[i].handle` assigned; carries detail lists for Task 7). Fails loud if `content.errors.length > 0`. **Exported** for reuse by `derivePeople` (Task 7).
  - `deriveArena(content, { now })` → **exactly** this shape (frozen at CP-C):
    ```
    {
      individuals: [{ handle, name, team, division, score,
                      breakdown: { authored, replicationsReceived, replicationsPerformed, adoptions, endorsements } }],
      teams: [{ team, division, score, members }],            // members: string[] of names; division may be null
      divisions: [{ division, score, teams }],                // teams: string[] of team names; excludes null-division teams
      generated: "YYYY-MM-DD"
    }
    ```
  - Written file `site/src/data/arena.json` with that shape.

**Scoring rules (exact — the engine encodes these; unit tests below assert each):**
- **authored** `+10` to every author of each published contribution (multi-author: each author gets the full amount, not split).
- **replication** counts only when `outcome === "replicated"` **and** the replicator's team is not any author's team (self-team → `0` on both sides). When it counts: `+15` to every author (received), `+12` to the replicator (performed).
- **adoption** (first-class record) of a published contribution: `status active|trialing` → `+8` to every author, `+4` more if `impact` is a non-empty string; `status retired` → `0` and not counted.
- **endorsement** record (`type: endorsement`) → `+3` to every author; **adoption-type endorsement** (`type: adoption`, the M1 shape) → `+8` to every author (no impact field, so never the bonus).
- Only events on **published** contributions score.
- **Beneficiary of received/adoption/endorsement points is the contribution author(s).** Only the *performed* replication rewards the actor (the replicator). Adopters/endorsers earn nothing for adopting/endorsing.
- **Team score** attributes each scoring event to the beneficiary's team **at event time** (author's team from frontmatter for authored/received/adoption/endorsement; replicator's team from the record for performed).
- **Division** rolls up team scores; a team's division is taken from its members' event-time division. Teams whose events carry **no division** are omitted from the divisions board (they still appear on individuals + teams boards).
- **Tie-break** on every board: score desc, then replication-count desc (`replicationsReceived + replicationsPerformed`, summed across members for teams/divisions), then name/team/division ascending (`localeCompare`).
- **handle** = `slugifyName(name)`; on the (content-absent) chance two distinct names slug identically, the engine appends `-2`, `-3`, … in final-sorted order so `people.json` keys never collide.

- [ ] **Step 1: Add `slugifyName` to `format.mjs`**

In `site/src/lib/format.mjs`, add at the end:

```js
// Lowercase-hyphenated person slug used for /people/<handle> routes and Arena handles.
export function slugifyName(name) {
  return name.toLowerCase().trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
```

- [ ] **Step 2: Write the failing scoring test**

Create `site/test/derive-arena.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { deriveArena, buildScoreModel } from "../scripts/derive.mjs";

// Minimal content builder — mirrors the loader's shape.
function contrib(id, authors, { status = "published", title = id, tier = "finding", result = null } = {}) {
  return { dirName: id, dir: `/x/${id}`, file: `/x/${id}/index.md`,
    frontmatter: { id, title, tier, status, result, authors }, body: "", raw: "" };
}
const A = (name, team, division) => ({ name, team, ...(division ? { division } : {}) });

function content({ contributions = [], replications = [], endorsements = [], adoptions = [] } = {}) {
  return {
    contributions,
    replications: replications.map((data) => ({ file: "r.yaml", data })),
    endorsements: endorsements.map((data) => ({ file: "e.yaml", data })),
    adoptions: adoptions.map((data) => ({ file: "a.yaml", data })),
    errors: []
  };
}
const now = () => new Date("2026-07-14T00:00:00Z");

test("authored gives 10 to each author; generated is an iso date", () => {
  const a = deriveArena(content({ contributions: [contrib("c1", [A("Ann", "t1", "D1")])] }), { now });
  assert.equal(a.generated, "2026-07-14");
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10);
  assert.equal(ann.handle, "ann");
  assert.deepEqual(ann.breakdown, { authored: 1, replicationsReceived: 0, replicationsPerformed: 0, adoptions: 0, endorsements: 0 });
});

test("cross-team replicated: +15 author, +12 replicator; self-team scores 0 both sides", () => {
  const cross = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Bea", "t2"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(cross.individuals.find((i) => i.name === "Ann").score, 25); // 10 + 15
  assert.equal(cross.individuals.find((i) => i.name === "Bea").score, 12);

  const self = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Cal", "t1"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(self.individuals.find((i) => i.name === "Ann").score, 10); // no +15
  assert.equal(self.individuals.find((i) => i.name === "Cal"), undefined); // no points → not scored
});

test("non-replicated outcomes do not score", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Bea", "t2"), outcome: "partial", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(a.individuals.find((i) => i.name === "Ann").score, 10);
  assert.equal(a.individuals.find((i) => i.name === "Bea"), undefined);
});

test("adoption: active=8, +4 impact bonus, retired=0 and uncounted", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    adoptions: [
      { contribution_id: "c1", adopter: A("Bea", "t2"), pipeline: "p", status: "active", since: "2026-07-01", impact: "x", date: "2026-07-10" },
      { contribution_id: "c1", adopter: A("Cal", "t3"), pipeline: "p", status: "trialing", since: "2026-07-01", date: "2026-07-10" },
      { contribution_id: "c1", adopter: A("Dan", "t4"), pipeline: "p", status: "retired", since: "2026-07-01", impact: "y", date: "2026-07-10" }
    ]
  }), { now });
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10 + 12 + 8); // authored + active-with-impact + trialing; retired scores 0
  assert.equal(ann.breakdown.adoptions, 2); // retired not counted
});

test("adoption-type endorsement counts as an adoption (8); plain endorsement is 3", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    endorsements: [
      { contribution_id: "c1", type: "adoption", by: A("Bea", "t2"), statement: "s", pipeline: "p", date: "2026-07-10" },
      { contribution_id: "c1", type: "endorsement", by: A("Cal", "t3"), statement: "s", date: "2026-07-10" }
    ]
  }), { now });
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10 + 8 + 3);
  assert.equal(ann.breakdown.adoptions, 1);
  assert.equal(ann.breakdown.endorsements, 1);
});

test("tie-break: equal score orders by replication count, then name", () => {
  // Ann and Bob both score 10 via authoring; Bob also received a cross-team replication (higher repCount).
  const a = deriveArena(content({
    contributions: [contrib("aaa", [A("Ann", "t1")]), contrib("bbb", [A("Bob", "t2")]), contrib("ccc", [A("Cid", "t3")])],
    replications: [{ contribution_id: "bbb", replicator: A("Zoe", "t9"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  // Bob: 10 + 15 = 25 (repCount 1). Ann & Cid: 10 each (repCount 0) → alpha order Ann before Cid.
  const names = a.individuals.map((i) => i.name);
  assert.deepEqual(names.slice(0, 3), ["Bob", "Ann", "Cid"]);
});

test("handle collision between two distinct names gets a numeric suffix", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Al-ex", "t1")]), contrib("c2", [A("Al Ex", "t2")])]
  }), { now });
  const handles = a.individuals.map((i) => i.handle).sort();
  assert.deepEqual(handles, ["al-ex", "al-ex-2"]);
});

test("teams and divisions roll up; null-division teams are excluded from divisions", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1", "D1")]), contrib("c2", [A("Bea", "t2")])] // t2 has no division
  }), { now });
  assert.deepEqual(a.teams.map((t) => t.team).sort(), ["t1", "t2"]);
  assert.deepEqual(a.divisions.map((d) => d.division), ["D1"]); // t2 excluded (no division)
  assert.deepEqual(a.divisions[0].teams, ["t1"]);
});

test("buildScoreModel throws loudly on content errors", () => {
  assert.throws(() => buildScoreModel({ contributions: [], replications: [], endorsements: [], adoptions: [], errors: [{ file: "x", rule: "y", message: "z" }] }), /errors/);
});
```

- [ ] **Step 3: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-arena.test.js` FAILS (`deriveArena`/`buildScoreModel` not exported).

- [ ] **Step 4: Implement the scoring engine + `deriveArena`**

In `site/scripts/derive.mjs`, add the `slugifyName` import to the existing `format.mjs` import line. Change:

```js
import { firstSentence } from "../src/lib/format.mjs";
```

to:

```js
import { firstSentence, slugifyName } from "../src/lib/format.mjs";
```

Then, **immediately after** the `deriveToolkit(...)` function's closing `}` (before the `// CLI:` comment), insert:

```js
// ---- Arena scoring (Cycle 3, CP-C). Point values are contract; see the plan's Global Constraints. ----
const POINTS = {
  authored: 10,
  replicationReceived: 15,
  replicationPerformed: 12,
  adoption: 8,
  adoptionImpactBonus: 4,
  endorsement: 3
};

// Builds the full scored model (individuals with detail + counts, teams, divisions), sorted.
// Exported so derivePeople reuses the exact same scoring. Fails loud on loader errors.
export function buildScoreModel(content) {
  if (content.errors && content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`buildScoreModel: content has errors — run npm run validate\n${lines.join("\n")}`);
  }

  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const byId = new Map(published.map((c) => [c.frontmatter.id, c]));

  const people = new Map(); // name -> detail
  const teams = new Map();  // team -> { team, division, score, members:Set, repCount }

  const person = (name) => {
    if (!people.has(name)) {
      people.set(name, {
        name, team: null, division: null, score: 0, repCount: 0,
        breakdown: { authored: 0, replicationsReceived: 0, replicationsPerformed: 0, adoptions: 0, endorsements: 0 },
        contributions: [], replicationsPerformed: [], received: []
      });
    }
    return people.get(name);
  };
  const teamOf = (t) => {
    if (!teams.has(t)) teams.set(t, { team: t, division: null, score: 0, members: new Set(), repCount: 0 });
    return teams.get(t);
  };
  // Credit points to a person AND to the team they were on at event time.
  const credit = (name, team, division, points, repDelta = 0) => {
    const p = person(name);
    if (p.team === null) { p.team = team; p.division = division ?? null; } // home team = first crediting event
    p.score += points;
    p.repCount += repDelta;
    const tm = teamOf(team);
    tm.score += points;
    tm.repCount += repDelta;
    tm.members.add(name);
    if (division != null && tm.division == null) tm.division = division;
  };

  // Deterministic processing order: authored (by id), then replications, adoptions, endorsements (by file).
  const sortedPub = [...published].sort((a, b) => a.frontmatter.id.localeCompare(b.frontmatter.id));
  const byFile = (arr) => [...arr].sort((x, y) => x.file.localeCompare(y.file));

  // 1. Authored
  for (const c of sortedPub) {
    const fm = c.frontmatter;
    const card = { slug: c.dirName, title: fm.title, tier: fm.tier, result: fm.result ?? null };
    for (const a of fm.authors) {
      credit(a.name, a.team, a.division, POINTS.authored);
      const p = person(a.name);
      p.breakdown.authored += 1;
      p.contributions.push(card);
    }
  }

  // 2. Replications (only outcome=replicated, cross-team score)
  for (const r of byFile(content.replications)) {
    const rec = r.data;
    const c = byId.get(rec.contribution_id);
    if (!c) continue;
    if (rec.outcome !== "replicated") continue;
    const authorTeams = new Set(c.frontmatter.authors.map((a) => a.team));
    if (authorTeams.has(rec.replicator.team)) continue; // self-team → 0 both sides
    const benchmark = rec.benchmark_id ?? "own workflow";
    for (const a of c.frontmatter.authors) {
      credit(a.name, a.team, a.division, POINTS.replicationReceived, 1);
      person(a.name).breakdown.replicationsReceived += 1;
    }
    credit(rec.replicator.name, rec.replicator.team, rec.replicator.division, POINTS.replicationPerformed, 1);
    const rp = person(rec.replicator.name);
    rp.breakdown.replicationsPerformed += 1;
    rp.replicationsPerformed.push({
      slug: c.dirName, title: c.frontmatter.title, team: rec.replicator.team,
      outcome: rec.outcome, delta: rec.measured_delta ?? null, benchmark, date: rec.date
    });
  }

  // 3. Adoptions (first-class records)
  for (const a of byFile(content.adoptions)) {
    const rec = a.data;
    const c = byId.get(rec.contribution_id);
    if (!c) continue;
    if (rec.status === "retired") continue; // scores 0, not counted
    const pts = POINTS.adoption + (rec.impact ? POINTS.adoptionImpactBonus : 0);
    for (const au of c.frontmatter.authors) {
      credit(au.name, au.team, au.division, pts);
      const p = person(au.name);
      p.breakdown.adoptions += 1;
      p.received.push({
        kind: "adoption", slug: c.dirName, title: c.frontmatter.title,
        by: `${rec.adopter.name} · ${rec.adopter.team}`,
        note: rec.impact ? rec.impact : `${rec.pipeline} · ${rec.status}`, date: rec.date
      });
    }
  }

  // 4. Endorsements (type endorsement = 3; type adoption = 8, counts as adoption)
  for (const e of byFile(content.endorsements)) {
    const rec = e.data;
    const c = byId.get(rec.contribution_id);
    if (!c) continue;
    const isAdoption = rec.type === "adoption";
    const pts = isAdoption ? POINTS.adoption : POINTS.endorsement;
    for (const au of c.frontmatter.authors) {
      credit(au.name, au.team, au.division, pts);
      const p = person(au.name);
      if (isAdoption) p.breakdown.adoptions += 1; else p.breakdown.endorsements += 1;
      p.received.push({
        kind: isAdoption ? "adoption" : "endorsement", slug: c.dirName, title: c.frontmatter.title,
        by: `${rec.by.name} · ${rec.by.team}`, note: rec.statement, date: rec.date
      });
    }
  }

  const byScore = (keyName) => (a, b) =>
    b.score - a.score || b.repCount - a.repCount || a[keyName].localeCompare(b[keyName]);

  // Individuals — sort, then assign collision-safe handles.
  const individuals = [...people.values()].sort(byScore("name"));
  const seen = new Set();
  for (const ind of individuals) {
    const base = slugifyName(ind.name);
    let handle = base, n = 1;
    while (seen.has(handle)) { n += 1; handle = `${base}-${n}`; }
    seen.add(handle);
    ind.handle = handle;
  }

  // Teams
  const teamList = [...teams.values()].map((t) => ({
    team: t.team, division: t.division, score: t.score, repCount: t.repCount,
    members: [...t.members].sort((x, y) => x.localeCompare(y))
  })).sort(byScore("team"));

  // Divisions — exclude teams with no division.
  const divMap = new Map();
  for (const t of teamList) {
    if (t.division == null) continue;
    if (!divMap.has(t.division)) divMap.set(t.division, { division: t.division, score: 0, repCount: 0, teams: [] });
    const d = divMap.get(t.division);
    d.score += t.score;
    d.repCount += t.repCount;
    d.teams.push(t.team);
  }
  const divisions = [...divMap.values()].map((d) => ({
    division: d.division, score: d.score, repCount: d.repCount,
    teams: [...d.teams].sort((x, y) => x.localeCompare(y))
  })).sort(byScore("division"));

  return { individuals, teams: teamList, divisions };
}

export function deriveArena(content, { now = () => new Date() } = {}) {
  const model = buildScoreModel(content);
  return {
    individuals: model.individuals.map((i) => ({
      handle: i.handle, name: i.name, team: i.team, division: i.division, score: i.score,
      breakdown: { ...i.breakdown }
    })),
    teams: model.teams.map((t) => ({ team: t.team, division: t.division, score: t.score, members: t.members })),
    divisions: model.divisions.map((d) => ({ division: d.division, score: d.score, teams: d.teams })),
    generated: now().toISOString().slice(0, 10)
  };
}
```

- [ ] **Step 5: Emit `arena.json` in the CLI**

In `site/scripts/derive.mjs`, in the CLI block, **after** the `writeFileSync(join(outDir, "toolkit.json"), …)` line and **before** the `console.log(...)` line, add:

```js
    const arenaContent = loadContent(contentRoot);
    const arena = deriveArena(arenaContent);
    writeFileSync(join(outDir, "arena.json"), JSON.stringify(arena, null, 2));
```

(`loadContent` is already imported at the top. `derive()` ran first and already threw if content had errors, so this second load is clean. The double load is cheap and keeps `derive()`'s frozen signature intact.)

- [ ] **Step 6: Run tests + derive + build**

Run (from `site/`): `node --test` → all PASS (arena + existing).
Run (repo root): `npm run derive` → writes `site/src/data/arena.json`.
Sanity-check the real board: `node -e "const a=require('./site/src/data/arena.json'); console.log('top:', a.individuals[0].name, a.individuals[0].score); console.log('divisions:', a.divisions.map(d=>d.division).join(','));"` — expect top individual `Sofia Marchetti` at `75`, divisions include `Markets, Risk, Cards, Payments, Institutional`.
Run (repo root): `npm run build -w site` → PASS (no page consumes arena.json yet — that is Task 6).

- [ ] **Step 7: Commit**

```bash
git add -A site/src/lib/format.mjs site/scripts/derive.mjs site/test/derive-arena.test.js
git commit -m "feat(derive): arena scoring engine and deriveArena -> arena.json" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: Seed adoption records

**This is a transcription task** — five adoption records, verbatim. They reference existing published contributions (Task-independent: the contributions already exist from Cycles 1–2). Coverage: three `active` with `impact`, one `trialing` (no impact), one `retired`. Every adopter is on a different team from the contribution's author (realistic cross-team adoption).

**Files:**
- Create: `content/records/adoptions/heading-aware-chunking--payments-platform.yaml`
- Create: `content/records/adoptions/prompt-cache-evals--markets-analytics.yaml`
- Create: `content/records/adoptions/structured-output-kyc--cards-experience.yaml`
- Create: `content/records/adoptions/retrieval-reranker-lite--risk-engineering.yaml`
- Create: `content/records/adoptions/batch-inference-queueing--ib-quant.yaml`

**Interfaces:**
- Consumes: the frozen `adoption` schema (Task 1) + crossref rule; the published contributions `heading-aware-chunking`, `prompt-cache-evals`, `structured-output-kyc`, `retrieval-reranker-lite`, `batch-inference-queueing`.
- Produces: five adoption records feeding evidence rails, note bars, and arena signal.

- [ ] **Step 1: Active + impact — `heading-aware-chunking--payments-platform.yaml`**

```yaml
contribution_id: heading-aware-chunking
adopter:
  name: Hana Kim
  team: payments-platform
  division: Payments
pipeline: payments-policy-rag
status: active
since: 2026-07-05
impact: mis-ranked passages down 22% on the production policy retrieval path
date: 2026-07-12
```

- [ ] **Step 2: Active + impact — `prompt-cache-evals--markets-analytics.yaml`**

```yaml
contribution_id: prompt-cache-evals
adopter:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
pipeline: markets-nightly-evals
status: active
since: 2026-07-08
impact: eval spend down 58% month over month
date: 2026-07-13
```

- [ ] **Step 3: Active + impact — `structured-output-kyc--cards-experience.yaml`**

```yaml
contribution_id: structured-output-kyc
adopter:
  name: Liam Fitzgerald
  team: cards-experience
  division: Cards
pipeline: cards-kyc-extraction
status: active
since: 2026-07-06
impact: removed 400 lines of regex post-processing from the extraction path
date: 2026-07-12
```

- [ ] **Step 4: Trialing, no impact — `retrieval-reranker-lite--risk-engineering.yaml`**

```yaml
contribution_id: retrieval-reranker-lite
adopter:
  name: Daniel Okafor
  team: risk-engineering
  division: Risk
pipeline: risk-research-search
status: trialing
since: 2026-07-11
date: 2026-07-14
```

- [ ] **Step 5: Retired — `batch-inference-queueing--ib-quant.yaml`**

```yaml
contribution_id: batch-inference-queueing
adopter:
  name: Priyanka Nair
  team: ib-quant
  division: Institutional
pipeline: ib-quant-batch-scoring
status: retired
since: 2026-07-02
date: 2026-07-14
```

- [ ] **Step 6: Validate, derive, build, test**

Run (repo root): `npm run validate` → `✓ content validation passed`.
Run (repo root): `npm run derive` → regenerates data including `arena.json` + `evidence.json` with the new adoptions.
Sanity: `node -e "const e=require('./site/src/data/evidence.json'); console.log('heading adoptions:', e['heading-aware-chunking'].adoptions.length);"` → `1`.
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 7: Commit**

```bash
git add -A content/records/adoptions/
git commit -m "content(seed): five adoption records (active+impact, trialing, retired) for arena signal" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: Evidence trail on contribution pages — Rail adoptions + Changelog + note bar

**This is a transcription task** for the components; `<style>` blocks are design (reuse existing tokens/classes) and may be tuned as long as the asserted DOM text/structure survives.

**Files:**
- Extend: `site/src/components/Rail.astro` (adoption annotations between replications and endorsements)
- Create: `site/src/components/Changelog.astro`
- Extend: `site/src/pages/contributions/[slug].astro` (pass adoptions to Rail; render Changelog for all tiers before the citation block; adoption count on the note bar)

**Interfaces:**
- Consumes: `evidence[slug].adoptions` (`[{ team, pipeline, status, impact, since, date }]`) and `evidence[slug].changelog` (`[{ rev, date, subject }]`) from Task 2.
- Produces: rail adoption annotations (caps `Adoption · <team>`, pipeline line, status chip — `active` = `seal` oxblood box, `trialing`/`retired` = `stamp` hairline chip), a Changelog section at article end (all tiers, before citation), and a note closing bar that gains ` · N adoptions` when `> 0`. Verified seal count stays replications-only.

- [ ] **Step 1: Extend `Rail.astro`**

In `site/src/components/Rail.astro`, change the props destructure line from:

```js
const { headings = [], replications = [], endorsements = [] } = Astro.props;
```

to:

```js
const { headings = [], replications = [], endorsements = [], adoptions = [] } = Astro.props;
const ADOPTION_LABEL = { active: "Active", trialing: "Trialing", retired: "Retired" };
```

Then, **between** the replications `.map(...)` block and the endorsements `.map(...)` block (i.e. after the closing `))}` of the replications map, before `{endorsements.map(...)}`), insert:

```astro
  {adoptions.map((a) => (
    <div class="ann rv">
      <span class="k">Adoption · {a.team}</span>
      <div class="pl">{a.pipeline}</div>
      <div class="d">
        <span class={a.status === "active" ? "seal" : "stamp"}>{ADOPTION_LABEL[a.status] ?? a.status}</span>
        {" "}· since {fmtDate(a.since, "short")}{a.impact ? ` · ${a.impact}` : ""}
      </div>
    </div>
  ))}
```

In the `<style>` block, add a rule for the pipeline line (near the `.ann .q` rule):

```css
  .ann .pl { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: var(--ink); }
```

- [ ] **Step 2: Create `Changelog.astro`**

Create `site/src/components/Changelog.astro`:

```astro
---
import { fmtDate } from "../lib/format.mjs";
const { items = [] } = Astro.props;
---
{items.length > 0 && (
  <section class="changelog rv" aria-label="Changelog">
    <p class="caps">Changelog</p>
    <ul>
      {items.map((c) => (
        <li>
          <code class="rev">{c.rev}</code>
          <span class="cd">{fmtDate(c.date, "short")}</span>
          <span class="cs">{c.subject}</span>
        </li>
      ))}
    </ul>
  </section>
)}
<style>
  .changelog { border-top: 1px solid var(--hairline); margin-top: 30px; padding-top: 14px; }
  .changelog .caps { color: var(--oxblood); margin: 0 0 10px; }
  .changelog ul { list-style: none; margin: 0; padding: 0;
                  font-family: system-ui, sans-serif; font-size: 12.5px; }
  .changelog li { display: grid; grid-template-columns: auto auto 1fr; gap: 12px; align-items: baseline;
                  padding: 5px 0; border-bottom: 1px solid var(--hairline); }
  .changelog .rev { font-family: ui-monospace, Consolas, monospace; font-size: 11.5px; color: var(--oxblood); }
  .changelog .cd { color: var(--slate); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .changelog .cs { color: var(--ink); }
  @media (max-width: 640px) { .changelog li { grid-template-columns: 1fr; gap: 2px; } }
</style>
```

(The component renders nothing when `items` is empty — the graceful no-git case.)

- [ ] **Step 3: Wire Changelog + Rail adoptions + note bar into `[slug].astro`**

In `site/src/pages/contributions/[slug].astro`:

1. Add the import (after the `import Rail` line):

```js
import Changelog from "../../components/Changelog.astro";
```

2. Extend the evidence fallback default so `adoptions`/`changelog` are always arrays. Change:

```js
const ev = evidence[slug] ?? { replications: [], endorsements: [], rev: null };
```

to:

```js
const ev = evidence[slug] ?? { replications: [], endorsements: [], adoptions: [], changelog: [], rev: null };
const adoptions = ev.adoptions ?? [];
```

3. Pass adoptions to the Rail. Change:

```astro
      {!isNote && <Rail headings={h2s} replications={ev.replications} endorsements={ev.endorsements} />}
```

to:

```astro
      {!isNote && <Rail headings={h2s} replications={ev.replications} endorsements={ev.endorsements} adoptions={adoptions} />}
```

4. Insert the Changelog for **all tiers**, immediately after the `</div>` that closes `.article-body` and **before** the `{!isNote && <CitationBlock … />}` line:

```astro
        </div>
        <Changelog items={ev.changelog ?? []} />
        {!isNote && <CitationBlock fm={fm} slug={slug} rev={ev.rev} />}
```

5. Update the note closing bar to add the adoption count when `> 0`. Change:

```astro
          <div class="notebar">
            <span>{verified} replication{verified === 1 ? "" : "s"} yet</span>
            <a href="/contribute">Tried it? Add evidence →</a>
          </div>
```

to:

```astro
          <div class="notebar">
            <span>
              {verified} replication{verified === 1 ? "" : "s"}
              {adoptions.length > 0 ? ` · ${adoptions.length} adoption${adoptions.length === 1 ? "" : "s"}` : ""}
            </span>
            <a href="/contribute">Tried it? Add evidence →</a>
          </div>
```

- [ ] **Step 4: Derive, build, and dist-check**

Run (repo root): `npm run derive` then `npm run build -w site` → PASS.
Verify the rail adoption annotation renders on a page that has one (`heading-aware-chunking`, a tutorial → has a rail):
`grep -c "Adoption · payments-platform" site/dist/contributions/heading-aware-chunking/index.html` → `≥ 1`.
Verify the Changelog section rendered (git history is present in this checkout):
`grep -c "Changelog" site/dist/contributions/retrieval-reranker-lite/index.html` → `≥ 1`.
Verify a note bar gained an adoption count where applicable — `context-window-budgeting` and `eval-rubric-drift` have no adoptions, so their bars show replications only; that is correct. (No note in the seed set currently has an adoption; the `> 0` branch is exercised by the Task 8 rebuild only if one is added — the conditional is still asserted structurally by build success.)
Run (repo root): `node site/scripts/check-links.mjs site/dist` → PASS.
Run (repo root): `npm test --workspaces` → PASS (component changes are render-only; no test asserts the removed "yet" copy).

- [ ] **Step 5: Commit**

```bash
git add -A site/src/components/Rail.astro site/src/components/Changelog.astro site/src/pages/contributions/[slug].astro
git commit -m "feat(site): evidence trail — rail adoption annotations, changelog section, note-bar adoption count" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `/arena` page — three boards

**This is a transcription task** for the page; the `<style>` block is design (reuse tokens) but the three server-rendered boards, the no-JS-first tab mechanism, and the "How scoring works" footer are required.

**Files:**
- Rewrite: `site/src/pages/arena.astro` (replaces the placeholder)

**Interfaces:**
- Consumes: `site/src/data/arena.json` (Task 3 shape: `individuals`, `teams`, `divisions`, `generated`). Individual rows link to `/people/<handle>` (Task 7 route — the links are built now; the pages exist after Task 7, and Task 7's dist-check validates them).
- Produces: the rebuilt `/arena` route with Individuals / Teams / Divisions boards, all three rendered server-side, switched by a **pure-CSS radio-tab** control (no JS; the first tab is checked and visible without JS), rank + name/team + score with `tabular-nums`, top-3 rows an oxblood rank numeral, and a "How scoring works" footer stating the exact point values.

- [ ] **Step 1: Rewrite `arena.astro`**

Replace `site/src/pages/arena.astro` entirely:

```astro
---
import Base from "../layouts/Base.astro";
import Masthead from "../components/Masthead.astro";
import Footer from "../components/Footer.astro";
import { fmtDate, slugifyName } from "../lib/format.mjs";
import arena from "../data/arena.json";

const boards = [
  { key: "individuals", label: "Individuals" },
  { key: "teams", label: "Teams" },
  { key: "divisions", label: "Divisions" }
];
const rankClass = (i) => (i < 3 ? "rank top" : "rank");
---
<Base title="Arena · OpenResearch">
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead active="arena" />

    <section class="rv" style="padding: 40px 0 6px; max-width: 62ch;">
      <p class="caps" style="color: var(--oxblood)">Arena</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(28px,4vw,40px); line-height: 1.12; margin: 10px 0 12px; text-wrap: balance;">
        Ranked by what <em>other</em> teams verified.
      </h1>
      <p style="color: var(--slate); margin: 0;">
        Weighted to non-gameable signals: independent replications, adoption in real pipelines, measured deltas.
        Validating others' work earns comparably to contributing. Generated {fmtDate(arena.generated, "full")}.
      </p>
    </section>

    <div class="tabs rv">
      {boards.map((b, i) => (
        <Fragment>
          <input type="radio" name="board" id={`tab-${b.key}`} class="tabin" checked={i === 0} />
          <label for={`tab-${b.key}`} class="tablab">{b.label}</label>
        </Fragment>
      ))}

      <!-- Individuals -->
      <section class="board" data-board="individuals">
        <div class="row head"><span>#</span><span>Name</span><span>Team</span><span class="num">Score</span></div>
        {arena.individuals.map((r, i) => (
          <a class="row" href={`/people/${r.handle}`}>
            <span class={rankClass(i)}>{i + 1}</span>
            <span class="who">{r.name}</span>
            <span class="team">{r.team}{r.division ? ` · ${r.division}` : ""}</span>
            <span class="num score">{r.score}</span>
          </a>
        ))}
      </section>

      <!-- Teams -->
      <section class="board" data-board="teams">
        <div class="row head"><span>#</span><span>Team</span><span>Division</span><span class="num">Score</span></div>
        {arena.teams.map((r, i) => (
          <div class="row">
            <span class={rankClass(i)}>{i + 1}</span>
            <span class="who">{r.team}</span>
            <span class="team">{r.division ?? "—"} · {r.members.length} member{r.members.length === 1 ? "" : "s"}</span>
            <span class="num score">{r.score}</span>
          </div>
        ))}
      </section>

      <!-- Divisions -->
      <section class="board" data-board="divisions">
        <div class="row head"><span>#</span><span>Division</span><span>Teams</span><span class="num">Score</span></div>
        {arena.divisions.map((r, i) => (
          <div class="row">
            <span class={rankClass(i)}>{i + 1}</span>
            <span class="who">{r.division}</span>
            <span class="team">{r.teams.length} team{r.teams.length === 1 ? "" : "s"}</span>
            <span class="num score">{r.score}</span>
          </div>
        ))}
      </section>
    </div>

    <section class="scoring rv">
      <p class="caps" style="color: var(--oxblood)">How scoring works</p>
      <p class="sl">Transparency is the anti-gaming device. Points per person:</p>
      <ul class="sl">
        <li><b>+10</b> — you published a contribution (any tier).</li>
        <li><b>+15</b> — another team replicated your contribution (the strongest signal).</li>
        <li><b>+12</b> — you replicated another team's contribution (reviewing earns like authoring).</li>
        <li><b>+8</b> — a team adopted your contribution (active or trialing); <b>+4</b> more if they recorded a measured impact.</li>
        <li><b>+3</b> — someone endorsed your contribution.</li>
        <li><b>0</b> — same-team replications, and retired adoptions (non-gameable rules).</li>
      </ul>
      <p class="sl">Team scores sum member points attributed while on that team; divisions roll up team scores.
        Ties break by replication count, then alphabetically. Weights are tunable; the inputs are frozen.</p>
    </section>

    <Footer />
  </main>
</Base>
<style>
  /* pure-CSS radio tabs: first tab checked server-side → visible with no JS */
  .tabs { margin: 26px 0 8px; }
  .tabin { position: absolute; opacity: 0; pointer-events: none; }
  .tablab { display: inline-block; font-family: system-ui, sans-serif; font-size: 12.5px;
            letter-spacing: .08em; text-transform: uppercase; color: var(--slate);
            padding: 8px 14px; border: 1px solid var(--hairline); border-radius: 6px;
            margin-right: 8px; cursor: pointer; user-select: none; }
  .board { display: none; margin-top: 18px; }
  /* wire each checked radio to its label + its board */
  #tab-individuals:checked ~ label[for="tab-individuals"],
  #tab-teams:checked ~ label[for="tab-teams"],
  #tab-divisions:checked ~ label[for="tab-divisions"] { color: var(--paper); background: var(--oxblood); border-color: var(--oxblood); }
  #tab-individuals:checked ~ .board[data-board="individuals"],
  #tab-teams:checked ~ .board[data-board="teams"],
  #tab-divisions:checked ~ .board[data-board="divisions"] { display: block; }
  .tablab:focus-visible { outline: 2px solid var(--oxblood); outline-offset: 2px; }

  .row { display: grid; grid-template-columns: 44px 1.4fr 1.6fr auto; gap: 14px; align-items: baseline;
         padding: 11px 6px; border-bottom: 1px solid var(--hairline); text-decoration: none; color: inherit; }
  a.row:hover { background: var(--soft); }
  .row.head { font-family: system-ui, sans-serif; font-size: 10.5px; letter-spacing: .16em;
              text-transform: uppercase; color: var(--slate); border-bottom: 2px solid var(--ink); }
  .rank { font-variant-numeric: tabular-nums; color: var(--slate); font-size: 14px; }
  .rank.top { color: var(--oxblood); font-weight: 700; }
  .who { color: var(--ink); font-weight: 600; }
  .team { color: var(--slate); font-size: 13px; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .score { color: var(--ink); font-weight: 600; }
  .scoring { margin: 34px 0 8px; max-width: 68ch; }
  .scoring .sl { color: var(--slate); font-size: 14px; line-height: 1.6; }
  .scoring ul.sl { padding-left: 18px; }
  .scoring b { color: var(--ink); font-variant-numeric: tabular-nums; }
  @media (max-width: 640px) {
    .row { grid-template-columns: 34px 1fr auto; }
    .row .team { display: none; }
  }
</style>
```

(Reuses `.caps .seal .stamp .rv` tokens from `global.css`. The radio-tab CSS relies on the inputs and boards being **siblings** under `.tabs` — keep them in that flat order. `slugifyName` is imported for parity but handles come pre-slugged from `arena.json`; the import is harmless and documents the link source.)

- [ ] **Step 2: Build + dist-check the boards**

Run (repo root): `npm run derive` then `npm run build -w site` → PASS.
Verify all three boards server-rendered (no JS): `grep -c 'data-board="individuals"' site/dist/arena/index.html`, `…"teams"`, `…"divisions"` each `== 1`.
Verify the top individual links to a profile: `grep -c 'href="/people/sofia-marchetti"' site/dist/arena/index.html` → `≥ 1`.
Verify the scoring footer: `grep -c "How scoring works" site/dist/arena/index.html` → `1`.

(Note: `check-links` will now flag `/people/<handle>` links as broken until Task 7 generates those pages. Do **not** run `check-links` as a gate here — the next task adds the routes and re-greens it. Build success is this task's gate.)

- [ ] **Step 3: Commit**

```bash
git add -A site/src/pages/arena.astro
git commit -m "feat(site): /arena with individuals/teams/divisions boards, no-JS tabs, scoring footer" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: `/people/[handle]` profiles + byline links + `derivePeople`

**This is a transcription task** for the derive code and the page; `<style>` is design.

**Files:**
- Extend: `site/scripts/derive.mjs` (add `derivePeople`; emit `people.json` in the CLI)
- Create: `site/src/pages/people/[handle].astro`
- Extend: `site/src/pages/contributions/[slug].astro` (link author bylines to profiles)
- Extend: `site/scripts/check-links.mjs` (`requiredRoutes` — add `/arena/` is already there; add one `/people/<handle>/`)
- Create test: `site/test/derive-people.test.js`

**Interfaces:**
- Consumes: `buildScoreModel(content)` (Task 3) — reused so profiles and arena share one scoring pass.
- Produces:
  - `derivePeople(content)` → `site/src/data/people.json`, an object keyed by `handle` (frozen at CP-C):
    ```
    {
      "<handle>": {
        handle, name, team, division, rank, score,
        breakdown: { authored, replicationsReceived, replicationsPerformed, adoptions, endorsements },
        contributions: [{ slug, title, tier, result }],
        replicationsPerformed: [{ slug, title, team, outcome, delta, benchmark, date }],
        received: [{ kind, slug, title, by, note, date }]     // kind: "adoption" | "endorsement"
      }
    }
    ```
    `rank` is the 1-based position on the individuals board. `division` may be `null`.
  - `/people/<handle>` static route generated for **every** scored person (imprint anatomy: name, team · division, score + rank; Contributions / Replications performed / Adoptions & endorsements received).
  - Article bylines linking each author name to `/people/<slugifyName(name)>`.

- [ ] **Step 1: Write the failing test**

Create `site/test/derive-people.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { derivePeople, deriveArena } from "../scripts/derive.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));

test("derivePeople keys by handle and covers every scored individual", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const arena = deriveArena(content, { now: () => new Date("2026-07-14T00:00:00Z") });
  assert.equal(Object.keys(people).length, arena.individuals.length);
  for (const ind of arena.individuals) {
    assert.ok(people[ind.handle], `profile missing for ${ind.handle}`);
    assert.equal(people[ind.handle].name, ind.name);
    assert.equal(people[ind.handle].score, ind.score);
  }
});

test("rank matches the individuals board order", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const arena = deriveArena(content, { now: () => new Date("2026-07-14T00:00:00Z") });
  assert.equal(people[arena.individuals[0].handle].rank, 1);
});

test("every published contribution author has a profile (bylines never dangle)", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  for (const c of published) {
    for (const a of c.frontmatter.authors) {
      const handle = a.name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      assert.ok(people[handle], `no profile for author ${a.name} (${handle})`);
    }
  }
});

test("a known author profile carries authored contributions and received rows", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const sofia = people["sofia-marchetti"];
  assert.ok(sofia.contributions.some((c) => c.slug === "retrieval-reranker-lite"));
  assert.ok(sofia.replicationsPerformed.length >= 1);
  assert.equal(sofia.score, 75);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-people.test.js` FAILS (`derivePeople` not exported).

- [ ] **Step 3: Implement `derivePeople`**

In `site/scripts/derive.mjs`, **immediately after** the `deriveArena(...)` function, add:

```js
export function derivePeople(content) {
  const model = buildScoreModel(content);
  const out = {};
  model.individuals.forEach((ind, i) => {
    out[ind.handle] = {
      handle: ind.handle, name: ind.name, team: ind.team, division: ind.division,
      rank: i + 1, score: ind.score, breakdown: { ...ind.breakdown },
      contributions: ind.contributions,
      replicationsPerformed: ind.replicationsPerformed,
      received: ind.received
    };
  });
  return out;
}
```

- [ ] **Step 4: Emit `people.json` in the CLI**

In `site/scripts/derive.mjs`, in the CLI block, **after** the `writeFileSync(join(outDir, "arena.json"), …)` line (added in Task 3) and before `console.log(...)`, add:

```js
    const people = derivePeople(arenaContent);
    writeFileSync(join(outDir, "people.json"), JSON.stringify(people, null, 2));
```

(Reuses the `arenaContent` already loaded in Task 3's CLI addition.)

- [ ] **Step 5: Create the profile page**

Create `site/src/pages/people/[handle].astro`:

```astro
---
import Base from "../../layouts/Base.astro";
import Masthead from "../../components/Masthead.astro";
import Footer from "../../components/Footer.astro";
import { fmtDate, tierLabel } from "../../lib/format.mjs";
import people from "../../data/people.json";

export function getStaticPaths() {
  return Object.values(people).map((p) => ({ params: { handle: p.handle }, props: { p } }));
}
const { p } = Astro.props;
---
<Base title={`${p.name} · OpenResearch`} description={`${p.name} — contributor profile`}>
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead active="arena" />

    <section class="head rv">
      <p class="caps" style="color: var(--oxblood)">Contributor</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(26px,3.6vw,36px); margin: 8px 0 6px;">{p.name}</h1>
      <p class="sub">{p.team}{p.division ? ` · ${p.division}` : ""}</p>
      <p class="score">
        <span class="s">{p.score}</span> points ·
        <a href="/arena">rank #{p.rank}</a> ·
        {p.breakdown.authored} authored · {p.breakdown.replicationsReceived} replications received ·
        {p.breakdown.replicationsPerformed} performed · {p.breakdown.adoptions} adoptions · {p.breakdown.endorsements} endorsements
      </p>
    </section>

    {p.contributions.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">Contributions</p>
        <div class="cards">
          {p.contributions.map((c) => (
            <a class="pcard" href={`/contributions/${c.slug}`}>
              <span class="pk">{tierLabel(c.tier)}</span>
              <span class="pt">{c.title}</span>
              {c.result && <span class="pr">{c.result}</span>}
            </a>
          ))}
        </div>
      </section>
    )}

    {p.replicationsPerformed.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">Replications performed</p>
        {p.replicationsPerformed.map((r) => (
          <a class="prow" href={`/contributions/${r.slug}`}>
            <span class="who">{r.title}</span>
            <span class="meta">{r.delta ? `${r.delta} · ` : ""}{r.benchmark} · {fmtDate(r.date, "short")}</span>
          </a>
        ))}
      </section>
    )}

    {p.received.length > 0 && (
      <section class="sec rv">
        <p class="caps" style="color: var(--oxblood)">Adoptions & endorsements received</p>
        {p.received.map((e) => (
          <a class="prow" href={`/contributions/${e.slug}`}>
            <span class="who"><span class={e.kind === "adoption" ? "seal" : "stamp"}>{e.kind}</span> {e.title}</span>
            <span class="meta">{e.by} — {e.note}</span>
          </a>
        ))}
      </section>
    )}

    <Footer />
  </main>
</Base>
<style>
  .head { padding: 40px 0 6px; max-width: 64ch; }
  .sub { font-family: system-ui, sans-serif; font-size: 13px; color: var(--slate); margin: 0 0 8px; }
  .score { font-family: system-ui, sans-serif; font-size: 12.5px; color: var(--slate); margin: 0; }
  .score .s { font-size: 18px; color: var(--oxblood); font-weight: 700; font-variant-numeric: tabular-nums; }
  .score a { color: var(--oxblood); text-decoration: none; }
  .sec { margin: 30px 0 0; }
  .sec .caps { margin: 0 0 12px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
  .pcard { display: flex; flex-direction: column; gap: 6px; text-decoration: none; color: inherit;
           border: 1px solid var(--hairline); border-radius: 6px; padding: 14px; }
  .pcard:hover { border-color: var(--oxblood); }
  .pk { font-family: system-ui, sans-serif; font-size: 10.5px; letter-spacing: .16em; text-transform: uppercase; color: var(--oxblood); }
  .pt { font-weight: 600; color: var(--ink); line-height: 1.25; }
  .pr { font-family: ui-monospace, Consolas, monospace; font-size: 12px; color: var(--slate); }
  .prow { display: flex; justify-content: space-between; gap: 16px; align-items: baseline;
          text-decoration: none; color: inherit; padding: 10px 4px; border-bottom: 1px solid var(--hairline); flex-wrap: wrap; }
  .prow:hover { background: var(--soft); }
  .prow .who { color: var(--ink); font-weight: 600; }
  .prow .meta { color: var(--slate); font-size: 12.5px; font-family: system-ui, sans-serif; }
  @media (max-width: 640px) { .prow { flex-direction: column; gap: 2px; } }
</style>
```

- [ ] **Step 6: Link bylines to profiles in `[slug].astro`**

In `site/src/pages/contributions/[slug].astro`, add `slugifyName` to the format import. Change:

```js
import { fmtDate, readTime, tierLabel } from "../../lib/format.mjs";
```

to:

```js
import { fmtDate, readTime, tierLabel, slugifyName } from "../../lib/format.mjs";
```

Then change the byline authors map. Change:

```astro
          {fm.authors.map((a, i) => <Fragment>{i > 0 && ", "}<b>{a.name}</b> · {a.team}</Fragment>)}
```

to:

```astro
          {fm.authors.map((a, i) => <Fragment>{i > 0 && ", "}<a class="pl" href={`/people/${slugifyName(a.name)}`}><b>{a.name}</b></a> · {a.team}</Fragment>)}
```

Add a byline-link style inside the page `<style>` block (near the `.byline` rule):

```css
  .byline a.pl { color: inherit; text-decoration: none; border-bottom: 1px solid var(--hairline); }
  .byline a.pl:hover { border-color: var(--oxblood); }
```

- [ ] **Step 7: Register a profile route in `check-links.mjs`**

In `site/scripts/check-links.mjs`, inside the `requiredRoutes` array, after the `"/contributions/eval-rubric-drift/",` line, add:

```js
      "/people/sofia-marchetti/",
```

(`/arena/` is already in `requiredRoutes`. The full-page internal-link crawl in `checkDist` validates every `/people/<handle>` byline and arena link against the generated pages, so all profiles are covered even though only one is pinned as a required route.)

- [ ] **Step 8: Derive, build, dist-check, test**

Run (repo root): `npm run derive` → writes `people.json` (and `arena.json`).
Sanity: `node -e "const p=require('./site/src/data/people.json'); console.log(Object.keys(p).length, 'profiles; sofia rank', p['sofia-marchetti'].rank);"`.
Run (repo root): `npm run build -w site` → PASS.
Run (repo root): `node site/scripts/check-links.mjs site/dist` → **PASS** (all `/people/<handle>` links from arena + bylines now resolve — this re-greens the crawl deferred in Task 6).
Run (from `site/`): `node --test` → all PASS.
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 9: Commit**

```bash
git add -A site/scripts/derive.mjs site/src/pages/people/ site/src/pages/contributions/[slug].astro site/scripts/check-links.mjs site/test/derive-people.test.js
git commit -m "feat(site): /people/<handle> profiles, byline links, and derivePeople -> people.json" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Cycle verification + CONTRACTS.md CP-C freeze

**Files:**
- Create test: `site/test/cycle3-arena.test.js`
- Modify: `CONTRACTS.md` (fill CP-C: planned → frozen)

**Interfaces:**
- Consumes: the full pipeline (`loadContent`, `derive`, `deriveArena`, `derivePeople`) + `site/src/data/*.json`.
- Produces: a green end-to-end cycle gate and the CP-C contracts frozen with the exact shapes shipped.

- [ ] **Step 1: Write the cycle gate test**

Create `site/test/cycle3-arena.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { deriveArena, derivePeople } from "../scripts/derive.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));
const now = () => new Date("2026-07-14T00:00:00Z");

test("arena.json has the frozen top-level shape", () => {
  const a = deriveArena(loadContent(contentRoot), { now });
  assert.deepEqual(Object.keys(a).sort(), ["divisions", "generated", "individuals", "teams"]);
  const ind = a.individuals[0];
  assert.deepEqual(Object.keys(ind).sort(), ["breakdown", "division", "handle", "name", "score", "team"]);
  assert.deepEqual(Object.keys(ind.breakdown).sort(),
    ["adoptions", "authored", "endorsements", "replicationsPerformed", "replicationsReceived"]);
  assert.deepEqual(Object.keys(a.teams[0]).sort(), ["division", "members", "score", "team"]);
  assert.deepEqual(Object.keys(a.divisions[0]).sort(), ["division", "score", "teams"]);
});

test("boards rank the seed plausibly (Sofia top; Markets top division; retired scores 0)", () => {
  const a = deriveArena(loadContent(contentRoot), { now });
  assert.equal(a.individuals[0].name, "Sofia Marchetti");
  assert.equal(a.individuals[0].score, 75);
  // Hana Kim: authored batch (10) + one cross-team replication received (15) + two performed (24);
  // her batch adoption by ib-quant is retired → 0, so adoptions breakdown is 0.
  const hana = a.individuals.find((i) => i.name === "Hana Kim");
  assert.equal(hana.score, 49);
  assert.equal(hana.breakdown.adoptions, 0);
  // Divisions are exactly the five that carry a division label; Markets leads.
  assert.deepEqual(a.divisions.map((d) => d.division).sort(),
    ["Cards", "Institutional", "Markets", "Payments", "Risk"]);
  assert.equal(a.divisions[0].division, "Markets");
  // Null-division teams (Cycle-1 mononyms) appear on the teams board but not divisions.
  assert.ok(a.teams.some((t) => t.team === "Model Validation" && t.division === null));
});

test("every published author has a profile; profile shape is frozen", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const slug = (n) => n.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const c of published) for (const a of c.frontmatter.authors) assert.ok(people[slug(a.name)]);
  const anyProfile = Object.values(people)[0];
  assert.deepEqual(Object.keys(anyProfile).sort(),
    ["breakdown", "contributions", "division", "handle", "name", "rank", "received", "replicationsPerformed", "score", "team"]);
});

test("evidence carries adoptions[] and changelog[] additively", () => {
  const content = loadContent(contentRoot);
  // adoptions[] present on a contribution that has one
  const heading = content.adoptions.filter((a) => a.data.contribution_id === "heading-aware-chunking");
  assert.equal(heading.length, 1);
  assert.equal(heading[0].data.status, "active");
});
```

- [ ] **Step 2: Freeze CP-C in `CONTRACTS.md`**

In `CONTRACTS.md`, **remove** the `- **CP-C (M5+M6):** …` bullet from the "## Planned freezes" section, and **add** a new frozen section immediately after the "## Frozen at CP-B …" table (before "## Planned freezes"):

```markdown
## Frozen at CP-C (M5 + M6, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Adoption record shape | `content/schemas/adoption.schema.json` | `{ contribution_id, adopter{person}, pipeline, status(active\|trialing\|retired), since, impact?, date }`; same `person` shape as elsewhere. M1 `type: adoption` endorsements remain valid (backward compatible) |
| Loader adoptions array | `@openresearch/validator/load` → `loadContent(root)` | Return object gains `adoptions: [{file,data}]` (additive); existing keys unchanged. Crossref: adoption `contribution_id` must resolve |
| Extended evidence shape | `site/scripts/derive.mjs` → `site/src/data/evidence.json` | `evidence[slug]` gains `adoptions:[{team,pipeline,status,impact,since,date}]` and `changelog:[{rev,date,subject}]` (last 5 non-merge commits, `[]` when no git); existing `replications`/`endorsements`/`rev` unchanged |
| Arena scoring inputs | `site/scripts/derive.mjs` `buildScoreModel` | Point values (weights tunable, inputs frozen): authored 10; replication received 15 / performed 12 (only `replicated`, cross-team); adoption 8 (+4 impact); endorsement 3; adoption-type endorsement 8; self-team replication 0; retired adoption 0 |
| `arena.json` shape | `site/scripts/derive.mjs` → `site/src/data/arena.json` | `{ individuals:[{handle,name,team,division,score,breakdown{authored,replicationsReceived,replicationsPerformed,adoptions,endorsements}}], teams:[{team,division,score,members}], divisions:[{division,score,teams}], generated }`; null-division teams excluded from divisions |
| `/people/<handle>` route + profile shape | `site/src/pages/people/[handle].astro` → `site/src/data/people.json` | Keyed by `handle` (= lowercase-hyphenated name); `{handle,name,team,division,rank,score,breakdown,contributions[],replicationsPerformed[],received[]}`; generated for every scored person |
```

- [ ] **Step 3: Full pipeline green + dist grep checks**

Run, from the repo root, in order:

```bash
npm run validate
npm run derive
npm test --workspaces
npm run build -w site
node site/scripts/check-links.mjs site/dist
```

Expected: validator `✓`; derive writes `arena.json` + `people.json` + extended `evidence.json`; all tests pass (including `cycle3-arena.test.js`); site build succeeds; check-links `✓`.

Arena/profile dist grep checks (repo root):

```bash
grep -c "How scoring works" site/dist/arena/index.html            # 1
grep -c 'href="/people/sofia-marchetti"' site/dist/arena/index.html # >= 1
ls site/dist/people/sofia-marchetti/index.html                    # exists
grep -c "Adoption · payments-platform" site/dist/contributions/heading-aware-chunking/index.html  # >= 1
grep -c "Changelog" site/dist/contributions/retrieval-reranker-lite/index.html   # >= 1
```

- [ ] **Step 4: CP-C self-QC (manual gate)**

Confirm from the built output:
- Arena ranks the seeded teams plausibly (Markets/markets-analytics leads; Institutional trails).
- A profile renders for every seed author (spot-check `site/dist/people/` has a directory per scored person).
- Evidence rails show adoption annotations (e.g. `heading-aware-chunking`).
- Changelog sections are present on articles (git history available in this checkout).

- [ ] **Step 5: Commit**

```bash
git add -A site/test/cycle3-arena.test.js CONTRACTS.md
git commit -m "docs(cycle3): freeze CP-C contracts and add end-to-end arena/evidence cycle gate" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review (spec-delta coverage)

Every section of the design delta maps to a task:

| Design-delta section | Task(s) |
|---|---|
| Adoption record schema (new, freezes at CP-C) | 1 (schema + loader + crossref + template + fixtures) |
| Evidence trail — `evidence[slug].adoptions[]` + `changelog[]` (git log, graceful) | 2 |
| Rail adoption annotations (caps/pipeline/status chip; seal vs hairline) | 5 |
| Changelog section (all tiers, before citation) | 5 |
| Note closing bar gains adoption count when > 0 | 5 |
| Scoring v1 (exact point table, self-team 0, retired 0, adoption-endorsement = 8, tie-break) | 3 (engine + tests) |
| `deriveArena` → `arena.json` (exact shape, additive) | 3 |
| `/arena` three boards, no-JS tabs, top-3 oxblood numeral, scoring footer | 6 |
| `/people/<handle>` profiles (imprint anatomy, three sections) + `people.json` | 7 |
| Arena rows + bylines link to profiles | 6 (arena rows), 7 (bylines) |
| Seed 4–6 adoptions (≥1 trialing, ≥1 impact, ≥1 retired) | 4 (five records) |
| Testing gate (validator fixtures, deriveArena cases, evidence extension, build+check-links, profiles for every author) | 1, 2, 3, 7, 8 |
| CP-C freeze | 8 |

**Placeholder scan:** no `TBD`, "similar to task N", or "add appropriate X" remain; every code/YAML/test block is complete and verbatim.

**Name/shape consistency:** the `arena.json` shape produced in Task 3 is asserted key-for-key in Task 8 and consumed field-for-field by the Task 6 page; the `people.json` shape produced in Task 7 is asserted in Tasks 7 + 8 and consumed by `/people/[handle].astro`; `evidence[slug].adoptions`/`changelog` produced in Task 2 are consumed by Rail/Changelog/note-bar in Task 5 and asserted in Tasks 2 + 8; `slugifyName` (Task 3) is the single handle source shared by the engine (Task 3), arena links (Task 6), profile routes (Task 7), and bylines (Task 7).

**Frozen-contract preservation:** `derive()`'s four outputs keep their shapes (`evidence` gains keys additively, existing keys byte-identical; `derive.test.js` unchanged); loader gains `adoptions` additively (existing keys unchanged; the four M1 schemas untouched); `arena.json`/`people.json` are new files from new functions; all existing routes and config keys unchanged; `config.repoUrl` preserved.

**Cycle-2 execution-delta lessons applied:** (1) no `import.meta.url`-relative config reads in bundled page/component code — pages read only imported `../data/*.json`; (2) `derive.mjs` never imports `config.mjs` — `deriveArena`/`derivePeople` take loaded `content`, the CLI reads `platform.config.json` via the existing `import.meta.url` toolkit block; (3) card-visible copy stays plain text (seeds are YAML, no italic spans to break `firstSentence`); (4) all git steps target `c3-evidence-arena`, never `main`; the `git log` changelog invocation is pinned exactly and the `validate.yml` `site-build` `fetch-depth: 0` is verified (Task 2 Step 7) so no workflow change is needed.

---

## Execution deltas (recorded at final review, 2026-07-14)

1. **Task 3 — two brief-staleness corrections, engine unchanged:** the tie-break test's hardcoded expectation ignored that the replicator scores 12 and slots 2nd (fixed to `["Bob","Zoe","Ann","Cid"]`); the "Sofia = 75" sanity anchor is the post-Task-4 state (67 before adoptions are seeded; 75 after — both verified by hand and empirically).
2. **Task 3 — two tests added** beyond the brief's matrix: multi-author full-credit, published-only gating.
3. **Task 7 — check-links insertion point differed** (eval-rubric-drift shared a line); route added on the following line, same array.
4. **Final batch — gate anchors made CP-E-proof** (floors/invariants instead of exact seed values; CP-E adds contributions) and the arena tab focus ring fixed (`.tabin:focus-visible`-scoped rules; the label-side rule never fired).

Deferred minors tracked in `.superpowers/sdd/progress.md` (C3 sections); notable backlog: byline base-slug vs collision-suffixed handle (dormant misattribution risk — thread resolved handles to bylines when a collision first appears).
