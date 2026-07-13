import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { firstSentence } from "../src/lib/format.mjs";

function gitRev(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%h", "--", file], { encoding: "utf8" }).trim();
    return out || null;
  } catch {
    return null; // no git history available (e.g. tarball checkout) — citation omits the revision
  }
}

function sectionText(body, heading) {
  const lines = body.split("\n");
  const start = lines.findIndex((l) => l.trim() === `## ${heading}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return rest.slice(0, end === -1 ? rest.length : end).join("\n").trim() || null;
}

function summaryOf(c) {
  for (const h of ["Summary", "Abstract", "You'll build"]) {
    const s = sectionText(c.body, h);
    if (s) return firstSentence(s);
  }
  const para = c.body.split(/\n\s*\n/).map((p) => p.trim()).find((p) => p && !p.startsWith("#"));
  return para ? firstSentence(para) : "";
}

function countSorted(values) {
  const counts = new Map();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function derive(contentRoot, { rev = gitRev } = {}) {
  const content = loadContent(contentRoot);
  if (content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`derive: content has errors — run npm run validate\n${lines.join("\n")}`);
  }

  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const reps = content.replications.map((r) => r.data);
  const endos = content.endorsements.map((e) => e.data);

  const cards = published.map((c) => {
    const fm = c.frontmatter;
    const mine = reps.filter((r) => r.contribution_id === fm.id);
    const verified = mine.filter((r) => r.outcome === "replicated");
    return {
      slug: c.dirName,
      title: fm.title,
      tier: fm.tier,
      category: fm.category,
      tags: fm.tags,
      date: fm.updated,
      summary: summaryOf(c),
      replications: verified.length,
      teams: new Set(verified.map((r) => r.replicator.team)).size,
      result: fm.result ?? null,
      authors: fm.authors.map((a) => a.name)
    };
  }).sort((a, b) => b.date.localeCompare(a.date));

  const publishedIds = new Set(published.map((c) => c.frontmatter.id));
  const verifiedAll = reps.filter((r) => r.outcome === "replicated" && publishedIds.has(r.contribution_id));

  const stats = {
    contributions: published.length,
    replications: verifiedAll.length,
    teams: new Set(verifiedAll.map((r) => r.replicator.team)).size
  };

  const filters = {
    tiers: countSorted(cards.map((c) => c.tier)),
    categories: countSorted(cards.map((c) => c.category)),
    tags: countSorted(cards.flatMap((c) => c.tags))
  };

  const evidence = {};
  for (const c of published) {
    const id = c.frontmatter.id;
    evidence[c.dirName] = {
      replications: reps.filter((r) => r.contribution_id === id).map((r) => ({
        team: r.replicator.team,
        delta: r.measured_delta ?? null,
        benchmark: r.benchmark_id ?? "own workflow",
        date: r.date,
        outcome: r.outcome
      })),
      endorsements: endos.filter((e) => e.contribution_id === id).map((e) => ({
        type: e.type,
        quote: e.statement,
        by: `${e.by.name} · ${e.by.team}`,
        date: e.date
      })),
      rev: rev(c.file)
    };
  }

  return { stats, cards, filters, evidence };
}

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

// CLI: node scripts/derive.mjs [contentRoot] [outDir]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contentRoot = process.argv[2] ?? fileURLToPath(new URL("../../content", import.meta.url));
  const outDir = process.argv[3] ?? fileURLToPath(new URL("../src/data", import.meta.url));
  try {
    const { stats, cards, filters, evidence } = derive(contentRoot);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "stats.json"), JSON.stringify(stats, null, 2));
    writeFileSync(join(outDir, "cards.json"), JSON.stringify(cards, null, 2));
    writeFileSync(join(outDir, "filters.json"), JSON.stringify(filters, null, 2));
    writeFileSync(join(outDir, "evidence.json"), JSON.stringify(evidence, null, 2));
    const toolkitDir = fileURLToPath(new URL("../../toolkit", import.meta.url));
    const platform = JSON.parse(readFileSync(fileURLToPath(new URL("../../platform.config.json", import.meta.url)), "utf8"));
    const toolkit = deriveToolkit(toolkitDir, { repo: platform.repo, host: platform.host });
    writeFileSync(join(outDir, "toolkit.json"), JSON.stringify(toolkit, null, 2));
    console.log(`derive: ${stats.contributions} contributions → ${outDir}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
