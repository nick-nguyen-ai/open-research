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
