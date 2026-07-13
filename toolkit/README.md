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

## Plugin: `openresearch` (v0.4.0)

Instruction-only skills (they name exact shell commands; no API keys, no provider code):

| skill | what it does | status |
|---|---|---|
| `judge` | Advisory three-axis review (clarity / claims-vs-evidence / reproducibility), never blocking. | ready |
| `paper-reader` | Structured read of one contribution and its evidence. | ready |
| `publish` | Validate → judge → branch `contribute/<id>` → PR (or no-remote fallback). | ready |
| `try-this-paper` | Run a contribution's bundle against your workflow. | ready |
| `write-replication` | Turn a replication run into a record. | ready |

## Layout

```
toolkit/
├─ marketplace.json                 # marketplace manifest + skill roster
├─ plugins/openresearch/
│  ├─ .claude-plugin/plugin.json    # name, version (pinning anchor), description
│  ├─ mcp/server.mjs                # Q&A MCP server (stdio JSON-RPC 2.0) + DEMO.md transcript
│  └─ skills/{judge,paper-reader,publish,try-this-paper,write-replication}/{SKILL.md,walkthrough.md}
└─ installer/                       # npm package `openresearch` (bin: openresearch)
```

Portability is governed by `platform.config.json` at the repo root (`repo: null` =
no-remote mode: publish prints exact push/PR commands instead of calling `gh`).
