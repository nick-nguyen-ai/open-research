# M1 — Schemas, Content Structure & CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the OpenResearch content contract — JSON Schemas, content directory structure, contribution templates, a Node validation CLI (schema/template/link/secrets checks), and the blocking CI workflow (features F1 + F4).

**Architecture:** Monorepo (`content/`, later `site/` and `toolkit/`). All validation logic lives in one npm workspace at `content/validator/` so it travels with the content repo when split. Rules are small modules sharing one loaded-content object; CI and (later) the `publish` skill call the same CLI. Schemas in `content/schemas/` are the public API — deliberately standalone (no cross-file `$ref`s) so any thin client can consume one schema file in isolation.

**Tech Stack:** Node ≥20, ESM JavaScript (no build step), `node:test` built-in runner, Ajv (draft-07) + ajv-formats, gray-matter (markdown frontmatter), yaml (record files). CI: GitHub Actions + gitleaks.

## Global Constraints

- Node `>=20`; `"type": "module"` everywhere; no TypeScript, no build step.
- Runtime dependencies limited to: `ajv`, `ajv-formats`, `gray-matter`, `yaml`. Test framework is built-in `node:test` + `node:assert/strict`.
- Every finding object has exactly the shape `{ file: string, rule: string, message: string }`.
- The validator makes **no network calls** (external URLs are format-checked only).
- All paths handled with `node:path` / `fileURLToPath` — must work on Windows (dev machine) and Linux (CI).
- Contribution tiers (exact strings): `finding`, `technical-report`, `tutorial`, `note`.
- ID/slug pattern everywhere: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Blocking CI is mechanical only — no LLM calls anywhere in this milestone (spec quality-model rule 1).
- Commit after every task.

## Roadmap context (not part of this plan)

This is milestone M1 of the design (`docs/superpowers/specs/2026-07-13-openresearch-prototype-design.md`). Later milestones — M2 site MVP, M3 toolkit v1, M4 seed content, M5 records + evidence trail, M6 arena + profiles, M7 Q&A MCP, M8 watchlist/benchmarks/discussions/digest — each get their own implementation plan written when they start. M1 deliberately creates the replication/endorsement/benchmark schemas now (they are the public contract) even though their consuming features arrive in M5+. The F4 "build passes" gate is added to CI in M2 when a site build exists.

---

### Task 1: Repo scaffolding, schema loader, contribution schema

**Files:**
- Create: `package.json` (repo root)
- Create: `.gitignore`
- Create: `platform.config.json`
- Create: `content/validator/package.json`
- Create: `content/schemas/contribution.schema.json`
- Create: `content/validator/src/schemas.js`
- Test: `content/validator/test/schemas.test.js`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `getValidator(name: string) => AjvValidateFunction` and `formatErrors(errors) => string` from `src/schemas.js`; the contribution frontmatter contract. `getValidator` throws `Error` for unknown names. Schema files are keyed by basename: `getValidator("contribution")` loads `content/schemas/contribution.schema.json`.

- [ ] **Step 1: Scaffold the workspace**

Create `package.json` (repo root):

```json
{
  "name": "openresearch",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "workspaces": ["content/validator"],
  "scripts": {
    "validate": "node content/validator/bin/validate.js",
    "test": "npm test --workspaces"
  }
}
```

Create `.gitignore`:

```
node_modules/
dist/
*.log
```

Create `platform.config.json` (the portability seam — nothing consumes it yet; CBA port edits only this file):

```json
{
  "name": "OpenResearch",
  "ghHost": "github.com",
  "repos": { "content": ".", "site": ".", "toolkit": "." },
  "modelProvider": "claude-code-session"
}
```

Create `content/validator/package.json`:

```json
{
  "name": "@openresearch/validator",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": { "test": "node --test test/" },
  "dependencies": {
    "ajv": "^8.17.0",
    "ajv-formats": "^3.0.1",
    "gray-matter": "^4.0.3",
    "yaml": "^2.5.0"
  }
}
```

Run: `npm install`
Expected: completes without error; `package-lock.json` created at root.

- [ ] **Step 2: Write the failing test**

Create `content/validator/test/schemas.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator, formatErrors } from "../src/schemas.js";

const valid = {
  id: "prompt-cache-evals",
  title: "Prompt caching cut our eval suite cost by 60%",
  tier: "finding",
  authors: [{ name: "Nick", team: "Model Validation" }],
  category: "evals",
  tags: ["caching", "cost"],
  status: "published",
  created: "2026-07-13",
  updated: "2026-07-13"
};

test("accepts valid contribution frontmatter", () => {
  assert.equal(getValidator("contribution")(valid), true);
});

test("rejects unknown tier", () => {
  assert.equal(getValidator("contribution")({ ...valid, tier: "paper" }), false);
});

test("rejects missing required field", () => {
  const { title, ...rest } = valid;
  const v = getValidator("contribution");
  assert.equal(v(rest), false);
  assert.match(formatErrors(v.errors), /title/);
});

test("rejects author without team", () => {
  assert.equal(
    getValidator("contribution")({ ...valid, authors: [{ name: "Nick" }] }),
    false
  );
});

test("throws for unknown schema name", () => {
  assert.throws(() => getValidator("nope"), /No schema/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/schemas.js`.

- [ ] **Step 4: Write the schema and loader**

Create `content/schemas/contribution.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Contribution frontmatter",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "tier", "authors", "category", "tags", "status", "created", "updated"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$", "maxLength": 80 },
    "title": { "type": "string", "minLength": 8, "maxLength": 120 },
    "tier": { "enum": ["finding", "technical-report", "tutorial", "note"] },
    "authors": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/person" } },
    "category": { "enum": ["evals", "prompting", "agents", "rag", "fine-tuning", "tooling", "governance", "other"] },
    "tags": {
      "type": "array",
      "items": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
      "maxItems": 10,
      "uniqueItems": true
    },
    "status": { "enum": ["draft", "published", "superseded"] },
    "created": { "type": "string", "format": "date" },
    "updated": { "type": "string", "format": "date" },
    "replication_bundle": { "type": "string", "pattern": "^bundle/" },
    "benchmarks": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" } },
    "related": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "internal": { "type": "array", "items": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" } },
        "external": { "type": "array", "items": { "type": "string", "format": "uri" } }
      }
    }
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

Create `content/validator/src/schemas.js`:

```js
import { readFileSync, readdirSync } from "node:fs";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const SCHEMA_DIR = new URL("../../schemas/", import.meta.url);

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

