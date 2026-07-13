// Portability seam (CP-B): the single source of truth for host/repo/site/judge/mcp.
// Reads platform.config.json at the repo root. config.repoUrl stays the public field
// that ActionRow.astro consumes; it is now derived from host + repo.
//
// Path resolution note (deviation from the brief's literal `import.meta.url`-relative
// snippet): Astro/Vite inlines this module's code into a page-rendering chunk under
// site/dist/chunks/ during `astro build`, so import.meta.url points at the chunk's
// emitted location, not this source file's location — "../../platform.config.json"
// then resolves to site/platform.config.json (ENOENT), breaking `npm run build -w site`.
// process.cwd() is bundler-proof here because both `node --test` and `astro build` are
// always invoked with cwd = site/ (see repo constraints), so the repo root is always
// exactly one level up.
import { readFileSync } from "node:fs";
import path from "node:path";

const platformPath = path.resolve(process.cwd(), "..", "platform.config.json");

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
  mcpEnabled: platform.mcp?.enabled ?? false,
  discussionsEnabled: platform.discussions?.enabled ?? false
};
