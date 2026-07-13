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