const validators = {};
for (const file of readdirSync(SCHEMA_DIR)) {
  if (!file.endsWith(".schema.json")) continue;
  const schema = JSON.parse(readFileSync(new URL(file, SCHEMA_DIR), "utf8"));
  validators[file.replace(".schema.json", "")] = ajv.compile(schema);
}

export function getValidator(name) {
  const v = validators[name];
  if (!v) throw new Error(`No schema named "${name}" in content/schemas/`);
  return v;
}

export function formatErrors(errors) {
  return (errors ?? [])
    .map((e) => `${e.instancePath || "/"} ${e.message}`)
    .join("; ");
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS — 5 tests pass.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .gitignore platform.config.json content/
git commit -m "feat: scaffold monorepo, contribution schema, schema loader"
```

---

### Task 2: Record schemas — replication, endorsement/adoption, benchmark

**Files:**
- Create: `content/schemas/replication.schema.json`
- Create: `content/schemas/endorsement.schema.json`
- Create: `content/schemas/benchmark.schema.json`
- Test: `content/validator/test/record-schemas.test.js`

**Interfaces:**
- Consumes: `getValidator(name)` from Task 1. New names available: `"replication"`, `"endorsement"`, `"benchmark"`.
- Produces: the three record contracts. The `person` definition is intentionally duplicated per schema file — schemas are standalone public contracts (see Architecture).

- [ ] **Step 1: Write the failing test**

Create `content/validator/test/record-schemas.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator } from "../src/schemas.js";

const replication = {
  contribution_id: "prompt-cache-evals",
  replicator: { name: "Ada", team: "Payments Engineering" },
  benchmark_id: "internal-eval-suite",
  method: "Re-ran the bundle against our payments eval set with cache enabled.",
  outcome: "replicated",
  measured_delta: "eval cost -55%, latency unchanged",
  date: "2026-07-20"
};

test("accepts valid replication", () => {
  assert.equal(getValidator("replication")(replication), true);
});

test("replication requires benchmark_id or workflow", () => {
  const { benchmark_id, ...rest } = replication;
  const v = getValidator("replication");
  assert.equal(v(rest), false);
  assert.equal(v({ ...rest, workflow: "our internal triage eval harness" }), true);
});

test("rejects replication with unknown outcome", () => {
  assert.equal(getValidator("replication")({ ...replication, outcome: "maybe" }), false);
});

test("accepts valid endorsement and adoption", () => {
  const v = getValidator("endorsement");
  const base = {
    contribution_id: "prompt-cache-evals",
    by: { name: "Grace", team: "Cards" },
    statement: "We adopted this in our nightly eval pipeline last sprint.",
    date: "2026-07-21"
  };
  assert.equal(v({ ...base, type: "endorsement" }), true);
  assert.equal(v({ ...base, type: "adoption", pipeline: "cards-nightly-evals" }), true);
  assert.equal(v({ ...base, type: "like" }), false);
});

