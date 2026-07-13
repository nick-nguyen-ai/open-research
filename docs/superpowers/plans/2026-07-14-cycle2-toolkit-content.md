# Cycle 2 — M3 Toolkit v1 + M4 Seed Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each task is independently testable and committable; implement them **in order** (dependencies flow forward). Each fresh implementer sees only its own task text, so every task is self-contained.

**Goal:** Ship the OpenResearch contributor toolkit (F5, F6, F7 surface): a standard Claude Code plugin marketplace (`toolkit/`) carrying three advisory SKILL.md skills (`judge`, `paper-reader`, `publish`), a pure-Node `openresearch` installer (`init`/`update`/`doctor`), a `platform.config.json` portability seam wired into the site, a real `/toolkit` marketplace page derived at build time, and six new seed contributions taking the record from 4 → 10 with ≥4 teams across ≥3 divisions — one of them published end-to-end through the `publish` skill's no-remote path.

**Architecture:** `platform.config.json` at the repo root becomes the single portability seam; `site/src/config.mjs` reads it (keeping its `config.repoUrl` export so no page breaks). The toolkit is a normal marketplace: `toolkit/marketplace.json` + `toolkit/plugins/openresearch/` (`.claude-plugin/plugin.json`, `skills/*/SKILL.md`, `mcp/README.md`). Skills are **instruction documents only** — they name exact shell commands and drive the session's own model; no API keys, no provider code. The installer is pure Node with a `--dry-run` command-planning surface that the tests assert. `site/scripts/derive.mjs` gains a `deriveToolkit()` step emitting `site/src/data/toolkit.json`, which the rebuilt `/toolkit` page renders. Six seed contributions plus their records land under `content/`, validated by the frozen M1 validator; derive-layer counts are asserted from `site/src/data/` output.

**Tech Stack:** Node ≥20, pure ESM, no TypeScript; `node:test`; Astro ^5 + Tailwind ^4 (site, unchanged deps); the M1 validator (`@openresearch/validator`, unchanged); `gray-matter` + `yaml` (already vendored) for content. **No new dependencies anywhere**, including the installer (pure `node:*` built-ins only).

## Global Constraints

- Node `>=20`; pure ESM everywhere (`"type": "module"`); **no TypeScript** (`.mjs`/`.js`).
- Test scripts are **bare `node --test`** — never `node --test <dir>` (Node ≥24 breaks on a directory arg; do not "fix" it).
- **No new dependencies** in any `package.json`, including `toolkit/installer` — built-ins only.
- Scripts **fail loudly**: non-zero exit with a `file · field · message`-style line; never silently drop or skip content.
- Site build failure = task failure. The validator must exit 0 and `npm test --workspaces` must be green at every task gate.
- **`platform.config.json` keys are exactly** (spec delta): `name`, `host`, `repo` (null = no-remote), `site.baseUrl`, `judge.ci`, `mcp.enabled`. No other top-level keys.
- **Skills are SKILL.md instruction documents** — no executable code inside a skill; each skill names the exact shell commands it runs so behavior is reproducible.
- **Installer must support `--dry-run`**, which prints the exact `claude`/`gh` command lines it *would* run without executing them — this printed plan is the testable surface.
- **No-remote fallback is first-class** — this machine has no git remote. `platform.config.json.repo` is `null`; every flow that would push/PR instead prints the exact commands for a human to run later.
- Commit messages: conventional prefix + trailer, on every commit:
  ```
  Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
  ```

## Frozen-contract guardrails (do not break)

These are frozen at CP-A (`CONTRACTS.md`). This cycle **adds** to them (CP-B) but must not change any existing shape:

- `derive(contentRoot)` existing outputs — `stats {contributions, replications, teams}`, `cards[]`, `filters{}`, `evidence{}` — stay byte-identical in shape. `toolkit.json` is a **new, additive** derive output emitted by a **separate** `deriveToolkit()` function; the existing `derive()` signature and its four JSON files are untouched, so `site/test/derive.test.js` keeps passing unchanged.
- Routes in `site/src/pages/` are unchanged; `/toolkit` stays a route (its page body is design and may be rewritten).
- `config.mjs` keeps exporting `config.repoUrl` (consumed by `site/src/components/ActionRow.astro`).
- The M1 validator (`content/validator/**`), its schemas, and the loader API are **not touched** in this cycle. All new content passes the existing validator as-is.

## File structure (target additions)

```
platform.config.json                              # NEW — portability seam (Task 1)
toolkit/
├─ marketplace.json                               # Task 3
├─ README.md                                       # Task 11
├─ plugins/openresearch/
│  ├─ .claude-plugin/plugin.json                  # Task 3 (version 0.3.0)
│  ├─ mcp/README.md                               # Task 3 (M7 placeholder)
│  └─ skills/
│     ├─ judge/SKILL.md + walkthrough.md          # Task 4
│     ├─ paper-reader/SKILL.md + walkthrough.md   # Task 5
│     └─ publish/SKILL.md + walkthrough.md        # Task 6
└─ installer/
   ├─ package.json                                # Task 2 (name openresearch, bin openresearch)
   ├─ bin/openresearch.mjs                        # Task 2
   └─ test/openresearch.test.js                   # Task 2
site/
├─ src/config.mjs                                 # REWRITE (Task 1)
├─ scripts/derive.mjs                             # EXTEND — deriveToolkit + CLI emit (Task 7)
├─ scripts/check-links.mjs                        # EXTEND requiredRoutes (Tasks 8–10)
├─ src/pages/toolkit.astro                        # REWRITE — real marketplace page (Task 7)
└─ test/
   ├─ config.test.js                              # Task 1
   ├─ toolkit-scaffold.test.js                    # Task 3
   ├─ derive-toolkit.test.js                      # Task 7
   ├─ cycle2-counts.test.js                       # Task 11
   └─ fixtures/toolkit-root/…                      # Task 7
content/
├─ benchmarks/rerank-eval-set.yaml                # Task 8
├─ contributions/retrieval-reranker-lite/…         # Task 8
├─ contributions/pii-scrubber-prompts/…            # Task 8
├─ contributions/batch-inference-queueing/…        # Task 9
├─ contributions/prompt-regression-harness/…       # Task 9
├─ contributions/context-window-budgeting/…        # Task 10
├─ contributions/eval-rubric-drift/…               # Task 10 (dogfood publish)
└─ records/{replications,endorsements}/…           # Tasks 8–10
README.md                                          # NEW root pointer (Task 11)
CONTRACTS.md                                       # CP-B section filled (Task 11)
```

---

### Task 1: `platform.config.json` + config seam rewire

**This is a transcription task** — the code below is complete; type it verbatim.

**Files:**
- Create: `platform.config.json` (repo root)
- Rewrite: `site/src/config.mjs`
- Test: `site/test/config.test.js`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `platform.config.json` with exactly the six keys the spec defines.
  - `site/src/config.mjs` exports (unchanged public shape plus additions): `config` object still carrying `config.repoUrl` (consumed by `ActionRow.astro`); new exported helper `deriveRepoUrl(platform)`; new export `platformConfig` (the raw parsed object) and derived fields `config.host`, `config.repo`, `config.name`, `config.baseUrl`, `config.judgeCi`, `config.mcpEnabled`.

- [ ] **Step 1: Write the failing test**

Create `site/test/config.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { config, platformConfig, deriveRepoUrl } from "../src/config.mjs";

test("deriveRepoUrl composes host + repo, or null in no-remote mode", () => {
  assert.equal(deriveRepoUrl({ host: "github.com", repo: "org/openresearch" }), "https://github.com/org/openresearch");
  assert.equal(deriveRepoUrl({ host: "ghe.internal", repo: "ai/openresearch" }), "https://ghe.internal/ai/openresearch");
  assert.equal(deriveRepoUrl({ host: "github.com", repo: null }), null);
});

test("config reflects the repo-root platform.config.json (no-remote defaults)", () => {
  assert.equal(platformConfig.name, "OpenResearch");
  assert.equal(config.name, "OpenResearch");
  assert.equal(config.host, "github.com");
  assert.equal(config.repo, null);
  assert.equal(config.repoUrl, null); // no-remote mode
  assert.equal(config.baseUrl, null);
  assert.equal(config.judgeCi, false);
  assert.equal(config.mcpEnabled, false);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `config.test.js` FAILS — `deriveRepoUrl`/`platformConfig` are not exported and `platform.config.json` does not exist yet (import throws).

- [ ] **Step 3: Create `platform.config.json`**

Create `platform.config.json` at the repo root (exact keys — no others):

```json
{
  "name": "OpenResearch",
  "host": "github.com",
  "repo": null,
  "site": { "baseUrl": null },
  "judge": { "ci": false },
  "mcp": { "enabled": false }
}
```

- [ ] **Step 4: Rewrite `site/src/config.mjs`**

Replace the entire file with:

```js
// Portability seam (CP-B): the single source of truth for host/repo/site/judge/mcp.
// Reads platform.config.json at the repo root. config.repoUrl stays the public field
// that ActionRow.astro consumes; it is now derived from host + repo.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const platformPath = fileURLToPath(new URL("../../platform.config.json", import.meta.url));

let platform;
try {
  platform = JSON.parse(readFileSync(platformPath, "utf8"));
} catch (err) {
  throw new Error(`config.mjs: cannot read platform.config.json at ${platformPath}: ${err.message}`);
}

export function deriveRepoUrl(p) {
  return p.repo ? `https://${p.host}/${p.repo}` : null;
}

export const platformConfig = platform;

export const config = {
  name: platform.name,
  host: platform.host,
  repo: platform.repo,
  repoUrl: deriveRepoUrl(platform),
  baseUrl: platform.site?.baseUrl ?? null,
  judgeCi: platform.judge?.ci ?? false,
  mcpEnabled: platform.mcp?.enabled ?? false
};
```

(`../../platform.config.json` resolves from `site/src/config.mjs` up two levels to the repo root.)

- [ ] **Step 5: Run the suite + build**

Run (from `site/`): `node --test` → all PASS.
Run (repo root): `npm test --workspaces` → PASS.
Run (repo root): `npm run build -w site` → PASS (ActionRow still reads `config.repoUrl`, now `null` — bundle links stay relative, unchanged behavior).

- [ ] **Step 6: Commit**

```bash
git add -A platform.config.json site/src/config.mjs site/test/config.test.js
git commit -m "feat(config): platform.config.json portability seam wired into site config" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: Installer package (`openresearch` — init / update / doctor / --dry-run)

**This is a transcription task** — the code below is complete.