test("accepts valid benchmark and rejects one without metrics", () => {
  const v = getValidator("benchmark");
  const bench = {
    id: "internal-eval-suite",
    owner: { name: "Nick", team: "Model Validation" },
    description: "Shared regression eval suite for validation prompts.",
    data_pointer: "ghe://model-validation/eval-suite",
    metrics: [{ name: "accuracy", definition: "exact-match over gold labels", higher_is_better: true }]
  };
  assert.equal(v(bench), true);
  assert.equal(v({ ...bench, metrics: [] }), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `No schema named "replication"`.

- [ ] **Step 3: Write the three schemas**

Create `content/schemas/replication.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Replication record",
  "type": "object",
  "additionalProperties": false,
  "required": ["contribution_id", "replicator", "method", "outcome", "date"],
  "anyOf": [
    { "required": ["benchmark_id"], "properties": { "benchmark_id": {} } },
    { "required": ["workflow"], "properties": { "workflow": {} } }
  ],
  "properties": {
    "contribution_id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "replicator": { "$ref": "#/definitions/person" },
    "benchmark_id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "workflow": { "type": "string", "minLength": 10 },
    "method": { "type": "string", "minLength": 20 },
    "outcome": { "enum": ["replicated", "partial", "failed"] },
    "measured_delta": { "type": "string" },
    "metrics": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "baseline", "treatment"],
        "properties": {
          "name": { "type": "string" },
          "baseline": { "type": "number" },
          "treatment": { "type": "number" }
        }
      }
    },
    "date": { "type": "string", "format": "date" },
    "artifacts": { "type": "string" },
    "notes": { "type": "string" }
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

Create `content/schemas/endorsement.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Endorsement or adoption record",
  "type": "object",
  "additionalProperties": false,
  "required": ["contribution_id", "type", "by", "statement", "date"],
  "properties": {
    "contribution_id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "type": { "enum": ["endorsement", "adoption"] },
    "by": { "$ref": "#/definitions/person" },
    "statement": { "type": "string", "minLength": 20, "maxLength": 1000 },
    "pipeline": { "type": "string" },
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

Create `content/schemas/benchmark.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Benchmark registry entry",
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "owner", "description", "data_pointer", "metrics"],
  "properties": {
    "id": { "type": "string", "pattern": "^[a-z0-9]+(-[a-z0-9]+)*$" },
    "owner": { "$ref": "#/definitions/person" },
    "description": { "type": "string", "minLength": 20 },
    "data_pointer": { "type": "string", "minLength": 1 },
    "metrics": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "definition"],
        "properties": {
          "name": { "type": "string" },
          "definition": { "type": "string", "minLength": 10 },
          "higher_is_better": { "type": "boolean" }
        }
      }
    },
    "access_notes": { "type": "string" }
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

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS — all tests in both files pass.

- [ ] **Step 5: Commit**

```bash
git add content/schemas/ content/validator/test/record-schemas.test.js
git commit -m "feat: add replication, endorsement, benchmark record schemas"
```

---

### Task 3: Content loader

**Files:**
- Create: `content/validator/src/load.js`
- Create: `content/validator/test/fixtures/valid-root/contributions/prompt-cache-evals/index.md`
- Create: `content/validator/test/fixtures/valid-root/records/replications/prompt-cache-evals--payments.yaml`
- Create: `content/validator/test/fixtures/valid-root/benchmarks/internal-eval-suite.yaml`
- Test: `content/validator/test/load.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure FS + parsing).
- Produces: `loadContent(root: string) => Content` where `Content = { root, contributions: [{ dirName, dir, file, frontmatter, body, raw }], replications: [{ file, data }], endorsements: [{ file, data }], benchmarks: [{ file, data }], errors: Finding[] }`. All later rule modules take this `Content` object. Frontmatter `Date` values (js-yaml parses unquoted dates) are normalized to `"YYYY-MM-DD"` strings.

- [ ] **Step 1: Create fixtures**

Create `content/validator/test/fixtures/valid-root/contributions/prompt-cache-evals/index.md`:

```markdown
---
id: prompt-cache-evals
title: Prompt caching cut our eval suite cost by 60%
tier: finding
authors:
  - name: Nick
    team: Model Validation
category: evals
tags: [caching, cost]
status: published
created: 2026-07-13
updated: 2026-07-13
benchmarks: [internal-eval-suite]
---

## Summary

Enabling prompt caching on shared eval prefixes cut cost 60% with identical scores.

## Context

Our nightly eval suite re-sends the same 4k-token system prompt for every case.

## Technique

Mark the shared prefix as cacheable; keep per-case content after the cache breakpoint.

## Evidence

Cost per run dropped from $18.40 to $7.30 across 30 nightly runs. Scores unchanged.

## How to replicate

Run the bundle against any suite with a shared prefix over 1k tokens.
```

Create `content/validator/test/fixtures/valid-root/records/replications/prompt-cache-evals--payments.yaml`:

```yaml
contribution_id: prompt-cache-evals
replicator:
  name: Ada
  team: Payments Engineering
benchmark_id: internal-eval-suite
method: Re-ran the bundle against our payments eval set with cache enabled.
outcome: replicated
measured_delta: eval cost -55%, latency unchanged
date: 2026-07-20
```

Create `content/validator/test/fixtures/valid-root/benchmarks/internal-eval-suite.yaml`:

```yaml
id: internal-eval-suite
owner:
  name: Nick
  team: Model Validation
description: Shared regression eval suite for validation prompts.
data_pointer: ghe://model-validation/eval-suite
metrics:
  - name: accuracy
    definition: exact-match over gold labels
    higher_is_better: true
```

- [ ] **Step 2: Write the failing test**

Create `content/validator/test/load.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "../src/load.js";

const root = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));

test("loads contributions with parsed frontmatter and body", () => {
  const content = loadContent(root);
  assert.equal(content.errors.length, 0);
  assert.equal(content.contributions.length, 1);
  const c = content.contributions[0];
  assert.equal(c.dirName, "prompt-cache-evals");
  assert.equal(c.frontmatter.tier, "finding");
  assert.match(c.body, /## Summary/);
});

test("normalizes unquoted YAML dates to strings", () => {
  const content = loadContent(root);
  assert.equal(content.contributions[0].frontmatter.created, "2026-07-13");
});

test("loads replication and benchmark records", () => {
  const content = loadContent(root);
  assert.equal(content.replications.length, 1);
  assert.equal(content.replications[0].data.outcome, "replicated");
  assert.equal(content.benchmarks.length, 1);
  assert.equal(content.benchmarks[0].data.id, "internal-eval-suite");
});

test("missing directories yield empty arrays, not errors", () => {
  const content = loadContent(root);
  assert.deepEqual(content.endorsements, []);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/load.js`.

- [ ] **Step 4: Write the loader**

Create `content/validator/src/load.js`:

```js
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";

export function loadContent(root) {
  const content = {
    root,
    contributions: [],
    replications: [],
    endorsements: [],
    benchmarks: [],
    errors: []
  };

  const contribDir = join(root, "contributions");
  if (existsSync(contribDir)) {
    for (const name of readdirSync(contribDir)) {
      const dir = join(contribDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const file = join(dir, "index.md");
      if (!existsSync(file)) {
        content.errors.push({
          file: dir,
          rule: "structure",
          message: "contribution directory has no index.md"
        });
        continue;
      }
      try {
        const raw = readFileSync(file, "utf8");
        const { data, content: body } = matter(raw);
        content.contributions.push({
          dirName: name,
          dir,
          file,
          frontmatter: normalizeDates(data),
          body,
          raw
        });
      } catch (err) {
        content.errors.push({
          file,
          rule: "parse",
          message: `frontmatter parse failed: ${err.message}`
        });
      }
    }
  }

  loadYamlDir(content, join(root, "records", "replications"), "replications");
  loadYamlDir(content, join(root, "records", "endorsements"), "endorsements");
  loadYamlDir(content, join(root, "benchmarks"), "benchmarks");
  return content;
}

function loadYamlDir(content, dir, key) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".yaml") && !name.endsWith(".yml")) continue;
    const file = join(dir, name);
    try {
      content[key].push({ file, data: parseYaml(readFileSync(file, "utf8")) });
    } catch (err) {
      content.errors.push({
        file,
        rule: "parse",
        message: `YAML parse failed: ${err.message}`
      });
    }
  }
}

// gray-matter (js-yaml, YAML 1.1) turns unquoted dates into Date objects;
// the schemas expect "YYYY-MM-DD" strings.
function normalizeDates(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) value[k] = normalizeDates(v);
  }
  return value;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content/validator/src/load.js content/validator/test/
git commit -m "feat: content loader with date normalization and parse-error findings"
```

---

### Task 4: Schema validation rule

**Files:**
- Create: `content/validator/src/rules/schema.js`
- Test: `content/validator/test/rule-schema.test.js`

**Interfaces:**
- Consumes: `Content` shape (Task 3), `getValidator`/`formatErrors` (Task 1).
- Produces: `check(content: Content) => Finding[]` — every rule module from here on exports exactly this signature. Also enforces `frontmatter.id === dirName`.

- [ ] **Step 1: Write the failing test**

Create `content/validator/test/rule-schema.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/rules/schema.js";

const goodFm = {
  id: "prompt-cache-evals",
  title: "Prompt caching cut our eval suite cost by 60%",
  tier: "finding",
  authors: [{ name: "Nick", team: "Model Validation" }],
  category: "evals",
  tags: ["caching"],
  status: "published",
  created: "2026-07-13",
  updated: "2026-07-13"
};

function content(overrides = {}) {
  return {
    root: "/fake",
    contributions: [],
    replications: [],
    endorsements: [],
    benchmarks: [],
    errors: [],
    ...overrides
  };
}

test("valid content produces no findings", () => {
  const c = content({
    contributions: [
      { dirName: "prompt-cache-evals", dir: "d", file: "f", frontmatter: goodFm, body: "", raw: "" }
    ]
  });
  assert.deepEqual(check(c), []);
});

test("flags frontmatter that fails the schema", () => {
  const c = content({
    contributions: [
      { dirName: "x", dir: "d", file: "f", frontmatter: { ...goodFm, tier: "paper" }, body: "", raw: "" }
    ]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "schema");
});

test("flags id/directory mismatch", () => {
  const c = content({
    contributions: [
      { dirName: "wrong-name", dir: "d", file: "f", frontmatter: goodFm, body: "", raw: "" }
    ]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /must match directory name/);
});

test("validates records against their schemas", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "x" } }],
    benchmarks: [{ file: "b.yaml", data: { id: "not valid caps" } }]
  });
  const findings = check(c);
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.rule === "schema"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/rules/schema.js`.

- [ ] **Step 3: Write the rule**

Create `content/validator/src/rules/schema.js`:

```js
import { getValidator, formatErrors } from "../schemas.js";

export function check(content) {
  const findings = [];

  const validate = getValidator("contribution");
  for (const c of content.contributions) {
    if (!validate(c.frontmatter)) {
      findings.push({ file: c.file, rule: "schema", message: formatErrors(validate.errors) });
      continue;
    }
    if (c.frontmatter.id !== c.dirName) {
      findings.push({
        file: c.file,
        rule: "schema",
        message: `frontmatter id "${c.frontmatter.id}" must match directory name "${c.dirName}"`
      });
    }
  }

  checkGroup(content.replications, "replication", findings);
  checkGroup(content.endorsements, "endorsement", findings);
  checkGroup(content.benchmarks, "benchmark", findings);
  return findings;
}

function checkGroup(items, schemaName, findings) {
  const validate = getValidator(schemaName);
  for (const item of items) {
    if (!validate(item.data)) {
      findings.push({ file: item.file, rule: "schema", message: formatErrors(validate.errors) });
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add content/validator/src/rules/schema.js content/validator/test/rule-schema.test.js
git commit -m "feat: schema validation rule for contributions and records"
```

---

### Task 5: Contribution templates + template-compliance rule

**Files:**
- Create: `content/templates/finding.md`
- Create: `content/templates/technical-report.md`
- Create: `content/templates/tutorial.md`
- Create: `content/templates/note.md`
- Create: `content/validator/src/rules/template.js`
- Test: `content/validator/test/rule-template.test.js`

**Interfaces:**
- Consumes: `Content` shape.
- Produces: `check(content) => Finding[]` and `REQUIRED_HEADINGS: Record<tier, string[]>` (exported — M3's `publish` skill reads it). Templates are the files contributors copy; the rule enforces their required `##` sections.

- [ ] **Step 1: Write the failing test**

Create `content/validator/test/rule-template.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { check, REQUIRED_HEADINGS } from "../src/rules/template.js";

const body = `
## Summary
Enabling prompt caching on shared eval prefixes cut cost 60% with identical scores.
## Context
Nightly evals re-send the same system prompt.
## Technique
Mark the shared prefix cacheable.
## Evidence
Cost dropped from $18.40 to $7.30 per run.
## How to replicate
Run the bundle against any suite with a shared prefix.
`;

function contribution(tier, bodyText) {
  return {
    root: "/fake",
    contributions: [{ dirName: "x", dir: "d", file: "f", frontmatter: { tier }, body: bodyText, raw: "" }],
    replications: [], endorsements: [], benchmarks: [], errors: []
  };
}

test("finding with all required sections passes", () => {
  assert.deepEqual(check(contribution("finding", body)), []);
});

test("finding missing a section is flagged per missing heading", () => {
  const noEvidence = body.replace("## Evidence", "## Proof");
  const findings = check(contribution("finding", noEvidence));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /"## Evidence"/);
});

test("note requires no headings but rejects near-empty body", () => {
  assert.deepEqual(check(contribution("note", "A useful note about prompt caching that is comfortably over the minimum length for a publishable body.")), []);
  const findings = check(contribution("note", "too short"));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /under 100 characters/);
});

test("every tier has a headings entry", () => {
  assert.deepEqual(
    Object.keys(REQUIRED_HEADINGS).sort(),
    ["finding", "note", "technical-report", "tutorial"]
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/rules/template.js`.

- [ ] **Step 3: Write the rule**

Create `content/validator/src/rules/template.js`:

```js
export const REQUIRED_HEADINGS = {
  finding: ["Summary", "Context", "Technique", "Evidence", "How to replicate"],
  "technical-report": ["Abstract", "Background", "Method", "Results", "Discussion", "How to replicate"],
  tutorial: ["What you'll learn", "Prerequisites", "Steps", "Wrap-up"],
  note: []
};

export function check(content) {
  const findings = [];
  for (const c of content.contributions) {
    const required = REQUIRED_HEADINGS[c.frontmatter.tier];
    if (!required) continue; // unknown tier is the schema rule's finding, not ours
    const headings = [...c.body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
    for (const h of required) {
      if (!headings.includes(h)) {
        findings.push({
          file: c.file,
          rule: "template",
          message: `missing required section "## ${h}" for tier "${c.frontmatter.tier}"`
        });
      }
    }
    if (c.body.trim().length < 100) {
      findings.push({
        file: c.file,
        rule: "template",
        message: "body is under 100 characters — add substance before publishing"
      });
    }
  }
  return findings;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS.

- [ ] **Step 5: Create the four template files**

Create `content/templates/finding.md`:

```markdown
---
id: <kebab-case-slug, must equal the directory name>
title: <8-120 chars, state the result, not the topic>
tier: finding
authors:
  - name: <you>
    team: <your team>
category: <evals | prompting | agents | rag | fine-tuning | tooling | governance | other>
tags: [<kebab-case>, <max 10>]
status: draft
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
replication_bundle: bundle/
benchmarks: []
---

## Summary

One paragraph: what you found and the measured effect.

## Context

Where this came up — the workflow, the pain, the scale.

## Technique

What you actually did. Concrete enough to reproduce.

## Evidence

Numbers. Before/after, N runs, which benchmark or workflow.

## How to replicate

Point at the bundle and state what a replicator should expect to see.
```

Create `content/templates/technical-report.md`:

```markdown
---
id: <kebab-case-slug, must equal the directory name>
title: <8-120 chars>
tier: technical-report
authors:
  - name: <you>
    team: <your team>
category: <evals | prompting | agents | rag | fine-tuning | tooling | governance | other>
tags: [<kebab-case>, <max 10>]
status: draft
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
replication_bundle: bundle/
benchmarks: []
---

## Abstract

Three sentences: problem, approach, headline result.

## Background

Prior art, internal context, why existing approaches fell short.

## Method

Design, data, models, parameters. Enough detail to reproduce.

## Results

Tables/numbers with the benchmark or workflow they came from.

## Discussion

Limitations, where it should and shouldn't be applied.

## How to replicate

Point at the bundle and state what a replicator should expect to see.
```

Create `content/templates/tutorial.md`:

```markdown
---
id: <kebab-case-slug, must equal the directory name>
title: <8-120 chars>
tier: tutorial
authors:
  - name: <you>
    team: <your team>
category: <evals | prompting | agents | rag | fine-tuning | tooling | governance | other>
tags: [<kebab-case>, <max 10>]
status: draft
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

## What you'll learn

The capability the reader walks away with.

## Prerequisites

Access, tooling, and background assumed.

## Steps

Numbered, copy-pasteable steps.

## Wrap-up

What they built, where to go next, related contributions.
```

Create `content/templates/note.md`:

```markdown
---
id: <kebab-case-slug, must equal the directory name>
title: <8-120 chars>
tier: note
authors:
  - name: <you>
    team: <your team>
category: <evals | prompting | agents | rag | fine-tuning | tooling | governance | other>
tags: [<kebab-case>, <max 10>]
status: draft
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
---

A note is freeform — one useful observation, gotcha, or pointer.
No required sections; minimum 100 characters of substance.
```

- [ ] **Step 6: Commit**

```bash
git add content/templates/ content/validator/src/rules/template.js content/validator/test/rule-template.test.js
git commit -m "feat: contribution templates and template-compliance rule"
```

---

### Task 6: Cross-reference rule

**Files:**
- Create: `content/validator/src/rules/crossrefs.js`
- Test: `content/validator/test/rule-crossrefs.test.js`

**Interfaces:**
- Consumes: `Content` shape.
- Produces: `check(content) => Finding[]` — verifies every `contribution_id`, `benchmark_id`, `frontmatter.benchmarks[]`, and `related.internal[]` points at something that exists.

- [ ] **Step 1: Write the failing test**

Create `content/validator/test/rule-crossrefs.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { check } from "../src/rules/crossrefs.js";

function content(overrides = {}) {
  return {
    root: "/fake",
    contributions: [
      {
        dirName: "prompt-cache-evals", dir: "d", file: "contrib.md",
        frontmatter: { id: "prompt-cache-evals", benchmarks: ["internal-eval-suite"], related: { internal: [] } },
        body: "", raw: ""
      }
    ],
    replications: [],
    endorsements: [],
    benchmarks: [{ file: "b.yaml", data: { id: "internal-eval-suite" } }],
    errors: [],
    ...overrides
  };
}

test("all references resolving produces no findings", () => {
  assert.deepEqual(check(content()), []);
});

test("replication pointing at unknown contribution is flagged", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "ghost", benchmark_id: "internal-eval-suite" } }]
  });
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "crossref");
  assert.match(findings[0].message, /ghost/);
});