**Files:**
- Modify: `package.json` (root) — add `"toolkit/installer"` to `workspaces`
- Create: `toolkit/installer/package.json`, `toolkit/installer/bin/openresearch.mjs`
- Test: `toolkit/installer/test/openresearch.test.js`

**Interfaces:**
- Consumes: `platform.config.json` (Task 1); at runtime `toolkit/plugins/openresearch/.claude-plugin/plugin.json` (Task 3 — not needed for tests, which inject `pluginVersion`).
- Produces (all exported from `bin/openresearch.mjs`): `parseArgs(argv)`, `findRepoRoot(startDir, exists)`, `loadPlatformConfig(repoRoot, read)`, `resolveSource(platform, repoRoot)`, `pluginJsonPath(repoRoot)`, `planInit(source)`, `planUpdate(source, {version, pluginVersion})`, `which(bin, opts)`, `doctor(opts)`, `main(argv, env)`. Plans are arrays of arg-arrays (e.g. `["claude","plugin","install","openresearch@openresearch"]`); `--dry-run` prints each joined by spaces prefixed `[dry-run] `.

- [ ] **Step 1: Root workspace wiring**

In `package.json` (root), replace the `workspaces` line:

```json
  "workspaces": ["content/validator", "site", "toolkit/installer"],
```

- [ ] **Step 2: Write the failing tests**

Create `toolkit/installer/test/openresearch.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  parseArgs, findRepoRoot, resolveSource,
  planInit, planUpdate, which, doctor
} from "../bin/openresearch.mjs";

test("parseArgs reads command, --dry-run, and --version <semver>", () => {
  assert.deepEqual(parseArgs(["init"]), { command: "init", dryRun: false, version: null });
  assert.deepEqual(parseArgs(["init", "--dry-run"]), { command: "init", dryRun: true, version: null });
  assert.deepEqual(parseArgs(["update", "--version", "0.3.0"]), { command: "update", dryRun: false, version: "0.3.0" });
});

test("resolveSource: repo URL when set, local toolkit path in no-remote mode", () => {
  assert.equal(
    resolveSource({ host: "github.com", repo: "org/openresearch" }, "/repo"),
    "https://github.com/org/openresearch"
  );
  assert.equal(resolveSource({ host: "github.com", repo: null }, "/repo"), join("/repo", "toolkit"));
});

test("planInit plans marketplace-add then install", () => {
  const plan = planInit("/repo/toolkit");
  assert.deepEqual(plan, [
    ["claude", "plugin", "marketplace", "add", "/repo/toolkit"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ]);
});

test("planUpdate plans update+install; --version must match plugin.json", () => {
  assert.deepEqual(planUpdate("/repo/toolkit", { version: null, pluginVersion: "0.3.0" }), [
    ["claude", "plugin", "marketplace", "update", "openresearch"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ]);
  assert.deepEqual(planUpdate("/repo/toolkit", { version: "0.3.0", pluginVersion: "0.3.0" }).length, 2);
  assert.throws(
    () => planUpdate("/repo/toolkit", { version: "0.9.9", pluginVersion: "0.3.0" }),
    /does not match plugin.json version 0.3.0/
  );
});

test("which probes PATH via injected exists + delimiter", () => {
  const exists = (p) => p === join("/opt/bin", "claude");
  assert.equal(which("claude", { path: "/opt/bin", exists, delimiter: ":", exts: [""] }), true);
  assert.equal(which("gh", { path: "/opt/bin", exists, delimiter: ":", exts: [""] }), false);
});

test("findRepoRoot walks up to platform.config.json, else throws", () => {
  const exists = (p) => p === join("/a", "platform.config.json");
  assert.equal(findRepoRoot("/a/b/c", exists), "/a");
  assert.throws(() => findRepoRoot("/x/y", () => false), /platform.config.json not found/);
});

test("doctor: node<20 fails; present claude is ok; missing gh warns", () => {
  const exists = (p) => p.endsWith("claude");
  const fail = doctor({ nodeVersion: "18.20.0", path: "/bin", exists, repoRoot: "/repo" });
  assert.equal(fail.find((c) => c.name === "node >= 20").status, "fail");

  const ok = doctor({ nodeVersion: "20.11.0", path: "/bin", exists, repoRoot: "/repo" });
  assert.equal(ok.find((c) => c.name === "node >= 20").status, "ok");
  assert.equal(ok.find((c) => c.name === "claude CLI").status, "ok");
  assert.equal(ok.find((c) => c.name === "gh CLI").status, "warn");
  assert.equal(ok.find((c) => c.name.startsWith("bedrock")).status, "warn");
});
```

- [ ] **Step 3: Run to verify failure**

Run (from `toolkit/installer/`): `node --test`
Expected: FAIL — module `../bin/openresearch.mjs` does not exist.

- [ ] **Step 4: Create installer `package.json`**

Create `toolkit/installer/package.json`:

```json
{
  "name": "openresearch",
  "version": "0.3.0",
  "private": true,
  "type": "module",
  "description": "OpenResearch toolkit installer for Claude Code (init / update / doctor).",
  "engines": { "node": ">=20" },
  "bin": { "openresearch": "bin/openresearch.mjs" },
  "scripts": { "test": "node --test" }
}
```

(`private: true` prevents accidental publish on this no-remote machine; publishing later flips it. The **bin** name `openresearch` is what `npx openresearch` resolves — independent of any name collision with the root package.)

- [ ] **Step 5: Implement `bin/openresearch.mjs`**

Create `toolkit/installer/bin/openresearch.mjs`:

```js
#!/usr/bin/env node
// OpenResearch toolkit installer. Pure Node, zero dependencies.
// init / update / doctor, with --dry-run printing the exact command plan.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, delimiter as PATH_DELIMITER } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Windows resolves executables via these extensions; "" covers POSIX.
const EXECUTABLE_EXTS = ["", ".exe", ".cmd", ".bat"];

export function parseArgs(argv) {
  const out = { command: null, dryRun: false, version: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--version") out.version = argv[++i] ?? null;
    else if (!out.command) out.command = a;
  }
  return out;
}

export function findRepoRoot(startDir, exists = existsSync) {
  let dir = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (exists(join(dir, "platform.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("openresearch: platform.config.json not found — run inside an OpenResearch checkout.");
    }
    dir = parent;
  }
}

export function loadPlatformConfig(repoRoot, read = (p) => readFileSync(p, "utf8")) {
  return JSON.parse(read(join(repoRoot, "platform.config.json")));
}

export function pluginJsonPath(repoRoot) {
  return join(repoRoot, "toolkit", "plugins", "openresearch", ".claude-plugin", "plugin.json");
}

export function resolveSource(platform, repoRoot) {
  if (platform.repo) return `https://${platform.host}/${platform.repo}`;
  return join(repoRoot, "toolkit"); // no-remote: install from the local marketplace directory
}

export function planInit(source) {
  return [
    ["claude", "plugin", "marketplace", "add", source],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ];
}