test("unknown benchmark refs are flagged from records and frontmatter", () => {
  const c = content({
    replications: [{ file: "r.yaml", data: { contribution_id: "prompt-cache-evals", benchmark_id: "nope" } }]
  });
  c.contributions[0].frontmatter.benchmarks = ["also-nope"];
  const findings = check(c);
  assert.equal(findings.length, 2);
});

test("unknown related.internal id is flagged", () => {
  const c = content();
  c.contributions[0].frontmatter.related.internal = ["missing-friend"];
  const findings = check(c);
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /missing-friend/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/rules/crossrefs.js`.

- [ ] **Step 3: Write the rule**

Create `content/validator/src/rules/crossrefs.js`:

```js
export function check(content) {
  const findings = [];
  const contributionIds = new Set(content.contributions.map((c) => c.frontmatter.id));
  const benchmarkIds = new Set(content.benchmarks.map((b) => b.data?.id).filter(Boolean));

  const flag = (file, message) => findings.push({ file, rule: "crossref", message });

  for (const r of [...content.replications, ...content.endorsements]) {
    const id = r.data?.contribution_id;
    if (id && !contributionIds.has(id)) {
      flag(r.file, `contribution_id "${id}" does not match any contribution`);
    }
  }
  for (const r of content.replications) {
    const b = r.data?.benchmark_id;
    if (b && !benchmarkIds.has(b)) {
      flag(r.file, `benchmark_id "${b}" is not in the benchmark registry`);
    }
  }
  for (const c of content.contributions) {
    for (const b of c.frontmatter.benchmarks ?? []) {
      if (!benchmarkIds.has(b)) flag(c.file, `benchmark "${b}" is not in the benchmark registry`);
    }
    for (const rel of c.frontmatter.related?.internal ?? []) {
      if (!contributionIds.has(rel)) flag(c.file, `related.internal "${rel}" does not match any contribution`);
    }
  }
  return findings;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add content/validator/src/rules/crossrefs.js content/validator/test/rule-crossrefs.test.js
git commit -m "feat: cross-reference rule for contribution and benchmark ids"
```

---

### Task 7: Link rule

**Files:**
- Create: `content/validator/src/rules/links.js`
- Create: `content/validator/test/fixtures/valid-root/contributions/prompt-cache-evals/bundle/README.md`
- Test: `content/validator/test/rule-links.test.js`

**Interfaces:**
- Consumes: `Content` shape (uses `c.body`, `c.file`, `c.dir`, `c.frontmatter.replication_bundle`, `content.root`).
- Produces: `check(content) => Finding[]` — relative markdown links must resolve to existing files inside the content root; declared `replication_bundle` directories must exist; external/anchor/mailto links are skipped (no network).

- [ ] **Step 1: Create bundle fixture**

Create `content/validator/test/fixtures/valid-root/contributions/prompt-cache-evals/bundle/README.md`:

```markdown
# Replication bundle

Run `run.md` steps against any eval suite with a shared prompt prefix over 1k tokens.
Expected: cost drops by roughly half; scores unchanged.
```

- [ ] **Step 2: Write the failing test**

Create `content/validator/test/rule-links.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { check } from "../src/rules/links.js";

const root = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));
const dir = join(root, "contributions", "prompt-cache-evals");
const file = join(dir, "index.md");

function contribution(body, frontmatter = {}) {
  return {
    root,
    contributions: [{ dirName: "prompt-cache-evals", dir, file, frontmatter, body, raw: "" }],
    replications: [], endorsements: [], benchmarks: [], errors: []
  };
}

test("resolving relative link and external links pass", () => {
  const body = "See [the bundle](bundle/README.md) and [Anthropic docs](https://docs.anthropic.com) and [top](#summary).";
  assert.deepEqual(check(contribution(body)), []);
});

test("broken relative link is flagged", () => {
  const findings = check(contribution("See [missing](bundle/nope.md)."));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "links");
  assert.match(findings[0].message, /bundle\/nope\.md/);
});

test("link escaping the content root is flagged", () => {
  const findings = check(contribution("See [escape](../../../../../etc/passwd)."));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /escapes/);
});

test("declared replication_bundle must exist", () => {
  assert.deepEqual(check(contribution("body", { replication_bundle: "bundle/" })), []);
  const findings = check(contribution("body", { replication_bundle: "bundle/missing/" }));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /replication_bundle/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/rules/links.js`.

- [ ] **Step 4: Write the rule**

Create `content/validator/src/rules/links.js`:

```js
import { existsSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function check(content) {
  const findings = [];
  const rootAbs = resolve(content.root);

  for (const c of content.contributions) {
    for (const m of c.body.matchAll(LINK_RE)) {
      const target = m[1];
      if (/^(?:https?:)?\/\//i.test(target) || target.startsWith("#") || target.startsWith("mailto:")) {
        continue;
      }
      const targetPath = resolve(dirname(c.file), target.split("#")[0]);
      if (targetPath !== rootAbs && !targetPath.startsWith(rootAbs + sep)) {
        findings.push({ file: c.file, rule: "links", message: `link "${target}" escapes the content directory` });
      } else if (!existsSync(targetPath)) {
        findings.push({ file: c.file, rule: "links", message: `relative link "${target}" does not resolve to a file` });
      }
    }

    const bundle = c.frontmatter.replication_bundle;
    if (bundle && !existsSync(resolve(c.dir, bundle))) {
      findings.push({ file: c.file, rule: "links", message: `replication_bundle "${bundle}" does not exist` });
    }
  }
  return findings;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add content/validator/src/rules/links.js content/validator/test/rule-links.test.js content/validator/test/fixtures/
git commit -m "feat: link rule for relative links and replication bundles"
```

---

### Task 8: Secrets/PII scan rule

**Files:**
- Create: `content/validator/src/rules/secrets.js`
- Create: `content/validator/test/fixtures/secrets-root/contributions/leaky-note/index.md`
- Test: `content/validator/test/rule-secrets.test.js`

**Interfaces:**
- Consumes: `content.root` only (walks the tree itself — bundles contain arbitrary files that aren't in the loaded `Content`).
- Produces: `check(content) => Finding[]` with line numbers in messages. Skips `node_modules`, dot-directories, and `validator/` (tooling + test fixtures live there; the full-repo gitleaks pass in CI covers everything else with its own allowlist).

- [ ] **Step 1: Create leaky fixture**

Create `content/validator/test/fixtures/secrets-root/contributions/leaky-note/index.md` (fake credentials, deliberately detectable):

```markdown
---
id: leaky-note
---

Config we used: aws_access_key_id = AKIAIOSFODNN7EXAMPLE

api_key: "sk-fake-1234567890abcdef"
```

- [ ] **Step 2: Write the failing test**

Create `content/validator/test/rule-secrets.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { check } from "../src/rules/secrets.js";

const leakyRoot = fileURLToPath(new URL("./fixtures/secrets-root/", import.meta.url));
const cleanRoot = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));

const bare = (root) => ({
  root, contributions: [], replications: [], endorsements: [], benchmarks: [], errors: []
});

test("clean tree produces no findings", () => {
  assert.deepEqual(check(bare(cleanRoot)), []);
});

test("AWS key and assigned api_key are flagged with line numbers", () => {
  const findings = check(bare(leakyRoot));
  assert.equal(findings.length, 2);
  assert.ok(findings.every((f) => f.rule === "secrets"));
  assert.match(findings[0].message, /aws-access-key/);
  assert.match(findings[0].message, /line 5/);
  assert.match(findings[1].message, /assigned-secret/);
  assert.match(findings[1].message, /line 7/);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/rules/secrets.js`.

- [ ] **Step 4: Write the rule**

Create `content/validator/src/rules/secrets.js`:

```js
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PATTERNS = [
  { name: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "bearer-token", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  { name: "assigned-secret", re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{12,}["']/i },
  { name: "card-number", re: /\b(?:4[0-9]{3}|5[1-5][0-9]{2})[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}\b/ }
];

const TEXT_EXT = new Set([
  ".md", ".yaml", ".yml", ".json", ".py", ".js", ".ts", ".sh",
  ".txt", ".csv", ".toml", ".cfg", ".ini",
  ".pem", ".key", ".crt", ".pub"
]);

const SKIP_DIRS = new Set(["node_modules", "validator"]);

export function check(content) {
  const findings = [];
  walk(content.root, (file) => {
    if (!TEXT_EXT.has(extname(file))) return;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        if (p.re.test(line)) {
          findings.push({ file, rule: "secrets", message: `possible ${p.name} on line ${i + 1}` });
        }
      }
    });
  });
  return findings;
}

// Skip logic applies to directories only — dot-prefixed FILES (e.g. .env.yaml)
// must still be scanned, since that is exactly where secrets tend to hide.
function walk(dir, fn) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (SKIP_DIRS.has(name) || name.startsWith(".")) continue;
      walk(p, fn);
    } else {
      fn(p);
    }
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w content/validator`
Expected: PASS. (Line 5 = the AWS key line in the fixture; line 7 = the api_key line — if the assertion disagrees, count fixture lines, don't loosen the assertion.)

- [ ] **Step 6: Commit**

```bash
git add content/validator/src/rules/secrets.js content/validator/test/
git commit -m "feat: secrets/PII pattern scan rule"
```

---

### Task 9: Runner, CLI, seed contribution, integration test

**Files:**
- Create: `content/validator/src/runner.js`
- Create: `content/validator/bin/validate.js`
- Create: `content/contributions/prompt-cache-evals/index.md`
- Create: `content/contributions/prompt-cache-evals/bundle/README.md`
- Create: `content/benchmarks/internal-eval-suite.yaml`
- Create: `content/records/replications/prompt-cache-evals--payments.yaml`
- Create: `content/records/endorsements/prompt-cache-evals--cards.yaml`
- Create: `content/validator/test/fixtures/broken-root/…` (see Step 3)
- Test: `content/validator/test/runner.test.js`

**Interfaces:**
- Consumes: `loadContent` (Task 3) and every rule's `check` (Tasks 4–8).
- Produces: `runValidation(root: string) => Finding[]` from `src/runner.js`; executable `bin/validate.js` — args: optional positional root (defaults to `content/`), exit 0 on clean / 1 on findings, one `path  [rule]  message` line per finding on stderr. This CLI is the contract CI (Task 10) and the M3 `publish` skill call.

- [ ] **Step 1: Write the failing runner test**

Create `content/validator/test/runner.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { runValidation } from "../src/runner.js";

const validRoot = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));
const brokenRoot = fileURLToPath(new URL("./fixtures/broken-root/", import.meta.url));

test("valid fixture tree produces no findings", () => {
  assert.deepEqual(runValidation(validRoot), []);
});

test("broken fixture tree reports each expected rule", () => {
  const rules = new Set(runValidation(brokenRoot).map((f) => f.rule));
  for (const expected of ["schema", "template", "crossref", "links", "secrets"]) {
    assert.ok(rules.has(expected), `expected a "${expected}" finding`);
  }
});

test("real repo content validates clean", () => {
  const realRoot = fileURLToPath(new URL("../..", import.meta.url));
  assert.deepEqual(runValidation(realRoot), []);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -w content/validator`
Expected: FAIL — `Cannot find module` for `../src/runner.js`.

- [ ] **Step 3: Create the broken fixture tree**

Create `content/validator/test/fixtures/broken-root/contributions/bad-finding/index.md`
(bad tier → schema; missing Finding sections → template would not fire since tier invalid, so also missing sections is covered by the short body; broken link → links; fake key → secrets):

```markdown
---
id: bad-finding
title: Too short body
tier: paper
authors:
  - name: Sam
    team: Somewhere
category: evals
tags: [oops]
status: published
created: 2026-07-01
updated: 2026-07-01
---

See [missing](nope.md). Key: AKIAIOSFODNN7EXAMPLE
```

Create `content/validator/test/fixtures/broken-root/contributions/short-note/index.md`
(valid schema, tier note, body under 100 chars → template):

```markdown
---
id: short-note
title: A note that is far too short
tier: note
authors:
  - name: Sam
    team: Somewhere
category: other
tags: []
status: published
created: 2026-07-01
updated: 2026-07-01
---

too short
```

Create `content/validator/test/fixtures/broken-root/records/replications/ghost.yaml`
(schema-valid but pointing at a non-existent contribution → crossref):

```yaml
contribution_id: ghost-contribution
replicator:
  name: Ada
  team: Payments Engineering
workflow: our internal triage eval harness
method: Attempted to replicate a contribution that does not exist here.
outcome: failed
date: 2026-07-05
```

- [ ] **Step 4: Write runner and CLI**

Create `content/validator/src/runner.js`:

```js
import { loadContent } from "./load.js";
import * as schemaRule from "./rules/schema.js";
import * as templateRule from "./rules/template.js";
import * as crossrefRule from "./rules/crossrefs.js";
import * as linksRule from "./rules/links.js";
import * as secretsRule from "./rules/secrets.js";

const RULES = [schemaRule, templateRule, crossrefRule, linksRule, secretsRule];

export function runValidation(root) {
  const content = loadContent(root);
  const findings = [...content.errors];
  for (const rule of RULES) {
    findings.push(...rule.check(content));
  }
  return findings;
}
```

Create `content/validator/bin/validate.js`:

```js
#!/usr/bin/env node
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runValidation } from "../src/runner.js";

const defaultRoot = fileURLToPath(new URL("../..", import.meta.url)); // content/
const root = resolve(process.argv[2] ?? defaultRoot);

const findings = runValidation(root);

if (findings.length === 0) {
  console.log(`✓ content validation passed (${root})`);
  process.exit(0);
}

for (const f of findings) {
  console.error(`${relative(process.cwd(), f.file)}  [${f.rule}]  ${f.message}`);
}
console.error(`\n✗ ${findings.length} problem(s) found`);
process.exit(1);
```

- [ ] **Step 5: Create the real seed content**

Create `content/contributions/prompt-cache-evals/index.md`:

```markdown
---
id: prompt-cache-evals
title: Prompt caching cut our eval suite cost by 60%
tier: finding
authors:
  - name: Nick
    team: Model Validation
category: evals
tags: [caching, cost]
status: published
created: 2026-07-13
updated: 2026-07-13
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
---

## Summary

Enabling prompt caching on shared eval prefixes cut cost 60% with identical scores.

## Context

Our nightly eval suite re-sends the same 4k-token system prompt for every case.

## Technique

Mark the shared prefix as cacheable; keep per-case content after the cache breakpoint.

## Evidence

Cost per run dropped from $18.40 to $7.30 across 30 nightly runs. Scores unchanged.

## How to replicate

Follow [the bundle](bundle/README.md) against any suite with a shared prefix over 1k tokens.
```

Create `content/contributions/prompt-cache-evals/bundle/README.md`:

```markdown
# Replication bundle — prompt-cache-evals

1. Pick an eval suite whose system prompt exceeds 1k tokens.
2. Run it twice: once as-is, once with the shared prefix marked cacheable.
3. Record cost per run and score deltas; expect cost to drop by roughly half with scores unchanged.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

Create `content/benchmarks/internal-eval-suite.yaml`:

```yaml
id: internal-eval-suite
owner:
  name: Nick
  team: Model Validation
description: Shared regression eval suite for validation prompts.
data_pointer: ghe://model-validation/eval-suite
metrics:
  - name: accuracy
    definition: exact-match over gold labels
    higher_is_better: true
```

Create `content/records/replications/prompt-cache-evals--payments.yaml`:

```yaml
contribution_id: prompt-cache-evals
replicator:
  name: Ada
  team: Payments Engineering
benchmark_id: internal-eval-suite
method: Re-ran the bundle against our payments eval set with cache enabled.
outcome: replicated
measured_delta: eval cost -55%, latency unchanged
date: 2026-07-20
```

Create `content/records/endorsements/prompt-cache-evals--cards.yaml`:

```yaml
contribution_id: prompt-cache-evals
type: adoption
by:
  name: Grace
  team: Cards
statement: Adopted in our nightly eval pipeline; savings match the reported numbers.
pipeline: cards-nightly-evals
date: 2026-07-21
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -w content/validator`
Expected: PASS — including "real repo content validates clean".

- [ ] **Step 7: Run the CLI both ways**

Run: `npm run validate`
Expected: `✓ content validation passed (…content)` and exit code 0.

Run: `node content/validator/bin/validate.js content/validator/test/fixtures/broken-root`
Expected: one line per finding, `✗ N problem(s) found`, exit code 1.

- [ ] **Step 8: Commit**

```bash
git add content/
git commit -m "feat: validation runner, CLI, seed contribution and records"
```

---

### Task 10: CI workflow, gitleaks config, content README

**Files:**
- Create: `.github/workflows/validate.yml`
- Create: `.gitleaks.toml`
- Create: `content/README.md`

**Interfaces:**
- Consumes: root scripts `npm test --workspaces` / `npm run validate` (Tasks 1, 9).
- Produces: the blocking F4 gate. The M2 plan appends a site-build job to this same workflow.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/validate.yml`:

```yaml
name: validate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test --workspaces
      - run: npm run validate

  secrets-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

- [ ] **Step 2: Write the gitleaks config**

Create `.gitleaks.toml` (the validator's test fixtures contain deliberate fake secrets):

```toml
[extend]
useDefault = true

[allowlist]
paths = ['''content/validator/test/fixtures/''']
```

- [ ] **Step 3: Write the content README**

Create `content/README.md`:

```markdown
# OpenResearch content

This directory is the single source of truth. Everything else — site, arena,
profiles, digest, search index — is derived from it at build time.

## Layout

| Path | What lives here |
|------|-----------------|
| `schemas/` | JSON Schemas — **the public API**. Site, skills, and MCP are thin clients over these contracts. |
| `contributions/<id>/index.md` | One contribution per directory; frontmatter `id` must equal the directory name. Replication bundle under `bundle/`. |
| `records/replications/` | Replication records (YAML), one file per replication. |
| `records/endorsements/` | Endorsement/adoption records (YAML). |
| `benchmarks/` | Shared benchmark registry entries (YAML). |
| `templates/` | Copy one of these to start a contribution (`finding`, `technical-report`, `tutorial`, `note`). |
| `validator/` | The validation CLI used by both CI and the publish skill. |

## Validating locally

From the repo root:

    npm run validate

Checks (all mechanical, all blocking in CI): schema validation, required
template sections, cross-references, relative links, secrets/PII patterns.
CI runs the same CLI plus a full-repo gitleaks scan. An LLM judge never
blocks a merge — that is a design rule, not a gap.
```

- [ ] **Step 4: Verify everything still passes locally**

Run: `npm test --workspaces`
Expected: PASS.
Run: `npm run validate`
Expected: `✓ content validation passed`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add .github/ .gitleaks.toml content/README.md
git commit -m "feat: blocking validate CI workflow, gitleaks config, content docs"
```

---

## Verification (end of milestone)

1. `npm test --workspaces` — all validator tests pass.
2. `npm run validate` — real content tree validates clean.
3. `node content/validator/bin/validate.js content/validator/test/fixtures/broken-root` — exits 1 with schema, template, crossref, links, and secrets findings.
4. Every schema in `content/schemas/` has at least one real instance in the repo (contribution, replication, endorsement, benchmark).
5. `.github/workflows/validate.yml` exists and calls exactly the same commands as steps 1–2 (CI runs unverified until a remote exists — noted, not blocking).