export function planUpdate(source, { version = null, pluginVersion } = {}) {
  if (version && version !== pluginVersion) {
    throw new Error(`openresearch update: --version ${version} does not match plugin.json version ${pluginVersion}`);
  }
  return [
    ["claude", "plugin", "marketplace", "update", "openresearch"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ];
}

export function which(bin, {
  path = process.env.PATH ?? "",
  exists = existsSync,
  delimiter = PATH_DELIMITER,
  exts = EXECUTABLE_EXTS
} = {}) {
  for (const dir of path.split(delimiter)) {
    if (!dir) continue;
    for (const ext of exts) {
      if (exists(join(dir, bin + ext))) return true;
    }
  }
  return false;
}

export function doctor({
  nodeVersion = process.versions.node,
  path = process.env.PATH ?? "",
  exists = existsSync,
  repoRoot = null
} = {}) {
  const checks = [];
  const major = Number(nodeVersion.split(".")[0]);
  checks.push({ name: "node >= 20", status: major >= 20 ? "ok" : "fail", detail: `found ${nodeVersion}` });

  const claude = which("claude", { path, exists });
  checks.push({
    name: "claude CLI",
    status: claude ? "ok" : "warn",
    detail: claude ? "found on PATH" : "not on PATH — use the manual marketplace-add commands"
  });

  const gh = which("gh", { path, exists });
  checks.push({
    name: "gh CLI",
    status: gh ? "ok" : "warn",
    detail: gh ? "found (auth not checked here — publish warns if unauthenticated)" : "not on PATH — publish uses the no-remote fallback"
  });

  const validatorPresent = repoRoot
    ? exists(join(repoRoot, "content", "validator", "bin", "validate.js"))
    : false;
  checks.push({
    name: "validator",
    status: validatorPresent ? "ok" : "warn",
    detail: validatorPresent ? "content/validator present — npm run validate available" : "run from the repo root to enable validation"
  });

  checks.push({
    name: "bedrock (probe stub)",
    status: "warn",
    detail: "not probed — real Bedrock verification is CBA-port work"
  });

  return checks;
}

function runPlan(plan, dryRun) {
  for (const args of plan) {
    if (dryRun) {
      console.log(`[dry-run] ${args.join(" ")}`);
      continue;
    }
    const r = spawnSync(args[0], args.slice(1), { stdio: "inherit" });
    if (r.error || r.status !== 0) {
      throw new Error(`openresearch: command failed — ${args.join(" ")}`);
    }
  }
  return plan;
}

export function main(argv, env = process.env) {
  const { command, dryRun, version } = parseArgs(argv);
  const repoRoot = findRepoRoot(process.cwd());
  const platform = loadPlatformConfig(repoRoot);
  const source = resolveSource(platform, repoRoot);

  if (command === "init") {
    if (!which("claude", { path: env.OPENRESEARCH_PATH_OVERRIDE ?? env.PATH ?? "" })) {
      console.log("claude CLI not found — run these manually once it is installed:");
    }
    return runPlan(planInit(source), dryRun);
  }
  if (command === "update") {
    const plugin = JSON.parse(readFileSync(pluginJsonPath(repoRoot), "utf8"));
    return runPlan(planUpdate(source, { version, pluginVersion: plugin.version }), dryRun);
  }
  if (command === "doctor") {
    const checks = doctor({ path: env.OPENRESEARCH_PATH_OVERRIDE ?? env.PATH ?? "", repoRoot });
    for (const c of checks) console.log(`[${c.status}] ${c.name} — ${c.detail}`);
    if (checks.some((c) => c.status === "fail")) process.exitCode = 1;
    return checks;
  }
  throw new Error(`openresearch: unknown command "${command ?? ""}". Use: init | update | doctor  [--dry-run] [--version <semver>]`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
```

- [ ] **Step 6: Run tests + install + manual dry-run smoke**

Run (from `toolkit/installer/`): `node --test` → all PASS.
Before installing, rename the root package to eliminate the name collision with the installer workspace (root is private; nothing depends on its name — `-w` targeting uses workspace names `site`/`@openresearch/validator`/`openresearch`): in root `package.json`, change `"name": "openresearch"` to `"name": "openresearch-monorepo"`.

Run (repo root): `npm install` → Expected: succeeds with the `openresearch` workspace symlinked under `node_modules/`.
Run (repo root): `npm test --workspaces` → PASS.
Smoke the dry-run surface (repo root): `node toolkit/installer/bin/openresearch.mjs init --dry-run`
Expected output (no-remote):
```
[dry-run] claude plugin marketplace add <abs-path>/toolkit
[dry-run] claude plugin install openresearch@openresearch
```

- [ ] **Step 7: Commit**

```bash
git add -A package.json toolkit/installer/
git commit -m "feat(toolkit): openresearch installer — init/update/doctor with --dry-run command plans" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: Plugin scaffold (marketplace.json, plugin.json, mcp placeholder)

**This is a transcription task** — the JSON below is complete.

**Files:**
- Create: `toolkit/marketplace.json`
- Create: `toolkit/plugins/openresearch/.claude-plugin/plugin.json`
- Create: `toolkit/plugins/openresearch/mcp/README.md`
- Test: `site/test/toolkit-scaffold.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces (frozen at CP-B):
  - `toolkit/marketplace.json` shape: `{ name, owner{name,url}, plugins:[{ name, source, description, skills:[{name,purpose,shipsIn}] }] }`. The `skills[]` roster is display metadata consumed by `deriveToolkit()` in Task 7 (the three M3 skills carry `shipsIn: null`; the two M7 skills carry `shipsIn: "M7"`).
  - `plugin.json` shape: `{ name, version, description, author }` — `version` (`0.3.0`) is the pinning anchor the installer checks.
  - `mcp/README.md` — M7 placeholder, no dead config.

- [ ] **Step 1: Write the failing test**

Create `site/test/toolkit-scaffold.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const toolkit = (rel) => fileURLToPath(new URL(`../../toolkit/${rel}`, import.meta.url));

test("marketplace.json parses and the plugin source path exists on disk", () => {
  const mk = JSON.parse(readFileSync(toolkit("marketplace.json"), "utf8"));
  assert.equal(mk.name, "openresearch");
  const entry = mk.plugins.find((p) => p.name === "openresearch");
  assert.ok(entry, "marketplace must list the openresearch plugin");
  assert.equal(entry.source, "./plugins/openresearch");
  // source path resolves to a real directory containing the plugin manifest
  assert.ok(existsSync(toolkit(`${entry.source}/.claude-plugin/plugin.json`)));
});

test("plugin.json pins version 0.3.0 (the installer's pinning anchor)", () => {
  const pl = JSON.parse(readFileSync(toolkit("plugins/openresearch/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(pl.name, "openresearch");
  assert.equal(pl.version, "0.3.0");
});

test("marketplace skills roster: three M3 skills shipped, two M7 upcoming", () => {
  const mk = JSON.parse(readFileSync(toolkit("marketplace.json"), "utf8"));
  const skills = mk.plugins.find((p) => p.name === "openresearch").skills;
  const shipped = skills.filter((s) => !s.shipsIn).map((s) => s.name).sort();
  const upcoming = skills.filter((s) => s.shipsIn === "M7").map((s) => s.name).sort();
  assert.deepEqual(shipped, ["judge", "paper-reader", "publish"]);
  assert.deepEqual(upcoming, ["try-this-paper", "write-replication"]);
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `toolkit-scaffold.test.js` FAILS (files absent).

- [ ] **Step 3: Create `toolkit/marketplace.json`**

```json
{
  "name": "openresearch",
  "owner": {
    "name": "OpenResearch",
    "url": "https://github.com/openresearch/openresearch"
  },
  "plugins": [
    {
      "name": "openresearch",
      "source": "./plugins/openresearch",
      "description": "OpenResearch contributor toolkit — publish, read, and judge applied-AI research from inside Claude Code.",
      "skills": [
        { "name": "judge", "purpose": "Advisory review of a draft on clarity, claims-vs-evidence, and reproducibility.", "shipsIn": null },
        { "name": "paper-reader", "purpose": "Structured read of one contribution and its evidence, ending in next actions.", "shipsIn": null },
        { "name": "publish", "purpose": "Take a draft from folder to validated, judged, branch-and-PR (or no-remote fallback).", "shipsIn": null },
        { "name": "try-this-paper", "purpose": "Run a contribution's bundle against your own workflow and capture the delta.", "shipsIn": "M7" },
        { "name": "write-replication", "purpose": "Turn a replication run into a submitted replication record.", "shipsIn": "M7" }
      ]
    }
  ]
}
```

- [ ] **Step 4: Create `toolkit/plugins/openresearch/.claude-plugin/plugin.json`**

```json
{
  "name": "openresearch",
  "version": "0.3.0",
  "description": "OpenResearch contributor toolkit — publish, read, and judge applied-AI research from inside Claude Code.",
  "author": { "name": "OpenResearch" }
}
```

- [ ] **Step 5: Create `toolkit/plugins/openresearch/mcp/README.md`**

```markdown
# MCP server (placeholder — lands in M7)

This directory will hold the OpenResearch MCP server that answers questions
against the corpus index (F7). It is intentionally empty of configuration today:
no `.mcp.json`, no server entry point, nothing the plugin loader would try to start.

Planned in M7:

- A `q&a` tool over the built corpus index (names/signatures frozen at CP-D).
- A watchlist/digest surface (shape frozen at CP-D).

Until then, `platform.config.json` keeps `mcp.enabled: false` and the plugin ships
skills only. Adding real config here before M7 would be dead config — don't.
```

- [ ] **Step 6: Run test + build**

Run (from `site/`): `node --test` → all PASS.
Run (repo root): `npm run build -w site` → PASS (no page consumes the toolkit yet — that is Task 7).

- [ ] **Step 7: Commit**

```bash
git add -A toolkit/marketplace.json toolkit/plugins/ site/test/toolkit-scaffold.test.js
git commit -m "feat(toolkit): marketplace + plugin scaffold (v0.3.0) with MCP placeholder" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: `judge` skill

**Files:**
- Create: `toolkit/plugins/openresearch/skills/judge/SKILL.md`
- Create: `toolkit/plugins/openresearch/skills/judge/walkthrough.md`

**Interfaces:**
- Consumes: a contribution folder `content/contributions/<id>/` (`index.md` + records via paths). Reads `platform.config.json` `judge.ci` to decide whether the CI variant applies.
- Produces: an advisory review printed to the session — per-axis verdict (`strong` / `adequate` / `needs work`) on **Clarity**, **Claims vs. evidence**, **Reproducibility**; ≤5 concrete suggestions; one-line overall. **Never blocks.** No files written.

- [ ] **Step 1: Create `SKILL.md`**

Create `toolkit/plugins/openresearch/skills/judge/SKILL.md`:

```markdown
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

- Never edit files. Never run the validator here (that is `publish`'s job).
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
```

- [ ] **Step 2: Create `walkthrough.md`**

Create `toolkit/plugins/openresearch/skills/judge/walkthrough.md`:

```markdown
# judge — walkthrough scenario (the skill's test)

Follow SKILL.md **literally** against a known-good, fully-evidenced contribution
and confirm the output shape. Commit the transcript.

## Scenario

Target: `prompt-cache-evals` (a published finding with a bundle, one replication,
and one adoption endorsement).

## Steps

1. `ls content/contributions/prompt-cache-evals/`
   Expect: `index.md` and `bundle/`.
2. `cat content/contributions/prompt-cache-evals/index.md`
3. `grep -rl "contribution_id: prompt-cache-evals" content/records/`
   Expect: one replication (`--payments.yaml`) and one endorsement (`--cards.yaml`).
4. `cat` each matched record.
5. Produce the review in the exact output block from SKILL.md.

## Expected observable result

- Three axis lines, each `strong`/`adequate`/`needs work` + one sentence.
- `Claims vs evidence` notes that the headline "−60% cost" is self-reported in the
  finding while the Payments replication measured "−55%" — a reconcilable delta,
  not a contradiction.
- `Reproducibility` is `strong` (bundle names the procedure and expected delta).
- At most five suggestions; a one-line overall ending "advisory; you may publish as-is".
- **No files changed** (`git status --porcelain` empty afterwards).

Paste the full session transcript below the line when running this walkthrough.

---
```

- [ ] **Step 3: Verify + commit**

Run (repo root): `git status --porcelain` after running the walkthrough mentally/literally — no content files should change.
Run: `npm test --workspaces` and `npm run validate` → still green (skills are inert docs).

```bash
git add -A toolkit/plugins/openresearch/skills/judge/
git commit -m "feat(toolkit): judge skill — advisory three-axis review (never blocking)" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: `paper-reader` skill

**Files:**
- Create: `toolkit/plugins/openresearch/skills/paper-reader/SKILL.md`
- Create: `toolkit/plugins/openresearch/skills/paper-reader/walkthrough.md`

**Interfaces:**
- Consumes: `content/contributions/<id>/index.md` + its records via paths (NOT the built site).
- Produces: a printed structured reading — **Summary → Claimed result → Evidence state → How to replicate → Open questions**, ending with offered next actions (try it / replicate it named as "coming in M7"). No files written.

- [ ] **Step 1: Create `SKILL.md`**

Create `toolkit/plugins/openresearch/skills/paper-reader/SKILL.md`:

```markdown
---
name: paper-reader
description: Structured reading of one OpenResearch contribution and its evidence, straight from content/ (not the built site). Use when asked to "read", "explain", or "walk me through" a contribution. Outputs Summary, Claimed result, Evidence state (replications/endorsements with deltas), How to replicate, and Open questions, then offers next actions.
---

# paper-reader — read one contribution in context

Give a colleague a faithful, skimmable read of a single contribution and the state
of its evidence. Work from the source files, not the website.

## Inputs

- A contribution id `<id>`.
- Files: `content/contributions/<id>/index.md`, its `bundle/` if present, and every
  record in `content/records/{replications,endorsements}/` whose `contribution_id`
  is `<id>`.

## Procedure

1. Load the files. Run exactly:
   - `cat content/contributions/<id>/index.md`
   - `grep -rl "contribution_id: <id>" content/records/` then `cat` each match.
   - If `content/contributions/<id>/bundle/` exists: `ls` it and `cat` its `README.md`.
2. Read all of it before writing.
3. Emit the sections below. For **Evidence state**, list each replication as
   `team · outcome · measured_delta · (benchmark|own workflow)` and each endorsement
   as `type · by · one-line statement`. Compute the honest picture: how many
   replications with `outcome: replicated`, from how many distinct teams, and whether
   any are `partial`/`failed`.

## Output format

```
<title>  —  <tier> · <category>

Summary
  <2–3 sentences: what they did and the measured effect>

Claimed result
  <result> — <result_detail if present>. Source: <bundle | benchmark id | prose>.

Evidence state
  Replications (<n> replicated / <m> total):
    - <team> · <outcome> · <measured_delta> · <benchmark|own workflow>
  Endorsements (<k>):
    - <type> · <by> · "<short statement>"
  Read: <one honest line — e.g. "independently replicated by 2 teams" or
         "self-reported; one partial replication">.

How to replicate
  <the bundle's procedure in 2–4 steps, and the expected delta>

Open questions
  - <what the draft does not answer / where it might not transfer>
```

## Next actions (offer, do not perform)

End by offering:
- "Want to **try this** against your own workflow? The `try-this-paper` skill runs
  the bundle for you — **coming in M7**."
- "Ran it already? The `write-replication` skill turns your run into a record —
  **coming in M7**."
- "Or open the bundle yourself: `content/contributions/<id>/bundle/`."

## Rules

- Read from `content/`, never from `site/dist/` or a URL.
- Do not invent evidence. If there are zero records, say "no replications yet".
- Do not edit files.
```

- [ ] **Step 2: Create `walkthrough.md`**

Create `toolkit/plugins/openresearch/skills/paper-reader/walkthrough.md`:

```markdown
# paper-reader — walkthrough scenario (the skill's test)

Follow SKILL.md literally and confirm the five-section output plus the M7 next-actions.

## Scenario

Target: `heading-aware-chunking` (a tutorial with a bundle and two `replicated`
replications from different teams — Payments and Risk).

## Steps

1. `cat content/contributions/heading-aware-chunking/index.md`
2. `grep -rl "contribution_id: heading-aware-chunking" content/records/`
   Expect two replication files (`--payments.yaml`, `--risk.yaml`).
3. `cat` each; `ls content/contributions/heading-aware-chunking/bundle/` and
   `cat` its `README.md`.
4. Emit the exact five-section block.

## Expected observable result

- **Claimed result** reads "+11pt recall@10 — 0.71 → 0.82 on the policy corpus".
- **Evidence state** shows `Replications (2 replicated / 2 total)` from two distinct
  teams, one via `policy-rag-bench`, one via "own workflow".
- **Read** line notes independent replication by two teams.
- Ends with the two M7 next-action offers and the bundle path.
- No files changed.

Paste the full session transcript below the line.

---
```

- [ ] **Step 3: Verify + commit**

Run (repo root): `npm test --workspaces` and `npm run validate` → green.

```bash
git add -A toolkit/plugins/openresearch/skills/paper-reader/
git commit -m "feat(toolkit): paper-reader skill — structured read of a contribution and its evidence" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: `publish` skill

**Files:**
- Create: `toolkit/plugins/openresearch/skills/publish/SKILL.md`
- Create: `toolkit/plugins/openresearch/skills/publish/walkthrough.md`

**Interfaces:**
- Consumes: `content/templates/*.md` (tier scaffolds), `npm run validate` (the same validator CI runs), the `judge` skill (inline, advisory), `platform.config.json` (`host`, `repo`).
- Produces: a `content/contributions/<id>/` draft ready to publish; a local branch `contribute/<id>` with a commit; then either `gh pr create` (when `repo` is set) or — in **no-remote mode (`repo: null`)** — the exact push/PR commands printed for a human. The validator is authoritative and blocks; `judge` is advisory and does not.

- [ ] **Step 1: Create `SKILL.md`**

Create `toolkit/plugins/openresearch/skills/publish/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Create `walkthrough.md`**

Create `toolkit/plugins/openresearch/skills/publish/walkthrough.md`:

```markdown
# publish — walkthrough scenario (the skill's test)

This walkthrough is executed for real against a seed in Task 10 (the dogfood), which
captures its transcript into that seed's `bundle/publish-walkthrough.md`. Here we
record the non-interactive, no-remote path the skill takes.

## Scenario (no-remote mode)

`platform.config.json` has `repo: null`, so publish must use the fallback: validate →
branch → commit → **print** push/PR commands (never call gh).

## Steps (exact)

1. `npm run validate` → expect `✓ content validation passed`.
2. Run `judge` on the target `<id>` inline (advisory; capture output).
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
```

- [ ] **Step 3: Verify + commit**

Run (repo root): `npm test --workspaces` and `npm run validate` → green (no content changed by adding skill docs).

```bash
git add -A toolkit/plugins/openresearch/skills/publish/
git commit -m "feat(toolkit): publish skill — validate/judge/branch/PR with no-remote fallback" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: Derive extension + real `/toolkit` page

**This is a transcription task** for the code blocks; the page `<style>` is design and may be tuned as long as it reuses the Imprint classes and keeps the asserted commands.

**Files:**
- Extend: `site/scripts/derive.mjs` (add `deriveToolkit` export + emit `toolkit.json` in the CLI section — do NOT change the existing `derive()` function)
- Rewrite: `site/src/pages/toolkit.astro`
- Test: `site/test/derive-toolkit.test.js`
- Fixtures: `site/test/fixtures/toolkit-root/marketplace.json`, `site/test/fixtures/toolkit-root/plugins/openresearch/.claude-plugin/plugin.json`

**Interfaces:**
- Consumes: `toolkit/marketplace.json` + `toolkit/plugins/openresearch/.claude-plugin/plugin.json` (Task 3); `platform.config.json` (`host`, `repo`) for install-command host resolution.
- Produces:
  - `deriveToolkit(toolkitDir, { repo, host })` → `{ name, version, description, source, skills:[{name,purpose,shipsIn}], install:{init, marketplaceAdd} }`. Fails loud if either JSON is missing/malformed or the plugin entry has no `skills[]`.
  - Written file `site/src/data/toolkit.json` with exactly that shape (this exact shape is what Task 11 asserts).
  - Rebuilt `/toolkit` page rendering the plugin card, skill rows (with "ships in M7" tags), and an install panel with the two copyable commands.

- [ ] **Step 1: Create fixtures**

Create `site/test/fixtures/toolkit-root/marketplace.json`:

```json
{
  "name": "openresearch",
  "owner": { "name": "OpenResearch", "url": "https://example.internal/openresearch" },
  "plugins": [
    {
      "name": "openresearch",
      "source": "./plugins/openresearch",
      "description": "Fixture toolkit.",
      "skills": [
        { "name": "judge", "purpose": "advisory review", "shipsIn": null },
        { "name": "publish", "purpose": "draft to PR", "shipsIn": null },
        { "name": "try-this-paper", "purpose": "run the bundle", "shipsIn": "M7" }
      ]
    }
  ]
}
```

Create `site/test/fixtures/toolkit-root/plugins/openresearch/.claude-plugin/plugin.json`:

```json
{
  "name": "openresearch",
  "version": "9.9.9",
  "description": "Fixture plugin.",
  "author": { "name": "OpenResearch" }
}
```

- [ ] **Step 2: Write the failing test**

Create `site/test/derive-toolkit.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { deriveToolkit } from "../scripts/derive.mjs";

const toolkitRoot = fileURLToPath(new URL("./fixtures/toolkit-root", import.meta.url));
const missingRoot = fileURLToPath(new URL("./fixtures/nope-toolkit", import.meta.url));

test("deriveToolkit merges plugin.json version with marketplace roster", () => {
  const t = deriveToolkit(toolkitRoot, { repo: null, host: "github.com" });
  assert.equal(t.name, "openresearch");
  assert.equal(t.version, "9.9.9"); // pinning anchor comes from plugin.json
  assert.equal(t.source, "./plugins/openresearch");
  assert.equal(t.skills.length, 3);
  assert.deepEqual(t.skills.find((s) => s.name === "judge"), { name: "judge", purpose: "advisory review", shipsIn: null });
  assert.equal(t.skills.find((s) => s.name === "try-this-paper").shipsIn, "M7");
  assert.equal(t.install.init, "npx openresearch init");
  assert.equal(t.install.marketplaceAdd, "claude plugin marketplace add ./toolkit"); // no-remote
});

test("deriveToolkit uses repo URL for marketplaceAdd when repo is set", () => {
  const t = deriveToolkit(toolkitRoot, { repo: "org/openresearch", host: "github.com" });
  assert.equal(t.install.marketplaceAdd, "claude plugin marketplace add https://github.com/org/openresearch");
});

test("deriveToolkit fails loud when the toolkit files are missing", () => {
  assert.throws(() => deriveToolkit(missingRoot, { repo: null, host: "github.com" }), /missing/);
});
```

- [ ] **Step 3: Run to verify failure**

Run (from `site/`): `node --test`
Expected: `derive-toolkit.test.js` FAILS (`deriveToolkit` not exported). Existing `derive.test.js` still PASSES (untouched).

- [ ] **Step 4: Extend `derive.mjs`**

In `site/scripts/derive.mjs`, change the top import line:

```js
import { mkdirSync, writeFileSync } from "node:fs";
```

to:

```js
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
```

Then, **immediately after** the existing `derive(...)` function's closing `}` (before the `// CLI:` comment), insert the new function:

```js
export function deriveToolkit(toolkitDir, { repo = null, host = "github.com" } = {}) {
  const mkPath = join(toolkitDir, "marketplace.json");
  const plPath = join(toolkitDir, "plugins", "openresearch", ".claude-plugin", "plugin.json");
  if (!existsSync(mkPath)) throw new Error(`derive: missing ${mkPath}`);
  if (!existsSync(plPath)) throw new Error(`derive: missing ${plPath}`);

  let marketplace, plugin;
  try {
    marketplace = JSON.parse(readFileSync(mkPath, "utf8"));
  } catch (err) {
    throw new Error(`derive: malformed ${mkPath} — ${err.message}`);
  }
  try {
    plugin = JSON.parse(readFileSync(plPath, "utf8"));
  } catch (err) {
    throw new Error(`derive: malformed ${plPath} — ${err.message}`);
  }

  const entry = (marketplace.plugins ?? []).find((p) => p.name === plugin.name);
  if (!entry) throw new Error(`derive: marketplace.json has no plugin named "${plugin.name}"`);
  if (!Array.isArray(entry.skills)) {
    throw new Error(`derive: plugin "${plugin.name}" has no skills[] in marketplace.json`);
  }

  const marketplaceAdd = repo
    ? `claude plugin marketplace add https://${host}/${repo}`
    : "claude plugin marketplace add ./toolkit";

  return {
    name: plugin.name,
    version: plugin.version,
    description: plugin.description ?? entry.description ?? "",
    source: entry.source,
    skills: entry.skills.map((s) => ({ name: s.name, purpose: s.purpose, shipsIn: s.shipsIn ?? null })),
    install: { init: "npx openresearch init", marketplaceAdd }
  };
}
```

Then, in the CLI block at the bottom, **after** the four existing `writeFileSync(...)` lines and **before** the `console.log(...)` line, insert the toolkit emission:

```js
    const toolkitDir = fileURLToPath(new URL("../../toolkit", import.meta.url));
    const platform = JSON.parse(readFileSync(fileURLToPath(new URL("../../platform.config.json", import.meta.url)), "utf8"));
    const toolkit = deriveToolkit(toolkitDir, { repo: platform.repo, host: platform.host });
    writeFileSync(join(outDir, "toolkit.json"), JSON.stringify(toolkit, null, 2));
```

(The CLI is already wrapped in `try { … } catch (err) { console.error(err.message); process.exit(1); }`, so a missing/malformed toolkit fails the build loudly — as required.)

- [ ] **Step 5: Rewrite the `/toolkit` page**

Replace `site/src/pages/toolkit.astro` entirely:

```astro
---
import Base from "../layouts/Base.astro";
import Masthead from "../components/Masthead.astro";
import Footer from "../components/Footer.astro";
import toolkit from "../data/toolkit.json";

const shipped = toolkit.skills.filter((s) => !s.shipsIn);
const upcoming = toolkit.skills.filter((s) => s.shipsIn);
---
<Base title="Toolkit · OpenResearch">
  <main class="max-w-[1080px] mx-auto px-6 pt-8">
    <Masthead active="toolkit" />

    <section class="rv" style="padding: 40px 0 8px; max-width: 60ch;">
      <p class="caps" style="color: var(--oxblood)">Toolkit v{toolkit.version}</p>
      <h1 class="font-display" style="font-weight: 600; font-size: clamp(28px,4vw,40px); line-height: 1.12; margin: 10px 0 12px; text-wrap: balance;">
        Publish, read, and judge from inside <em>Claude Code.</em>
      </h1>
      <p style="color: var(--slate); margin: 0;">{toolkit.description}</p>
    </section>

    <article class="card rv" style="cursor: default; border: 1px solid var(--hairline); border-radius: 6px; margin: 20px 0 8px;">
      <div style="display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;">
        <span class="caps" style="color: var(--oxblood)">Plugin</span>
        <h3 style="margin: 0;">{toolkit.name}</h3>
        <span class="stamp">v{toolkit.version}</span>
      </div>
      <p class="card-summary" style="margin: 10px 0 0;">{toolkit.description}</p>
      <p class="caps" style="margin: 12px 0 0;">source · {toolkit.source}</p>
    </article>

    <div class="seclab rv"><span class="caps" style="color: var(--oxblood)">Skills</span></div>
    <div class="skills rv">
      {shipped.map((s) => (
        <div class="skill">
          <div class="skill-name font-display">{s.name}</div>
          <div class="skill-purpose">{s.purpose}</div>
          <span class="seal skill-tag">ready</span>
        </div>
      ))}
      {upcoming.map((s) => (
        <div class="skill skill-upcoming">
          <div class="skill-name font-display">{s.name}</div>
          <div class="skill-purpose">{s.purpose}</div>
          <span class="stamp skill-tag">ships in {s.shipsIn}</span>
        </div>
      ))}
    </div>

    <section class="install rv">
      <p class="caps" style="color: var(--oxblood)">Install</p>
      <div class="cmd">
        <code class="kbd" id="cmd-init">{toolkit.install.init}</code>
        <button class="abtn" type="button" data-copy="#cmd-init">Copy</button>
      </div>
      <p class="cmd-or caps">or add the marketplace by hand</p>
      <div class="cmd">
        <code class="kbd" id="cmd-mkt">{toolkit.install.marketplaceAdd}</code>
        <button class="abtn" type="button" data-copy="#cmd-mkt">Copy</button>
      </div>
    </section>

    <Footer />
  </main>
</Base>
<style>
  .seclab { margin: 30px 0 6px; }
  .skills { display: flex; flex-direction: column; border-top: 1px solid var(--hairline); }
  .skill { display: grid; grid-template-columns: 160px 1fr auto; gap: 16px; align-items: center;
           padding: 16px 4px; border-bottom: 1px solid var(--hairline); }
  .skill-name { font-weight: 600; font-size: 17px; }
  .skill-purpose { color: var(--slate); font-size: 14.5px; }
  .skill-upcoming .skill-name, .skill-upcoming .skill-purpose { opacity: .62; }
  .skill-tag { justify-self: end; }
  .install { margin: 34px 0 8px; }
  .cmd { display: flex; align-items: center; gap: 12px; margin: 10px 0; flex-wrap: wrap; }
  .cmd .kbd { font-size: 13px; padding: 7px 12px; }
  .cmd-or { margin: 14px 0 2px; }
  @media (max-width: 640px) { .skill { grid-template-columns: 1fr; gap: 4px; } .skill-tag { justify-self: start; } }
</style>
```

(Reuses `.caps .card .kbd .abtn .stamp .seal .rv` from `global.css` — no new design system. `data-copy` is handled by the existing `motion.js` copy behavior.)

- [ ] **Step 6: Run tests, derive, build**

Run (from `site/`): `node --test` → all PASS (existing + new).
Run (repo root): `npm run derive` → Expected: writes `site/src/data/toolkit.json` alongside the four existing files.
Verify shape: `cat site/src/data/toolkit.json` — has `name`, `version` `0.3.0`, five `skills` (three `shipsIn: null`, two `"M7"`), `install.init` and `install.marketplaceAdd` (`claude plugin marketplace add ./toolkit`).
Run (repo root): `npm run build -w site` → PASS.
Spot-check the built page: `grep -c "npx openresearch init" site/dist/toolkit/index.html` ≥ 1; `grep -c "ships in M7" site/dist/toolkit/index.html` == 2.

- [ ] **Step 7: Commit**

```bash
git add -A site/scripts/derive.mjs site/src/pages/toolkit.astro site/test/derive-toolkit.test.js site/test/fixtures/toolkit-root/
git commit -m "feat(site): derive toolkit.json and render the real /toolkit marketplace page" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: Seed batch 1 — two findings + `rerank-eval-set` benchmark + records

Author the two findings' **prose** (you are a capable model) under the fixed skeletons.
Everything the validator and derive layer check is pinned below **verbatim** — copy
frontmatter, records, benchmark, and bundle READMEs exactly; write only the section bodies.

**Files:**
- Create: `content/benchmarks/rerank-eval-set.yaml`
- Create: `content/contributions/retrieval-reranker-lite/index.md` + `bundle/README.md`
- Create: `content/contributions/pii-scrubber-prompts/index.md` + `bundle/README.md`
- Create records: `content/records/replications/retrieval-reranker-lite--cards.yaml`, `…--risk.yaml`; `content/records/endorsements/retrieval-reranker-lite--payments.yaml`; `content/records/replications/pii-scrubber-prompts--payments.yaml`; `content/records/endorsements/pii-scrubber-prompts--cards.yaml`
- Extend: `site/scripts/check-links.mjs` (`requiredRoutes`)

**Interfaces:**
- Consumes: the frozen contribution/replication/endorsement/benchmark schemas; crossref rule (benchmark_ids must exist in the registry); links rule (relative links + `replication_bundle` must resolve).
- Produces: two published `finding` contributions with authors carrying `team` + `division` strings; one new benchmark `rerank-eval-set`; three replications (2 `replicated` for reranker, 1 `replicated` for pii) and two endorsements.

- [ ] **Step 1: Benchmark `rerank-eval-set`**

Create `content/benchmarks/rerank-eval-set.yaml` (verbatim):

```yaml
id: rerank-eval-set
owner:
  name: Sofia Marchetti
  team: markets-analytics
description: Reranking eval set of 500 query-passage pairs with graded relevance labels drawn from markets research retrieval.
data_pointer: ghe://markets-analytics/rerank-eval-set
metrics:
  - name: ndcg@10
    definition: normalized discounted cumulative gain at rank 10 over graded relevance labels
    higher_is_better: true
  - name: latency_ms
    definition: median added rerank latency per query in milliseconds
    higher_is_better: false
```

- [ ] **Step 2: Contribution `retrieval-reranker-lite`**

Create `content/contributions/retrieval-reranker-lite/index.md`. Frontmatter **verbatim**:

```yaml
---
id: retrieval-reranker-lite
title: A lite cross-encoder reranker lifts research retrieval without the latency tax
tier: finding
authors:
  - name: Sofia Marchetti
    team: markets-analytics
    division: Markets
category: rag
tags: [retrieval, reranking, latency]
status: published
created: 2026-07-13
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [rerank-eval-set]
result: +8pt ndcg@10
result_detail: 0.61 → 0.69 ndcg@10 · +40ms median · 500-pair eval set
---
```

Required headings (finding tier) — use these exact `##` headings, in order:
`## Summary`, `## Context`, `## Technique`, `## Evidence`, `## How to replicate`.

Content direction (write the prose; keep the numbers consistent with frontmatter):
- **Summary** (first sentence becomes the card summary): state that a small distilled cross-encoder reranker over the top-50 BM25 candidates raised ndcg@10 from 0.61 to 0.69 at +40ms median. Two sentences.
- **Context**: markets research retrieval returned relevant-but-mis-ranked passages; full LLM reranking was too slow/expensive for the online path. 2–3 sentences.
- **Technique**: retrieve top-50 lexically, rerank with a small cross-encoder scoring query-passage pairs in one batched pass, return top-10; note the model size and batching that keeps latency bounded. 2–3 sentences.
- **Evidence**: 0.61 → 0.69 ndcg@10 on the 500-pair `rerank-eval-set`; +40ms median latency; note it held across two query slices. 2–3 sentences.
- **How to replicate**: point at the bundle and state the expected delta. Must contain the link `[bundle/README.md](bundle/README.md)`.

Create `content/contributions/retrieval-reranker-lite/bundle/README.md` (verbatim):

```markdown
# Replication bundle — retrieval-reranker-lite

1. Take any retrieval set with graded relevance labels (or use `rerank-eval-set`).
2. Retrieve the top 50 candidates lexically, then rerank with a small cross-encoder
   in one batched pass and keep the top 10.
3. Measure ndcg@10 before/after and the added median latency; expect roughly
   +8pt ndcg@10 for about +40ms per query.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

- [ ] **Step 3: `retrieval-reranker-lite` records**

Create `content/records/replications/retrieval-reranker-lite--cards.yaml` (verbatim):

```yaml
contribution_id: retrieval-reranker-lite
replicator:
  name: Liam Fitzgerald
  team: cards-experience
  division: Cards
benchmark_id: rerank-eval-set
method: Re-ran the bundle's top-50-then-rerank pipeline against the shared rerank eval set.
outcome: replicated
measured_delta: ndcg@10 +7pt, +38ms median
date: 2026-07-14
```

Create `content/records/replications/retrieval-reranker-lite--risk.yaml` (verbatim):

```yaml
contribution_id: retrieval-reranker-lite
replicator:
  name: Daniel Okafor
  team: risk-engineering
  division: Risk
benchmark_id: rerank-eval-set
method: Applied the lite reranker to our risk-research retrieval and scored on the shared eval set.
outcome: replicated
measured_delta: ndcg@10 +9pt, +45ms median
date: 2026-07-14
```

Create `content/records/endorsements/retrieval-reranker-lite--payments.yaml` (verbatim):

```yaml
contribution_id: retrieval-reranker-lite
type: endorsement
by:
  name: Hana Kim
  team: payments-platform
  division: Payments
statement: The latency budget is honest — we would adopt this on our research search path.
date: 2026-07-14
```

- [ ] **Step 4: Contribution `pii-scrubber-prompts`**

Create `content/contributions/pii-scrubber-prompts/index.md`. Frontmatter **verbatim**:

```yaml
---
id: pii-scrubber-prompts
title: A two-pass prompt scrubber removes PII before it reaches the model
tier: finding
authors:
  - name: Daniel Okafor
    team: risk-engineering
    division: Risk
category: governance
tags: [pii, safety, prompting]
status: published
created: 2026-07-13
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: []
result: −98% PII leakage
result_detail: 5.2% → 0.1% prompts with residual PII · 3k-prompt audit
---
```

Required headings (finding tier), exact and in order: `## Summary`, `## Context`,
`## Technique`, `## Evidence`, `## How to replicate`.

Content direction:
- **Summary** (first sentence = card summary): a two-pass scrubber (regex pre-pass +
  a small model verification pass) cut prompts with residual PII from 5.2% to 0.1%
  over a 3k-prompt audit. Two sentences.
- **Context**: upstream prompts carried names/account numbers into the model; single-
  regex scrubbing missed formats and produced false confidence. 2–3 sentences.
- **Technique**: pass one strips known PII patterns; pass two asks a small model to
  flag anything the regex missed and redacts it before the main call. 2–3 sentences.
- **Evidence**: 5.2% → 0.1% residual-PII rate on a 3k-prompt manual audit; note the
  small latency cost and that no benchmark id is used (workflow-measured). 2–3 sentences.
- **How to replicate**: link `[bundle/README.md](bundle/README.md)`; state expected drop.

Create `content/contributions/pii-scrubber-prompts/bundle/README.md` (verbatim):

```markdown
# Replication bundle — pii-scrubber-prompts

1. Sample 1k+ real prompts and label residual PII after your current scrubbing.
2. Add a second pass: a small model flags anything the regex pre-pass missed; redact it.
3. Re-audit; expect residual-PII prompts to drop by an order of magnitude or more.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

- [ ] **Step 5: `pii-scrubber-prompts` records**

Create `content/records/replications/pii-scrubber-prompts--payments.yaml` (verbatim):

```yaml
contribution_id: pii-scrubber-prompts
replicator:
  name: Hana Kim
  team: payments-platform
  division: Payments
workflow: Payments support-assistant prompt path, 2k sampled prompts audited for residual PII.
method: Added the second verification pass ahead of our main call and re-audited a fresh 2k sample.
outcome: replicated
measured_delta: residual PII 4.6% -> 0.2%
date: 2026-07-14
```

Create `content/records/endorsements/pii-scrubber-prompts--cards.yaml` (verbatim):

```yaml
contribution_id: pii-scrubber-prompts
type: adoption
by:
  name: Liam Fitzgerald
  team: cards-experience
  division: Cards
statement: Adopted as a required pre-pass in our assistant pipeline; the audit numbers held on our traffic.
pipeline: cards-assistant-prompts
date: 2026-07-14
```

- [ ] **Step 6: Register routes in `check-links.mjs`**

In `site/scripts/check-links.mjs`, inside the `requiredRoutes` array, **after** the
`"/contributions/temperature-drift-evals/"` line, add:

```js
      "/contributions/retrieval-reranker-lite/", "/contributions/pii-scrubber-prompts/",
```

- [ ] **Step 7: Validate, test, derive, build**

Run (repo root): `npm run validate` → Expected: `✓ content validation passed`.
Run (repo root): `npm run derive` → Expected: `derive: 6 contributions → …` (4 existing + 2 new).
Run (repo root): `npm run build -w site` then `node site/scripts/check-links.mjs site/dist` → both PASS.
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 8: Commit**

```bash
git add -A content/benchmarks/rerank-eval-set.yaml content/contributions/retrieval-reranker-lite/ content/contributions/pii-scrubber-prompts/ content/records/ site/scripts/check-links.mjs
git commit -m "content(seed): retrieval-reranker-lite + pii-scrubber-prompts findings with records" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: Seed batch 2 — technical report + tutorial + records

Same specification style as Task 8: frontmatter/records/bundles are **verbatim**; you
author the section prose.

**Files:**
- Create: `content/contributions/batch-inference-queueing/index.md` + `bundle/README.md`
- Create: `content/contributions/prompt-regression-harness/index.md` + `bundle/README.md`
- Create records: `content/records/replications/batch-inference-queueing--markets.yaml`; `content/records/replications/prompt-regression-harness--payments.yaml`, `…--markets.yaml`
- Extend: `site/scripts/check-links.mjs` (`requiredRoutes`)

**Interfaces:**
- Consumes: frozen schemas; crossref + links rules; existing benchmark `internal-eval-suite` (reused — do not create a new one here).
- Produces: one `technical-report` (1 replication) and one `tutorial` (2 replications), each with a bundle.

- [ ] **Step 1: Contribution `batch-inference-queueing`**

Create `content/contributions/batch-inference-queueing/index.md`. Frontmatter **verbatim**:

```yaml
---
id: batch-inference-queueing
title: A priority queue in front of batch inference cut tail latency by half
tier: technical-report
authors:
  - name: Hana Kim
    team: payments-platform
    division: Payments
category: tooling
tags: [inference, latency, queueing]
status: published
created: 2026-07-12
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
result: −52% p99 latency
result_detail: 8.9s → 4.3s p99 · same throughput · 24h replay
---
```

Required headings (technical-report tier), exact and in order: `## Abstract`,
`## Background`, `## Method`, `## Results`, `## Discussion`, `## How to replicate`.

Content direction (Abstract's first sentence becomes the card summary):
- **Abstract**: a small priority queue with size-aware batching in front of the batch
  inference endpoint halved p99 latency at equal throughput over a 24h replay. 3 sentences.
- **Background**: FIFO batching let large jobs head-of-line-block small interactive ones. 2–3 sentences.
- **Method**: bucket by expected token count, admit a mixed batch under a latency SLO,
  cap batch fill time; replayed 24h of production traffic. 2–3 sentences.
- **Results**: p99 8.9s → 4.3s, throughput unchanged; note the eval-suite check that
  quality was unaffected. 2–3 sentences.
- **Discussion**: where it helps (mixed workloads) and where it doesn't (uniform sizes). 2 sentences.
- **How to replicate**: link `[bundle/README.md](bundle/README.md)`; expected delta.

Create `content/contributions/batch-inference-queueing/bundle/README.md` (verbatim):

```markdown
# Replication bundle — batch-inference-queueing

1. Replay a representative traffic window through your current batch endpoint; record p50/p99.
2. Insert a priority queue that buckets by expected token count and admits mixed batches under a latency SLO.
3. Replay again; expect p99 to fall substantially at equal throughput, with eval scores unchanged.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

- [ ] **Step 2: `batch-inference-queueing` record**

Create `content/records/replications/batch-inference-queueing--markets.yaml` (verbatim):

```yaml
contribution_id: batch-inference-queueing
replicator:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
workflow: Markets research batch scoring endpoint, 12h production traffic replay.
method: Added the size-aware priority queue in front of our batch endpoint and replayed 12h of traffic.
outcome: replicated
measured_delta: p99 -47%, throughput flat
date: 2026-07-14
```

- [ ] **Step 3: Contribution `prompt-regression-harness`**

Create `content/contributions/prompt-regression-harness/index.md`. Frontmatter **verbatim**:

```yaml
---
id: prompt-regression-harness
title: Build a prompt regression harness that fails CI on quality drops
tier: tutorial
authors:
  - name: Liam Fitzgerald
    team: cards-experience
    division: Cards
category: evals
tags: [testing, ci, regression]
status: published
created: 2026-07-11
updated: 2026-07-14
replication_bundle: bundle/
benchmarks: [internal-eval-suite]
result: catches 90% of regressions
result_detail: 9 of 10 seeded prompt regressions caught before merge
---
```

Required headings (tutorial tier), exact and in order: `## You'll need`,
`## You'll build`, `## Steps`, `## Wrap-up`.

Content direction (You'll build's first sentence becomes the card summary):
- **You'll need**: a set of representative prompts with expected outputs, a scoring
  function, Node 20+, and ~45 minutes. 1–2 sentences.
- **You'll build**: a regression harness that scores current prompts against a frozen
  baseline and fails CI when quality drops beyond a threshold. 2 sentences.
- **Steps**: numbered, copy-pasteable — (1) snapshot a baseline scoreset, (2) run the
  same prompts on each change, (3) diff against baseline with a tolerance, (4) wire it
  into CI as a blocking check. 4 steps.
- **Wrap-up**: link `[bundle/README.md](bundle/README.md)`; note it caught 9/10 seeded
  regressions and invite a replication record.

Create `content/contributions/prompt-regression-harness/bundle/README.md` (verbatim):

```markdown
# Replication bundle — prompt-regression-harness

1. Freeze a baseline scoreset for a representative prompt set.
2. On each change, re-score the same prompts and diff against the baseline with a tolerance.
3. Seed 10 known regressions and confirm the harness catches most of them before merge.

Submit your result as a replication record (see `content/schemas/replication.schema.json`).
```

- [ ] **Step 4: `prompt-regression-harness` records**

Create `content/records/replications/prompt-regression-harness--payments.yaml` (verbatim):

```yaml
contribution_id: prompt-regression-harness
replicator:
  name: Hana Kim
  team: payments-platform
  division: Payments
benchmark_id: internal-eval-suite
method: Stood up the harness on our payments prompt set and seeded ten known regressions.
outcome: replicated
measured_delta: 8 of 10 seeded regressions caught
date: 2026-07-14
```

Create `content/records/replications/prompt-regression-harness--markets.yaml` (verbatim):

```yaml
contribution_id: prompt-regression-harness
replicator:
  name: Sofia Marchetti
  team: markets-analytics
  division: Markets
workflow: Markets summarization prompt suite wired into our pre-merge CI pipeline.
method: Ported the baseline-diff harness into our CI and ran it against seeded regressions.
outcome: replicated
measured_delta: 9 of 10 seeded regressions caught
date: 2026-07-14
```

- [ ] **Step 5: Register routes in `check-links.mjs`**

In `site/scripts/check-links.mjs`, inside `requiredRoutes`, **after** the
`"/contributions/pii-scrubber-prompts/"` line added in Task 8, add:

```js
      "/contributions/batch-inference-queueing/", "/contributions/prompt-regression-harness/",
```

- [ ] **Step 6: Validate, test, derive, build**

Run (repo root): `npm run validate` → PASS.
Run (repo root): `npm run derive` → Expected: `derive: 8 contributions → …`.
Run (repo root): `npm run build -w site` then `node site/scripts/check-links.mjs site/dist` → PASS.
Run (repo root): `npm test --workspaces` → PASS.

- [ ] **Step 7: Commit**

```bash
git add -A content/contributions/batch-inference-queueing/ content/contributions/prompt-regression-harness/ content/records/ site/scripts/check-links.mjs
git commit -m "content(seed): batch-inference-queueing report + prompt-regression-harness tutorial" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 10: Seed batch 3 — two notes + dogfood the `publish` skill

Two `note` contributions (no required headings; body ≥100 chars). One of them,
`eval-rubric-drift`, is **published through the `publish` skill's no-remote path**, and
the session transcript is captured into its bundle — the dogfooding proof for CP-B.

**Files:**
- Create: `content/contributions/context-window-budgeting/index.md`
- Create: `content/contributions/eval-rubric-drift/index.md` + `bundle/publish-walkthrough.md`
- Create record: `content/records/endorsements/eval-rubric-drift--institutional.yaml`
- Extend: `site/scripts/check-links.mjs` (`requiredRoutes`)

**Interfaces:**
- Consumes: `note` template shape (freeform, ≥100 chars, no `##` requirements); the `publish` skill (Task 6); the validator.
- Produces: two published notes; one endorsement; a committed `bundle/publish-walkthrough.md` transcript. `context-window-budgeting` has **no records** (fresh note); `eval-rubric-drift` has **one endorsement**.

- [ ] **Step 1: Contribution `context-window-budgeting` (no records)**

Create `content/contributions/context-window-budgeting/index.md`. Frontmatter **verbatim**:

```yaml
---
id: context-window-budgeting
title: Budget the context window like memory, not like a bucket
tier: note
authors:
  - name: Priyanka Nair
    team: ib-quant
    division: Institutional
category: agents
tags: [context, agents, cost]
status: published
created: 2026-07-13
updated: 2026-07-14
---
```

Body (no `##` headings required; ≥100 chars). Content direction: 2–3 short paragraphs
arguing that agents should treat the window as a budget with reserved allocations
(system, working set, scratch) rather than filling it greedily; give one concrete
allocation split and one observed failure mode when the scratch region starves. Write
a strong first sentence — it becomes the card summary.

- [ ] **Step 2: Contribution `eval-rubric-drift` (published via the publish skill)**

Create `content/contributions/eval-rubric-drift/index.md`. Frontmatter **verbatim**:

```yaml
---
id: eval-rubric-drift
title: Your LLM-judge rubric drifts — pin it and diff it every run
tier: note
authors:
  - name: Tomas Vidal
    team: risk-engineering
    division: Risk
category: evals
tags: [llm-judge, drift, evals]
status: published
created: 2026-07-13
updated: 2026-07-14
---
```

Body (freeform, ≥100 chars). Content direction: 2–3 paragraphs on how an LLM-judge's
effective rubric drifts as the judge model or its prompt changes, so scores move
without any change to the system under test; recommend version-pinning the judge and
its rubric and diffing the rubric text every run. First sentence is the card summary.

Create `content/records/endorsements/eval-rubric-drift--institutional.yaml` (verbatim):

```yaml
contribution_id: eval-rubric-drift
type: endorsement
by:
  name: Priyanka Nair
  team: ib-quant
  division: Institutional
statement: We saw exactly this drift last quarter; pinning the judge rubric explained a score swing we had blamed on the model.
date: 2026-07-14
```

- [ ] **Step 3: Register routes in `check-links.mjs`**

In `site/scripts/check-links.mjs`, inside `requiredRoutes`, **after** the
`"/contributions/prompt-regression-harness/"` line added in Task 9, add:

```js
      "/contributions/context-window-budgeting/", "/contributions/eval-rubric-drift/",
```

- [ ] **Step 4: Dogfood `publish` on `eval-rubric-drift` (no-remote path)**

Do NOT `git add`/commit the new files on `main`. Instead follow the `publish` skill's
non-interactive, no-remote path **for real** and capture the transcript. Run this exact
sequence from the repo root (the two notes + endorsement + check-links edit are already
in the working tree from Steps 1–3):

```bash
# 1. Validator is the only gate (blocking):
npm run validate

# 2. Branch for the contribution:
git checkout -b contribute/eval-rubric-drift

# 3. Stage this contribution + its record (and the shared check-links route edit):
git add content/contributions/context-window-budgeting/ content/contributions/eval-rubric-drift/ content/records/endorsements/eval-rubric-drift--institutional.yaml site/scripts/check-links.mjs

# 4. Commit on the branch with the trailer:
git commit -m "contribute(eval-rubric-drift): pin and diff your LLM-judge rubric" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"

# 5. No-remote fallback — print (do NOT push), because platform.config.json repo is null:
git branch --show-current
echo "No git remote configured (platform.config.json repo: null)."
echo "Local branch contribute/eval-rubric-drift is committed. To publish once a remote exists:"
echo "  git remote add origin <REMOTE_URL>"
echo "  git push -u origin contribute/eval-rubric-drift"
echo "  gh pr create --fill --base main --head contribute/eval-rubric-drift"
```

Capture the **verbatim stdout/stderr** of steps 1–5 (validator line, branch-created
line, commit summary, the printed fallback block) — this is the dogfood transcript.

- [ ] **Step 5: Store the transcript, then merge the branch back**

Create `content/contributions/eval-rubric-drift/bundle/publish-walkthrough.md` with this
exact header, then paste the captured transcript into the fenced block (the command
lines are fixed; the runtime output is captured verbatim from Step 4):

```markdown
# publish — dogfood transcript (no-remote path)

Contribution: `eval-rubric-drift`. Executed the `publish` skill's non-interactive,
no-remote path (validate -> branch -> commit -> printed fallback). Proof for CP-B that
the flow works end to end on a machine with no git remote.

## Transcript

```text
<PASTE the verbatim stdout/stderr of Task 10 Step 4, commands 1–5, here>
```

## Result

- Validator exited 0 (blocking gate passed).
- Local branch `contribute/eval-rubric-drift` created with one commit.
- No push/PR attempted (repo is null); exact later-commands printed above.
```

Then commit the transcript on the branch and merge back to the cycle branch (`c2-toolkit-content` — NOT `main`; the cycle merges to main only at the CP-B gate):

```bash
git add content/contributions/eval-rubric-drift/bundle/publish-walkthrough.md
git commit -m "contribute(eval-rubric-drift): capture publish-skill dogfood transcript" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git checkout c2-toolkit-content
git merge --no-ff contribute/eval-rubric-drift -m "merge: eval-rubric-drift via publish-skill dogfood" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
git branch -d contribute/eval-rubric-drift
```

(The `bundle/` dir is not declared as `replication_bundle` in the note's frontmatter and
is not linked from `index.md`, so the validator's links/bundle rules do not touch it —
it is simply an attached artifact.)

- [ ] **Step 6: Validate, test, derive, build (on `c2-toolkit-content` after merge)**

Run (repo root): `npm run validate` → PASS.
Run (repo root): `npm run derive` → Expected: `derive: 10 contributions → …`.
Run (repo root): `npm run build -w site` then `node site/scripts/check-links.mjs site/dist` → PASS.
Run (repo root): `npm test --workspaces` → PASS.
Confirm the merge already committed everything: `git status --porcelain` is empty.

(No extra commit needed — Task 10 committed via the branch merge. If `check-links.mjs`
or the notes ended up on the cycle branch outside the merge for any reason, `git status` will show
it; stage and commit with the same trailer.)

---

### Task 11: Cycle verification + docs + CONTRACTS.md CP-B

**Files:**
- Test: `site/test/cycle2-counts.test.js`
- Create: `README.md` (repo root), `toolkit/README.md`
- Modify: `CONTRACTS.md` (fill the CP-B section: planned → frozen)

**Interfaces:**
- Consumes: `derive()` + `loadContent()` output; `site/src/data/*.json`; `toolkit.json`; the full pipeline.
- Produces: a green end-to-end cycle gate; docs pointing at the toolkit; CP-B contracts frozen with the exact shapes shipped.

- [ ] **Step 1: Write the cycle-counts test**

Create `site/test/cycle2-counts.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { derive } from "../scripts/derive.mjs";
import { loadContent } from "@openresearch/validator/load";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));

test("record has reached 10 published contributions", () => {
  const { stats, cards } = derive(contentRoot, { rev: () => "test" });
  assert.equal(stats.contributions, 10);
  assert.equal(cards.length, 10);
});

test("author team + division spread: >=4 teams across >=3 divisions", () => {
  const { contributions } = loadContent(contentRoot);
  const published = contributions.filter((c) => c.frontmatter.status === "published");
  const teams = new Set();
  const divisions = new Set();
  for (const c of published) {
    for (const a of c.frontmatter.authors) {
      teams.add(a.team);
      if (a.division) divisions.add(a.division);
    }
  }
  assert.ok(teams.size >= 4, `expected >=4 author teams, got ${teams.size}`);
  assert.ok(divisions.size >= 3, `expected >=3 divisions, got ${divisions.size}`);
});

test("toolkit.json shape matches plugin.json version and skill roster", () => {
  const toolkit = JSON.parse(readFileSync(fileURLToPath(new URL("../src/data/toolkit.json", import.meta.url)), "utf8"));
  const plugin = JSON.parse(readFileSync(fileURLToPath(new URL("../../toolkit/plugins/openresearch/.claude-plugin/plugin.json", import.meta.url)), "utf8"));
  assert.equal(toolkit.name, "openresearch");
  assert.equal(toolkit.version, plugin.version);
  assert.equal(toolkit.version, "0.3.0");
  assert.equal(toolkit.skills.length, 5);
  assert.equal(toolkit.skills.filter((s) => !s.shipsIn).length, 3);
  assert.equal(toolkit.skills.filter((s) => s.shipsIn === "M7").length, 2);
  assert.equal(toolkit.install.init, "npx openresearch init");
  assert.equal(toolkit.install.marketplaceAdd, "claude plugin marketplace add ./toolkit");
});
```

(The `toolkit.json` test depends on `npm run derive` having run in this checkout — Step 3
runs it before the tests, and `site` build always derives first, so `src/data/toolkit.json`
is present.)

- [ ] **Step 2: Create `toolkit/README.md`**

```markdown
# OpenResearch toolkit

A standard Claude Code plugin marketplace plus a zero-dependency installer.

## Install

```
npx openresearch init
```

or add the marketplace by hand:

```
claude plugin marketplace add ./toolkit
claude plugin install openresearch@openresearch
```

`npx openresearch doctor` checks node ≥20, the `claude`/`gh` CLIs, and the validator.
`npx openresearch update [--version <semver>]` re-resolves and reinstalls the pinned
plugin version. Every command accepts `--dry-run` to print the exact commands it would run.

## Plugin: `openresearch` (v0.3.0)

Instruction-only skills (they name exact shell commands; no API keys, no provider code):

| skill | what it does | status |
|---|---|---|
| `judge` | Advisory three-axis review (clarity / claims-vs-evidence / reproducibility), never blocking. | ready |
| `paper-reader` | Structured read of one contribution and its evidence. | ready |
| `publish` | Validate → judge → branch `contribute/<id>` → PR (or no-remote fallback). | ready |
| `try-this-paper` | Run a contribution's bundle against your workflow. | ships in M7 |
| `write-replication` | Turn a replication run into a record. | ships in M7 |

## Layout

```
toolkit/
├─ marketplace.json                 # marketplace manifest + skill roster
├─ plugins/openresearch/
│  ├─ .claude-plugin/plugin.json    # name, version (pinning anchor), description
│  ├─ mcp/README.md                 # M7 placeholder (no dead config)
│  └─ skills/{judge,paper-reader,publish}/{SKILL.md,walkthrough.md}
└─ installer/                       # npm package `openresearch` (bin: openresearch)
```

Portability is governed by `platform.config.json` at the repo root (`repo: null` =
no-remote mode: publish prints exact push/PR commands instead of calling `gh`).
```

- [ ] **Step 3: Create the root `README.md`**

There is no root README yet. Create `README.md`:

```markdown
# OpenResearch

The internal record of applied AI research: findings your colleagues have already
verified, each carrying its evidence (who replicated it, on which benchmark, what it
changed).

## Layout

- `content/` — contributions, replication/endorsement records, benchmark registry.
- `content/validator/` — the schema/template/crossref/links/secrets validator
  (`npm run validate`). The single content parser; site and CI both consume its loader.
- `site/` — the Astro site. `npm run site:build` derives `content/` → `site/src/data/*.json`
  and renders it.
- `toolkit/` — the Claude Code plugin marketplace + `openresearch` installer. See
  [`toolkit/README.md`](toolkit/README.md). Install with `npx openresearch init`.
- `platform.config.json` — portability seam (host / repo / site / judge / mcp).
  `repo: null` = no-remote mode.
- `CONTRACTS.md` — frozen feature contracts. Designs are flexible; contracts are not.

## Commands

```
npm install
npm run validate          # validate all content
npm test --workspaces     # unit tests (validator, site, installer)
npm run site:build        # derive + build the site + index it
```
```

- [ ] **Step 4: Freeze CP-B in `CONTRACTS.md`**

In `CONTRACTS.md`, **remove** the `- **CP-B (M3+M4):** …` bullet from the "## Planned
freezes" section, and **add** a new frozen section immediately after the "## Frozen at
CP-A …" table (before "## Planned freezes"):

```markdown
## Frozen at CP-B (M3 + M4, 2026-07-14)

| Contract | Definition lives at | Notes |
|---|---|---|
| Portability seam keys | `platform.config.json` | Exactly `name`, `host`, `repo` (null = no-remote), `site.baseUrl`, `judge.ci`, `mcp.enabled`. `site/src/config.mjs` derives `config.repoUrl = repo ? https://host/repo : null` |
| Marketplace shape | `toolkit/marketplace.json` | `{ name, owner{name,url}, plugins:[{ name, source, description, skills:[{name,purpose,shipsIn}] }] }`; `shipsIn: null` = shipped, `"M<N>"` = upcoming |
| Plugin manifest | `toolkit/plugins/openresearch/.claude-plugin/plugin.json` | `{ name, version, description, author }`; `version` is the installer's pinning anchor (0.3.0) |
| Skill CLI names | `toolkit/plugins/openresearch/skills/` | `judge`, `paper-reader`, `publish` (SKILL.md instruction docs; advisory `judge` never blocks) |
| Installer commands | `toolkit/installer/bin/openresearch.mjs` | `openresearch init` / `update [--version <semver>]` / `doctor`, all with `--dry-run`; bin name `openresearch` |
| Toolkit derive output | `site/scripts/derive.mjs` → `site/src/data/toolkit.json` | `{ name, version, description, source, skills:[{name,purpose,shipsIn}], install:{init, marketplaceAdd} }` (additive; existing derive outputs unchanged) |
| No-remote fallback | `publish` skill + installer | When `platform.config.json.repo` is null, flows print exact push/PR commands instead of calling `gh` |
```

- [ ] **Step 5: Full pipeline green + dist grep checks**

Run, from the repo root, in order:

```bash
npm run validate
npm run derive
npm test --workspaces
npm run build -w site
node site/scripts/check-links.mjs site/dist
```

Expected: validator `✓`; `derive: 10 contributions → …`; all tests pass (including
`cycle2-counts.test.js`); site build succeeds; check-links `✓`.

`/toolkit` dist grep checks (repo root):

```bash
grep -c "npx openresearch init" site/dist/toolkit/index.html   # >= 1
grep -c "ships in M7" site/dist/toolkit/index.html             # == 2
grep -c "v0.3.0" site/dist/toolkit/index.html                  # >= 1
```

- [ ] **Step 6: Commit**

```bash
git add -A site/test/cycle2-counts.test.js README.md toolkit/README.md CONTRACTS.md
git commit -m "docs(cycle2): freeze CP-B contracts, add READMEs, cycle-counts verification" -m "Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

## Self-review (spec-delta coverage)

Every section of the design delta maps to a task:

| Design-delta section | Task(s) |
|---|---|
| Plugin structure (`toolkit/` tree) | 3 (marketplace/plugin/mcp), 2 (installer), 4–6 (skills) |
| The three skills (`publish`, `paper-reader`, `judge`) | 6, 5, 4 |
| Installer (`init`/`update`/`doctor`, `--dry-run`, `--version`, doctor probes) | 2 |
| `platform.config.json` (keys) + `config.mjs` reads it | 1 |
| `/toolkit` page (derive → `toolkit.json`, plugin card, skill rows, install panel) | 7 |
| Seed content (6 contributions, roster teams/divisions) | 8, 9, 10 |
| ≥4 teams, ≥3 divisions; team/division stay frontmatter strings | 8–10 authorship + 11 assertion |
| One seed published via `publish` skill, transcript in bundle | 10 |
| New benchmark `rerank-eval-set`; reuse `internal-eval-suite`/`policy-rag-bench` | 8 (new), 9 (reuse) |
| Records pass M1 validator untouched; counts verified via derive | 8–10 + 11 |
| CI stays green with new volume | 11 (full pipeline) |
| `judge` CI variant written-but-disabled behind `judge.ci` | 4 (SKILL.md CI section; no workflow while `judge.ci:false`) |
| CP-B contracts frozen | 11 |

Cross-task type/name consistency: the `toolkit.json` shape emitted in Task 7 is exactly
what Task 11 asserts (`name`, `version`, `description`, `source`, `skills[{name,purpose,shipsIn}]`,
`install{init,marketplaceAdd}`); the installer plan arg-arrays in Task 2 are asserted by the
same task's tests; `platform.config.json` keys in Task 1 are the keys frozen in Task 11.
No placeholders (`TBD`, "similar to task N", "add appropriate X") remain. Frozen CP-A
contracts are untouched: `derive()`'s four outputs keep their shapes (toolkit.json is a
separate additive function), routes are unchanged, and `config.repoUrl` is preserved.
```
---

## Execution deltas (recorded at final review, 2026-07-14)

Deviations from this plan's literal text, all reviewed and approved during SDD execution:

1. **Task 1 — `config.mjs` resolves `platform.config.json` via `process.cwd()`**, not `import.meta.url`: Vite relocates the module into `site/dist/chunks/` at build, breaking relative-URL resolution. Verified cwd = `site/` in every real invocation context. Corollary: `derive.mjs` must never import `config.mjs` (it runs with cwd = repo root); its CLI reads the config via `import.meta.url` directly.
2. **Task 2 — root package renamed `openresearch-monorepo`** (collision with the installer package name); `package-lock.json` committed with the workspace addition.
3. **Task 2 — Windows real-run fixes**: `resolveExecutable` export added; `runPlan` spawns `.cmd`/`.bat` shims via scoped shell with space-quoted args; missing-`claude` real runs print ALL manual commands and exit 0 without spawning; three tests cover the previously untested `main()` surface.
4. **Task 6 — publish step 4 wires the existing-branch fallback** (`checkout -b` → `checkout` + amend on re-run), resolving the Procedure/Rules contradiction.
5. **Task 10 — note openings are plain text** (markdown italic spans broke `firstSentence()` card derivation; CSS supplies the note lede italic); dogfood transcript gained a Scope note (judge is session-interactive, outside the non-interactive path per the cycle spec).
6. **Task 10 — dogfood merged into `c2-toolkit-content`**, not `main` (plan fixed pre-execution; cycle merges to main only at CP-B).
7. **Task 11 / final batch — cycle-count test is a `>=10` floor** (exact equality would break when CP-E adds contributions); CONTRACTS.md dry-run wording scoped to init/update; transcript intro scoped to the no-remote flow.

Deferred minors are tracked in `.superpowers/sdd/progress.md` (C2 sections).
