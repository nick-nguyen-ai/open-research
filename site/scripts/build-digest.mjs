import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { slugifyName } from "../src/lib/format.mjs";

const WINDOW_DAYS = 7;
const POINTS = { authored: 10, replicationReceived: 15, replicationPerformed: 12, adoption: 8, adoptionImpactBonus: 4, endorsement: 3 };

function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Deterministic, port-stable window: anchor = the latest date in content (floored at now()),
// so the digest is never empty no matter when the site is built.
export function buildDigest(content, { now = () => new Date() } = {}) {
  if (content.errors && content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`build-digest: content has errors — run npm run validate\n${lines.join("\n")}`);
  }
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const byId = new Map(published.map((c) => [c.frontmatter.id, c]));

  const dates = [];
  for (const c of published) dates.push(c.frontmatter.updated);
  for (const r of content.replications) dates.push(r.data.date);
  for (const a of content.adoptions) dates.push(a.data.date);
  for (const e of content.endorsements) dates.push(e.data.date);
  const latest = dates.filter(Boolean).sort().at(-1) ?? now().toISOString().slice(0, 10);
  const anchor = latest; // floored at latest content activity; port-stable
  const start = addDays(anchor, -(WINDOW_DAYS - 1));
  const inWindow = (d) => d && d >= start && d <= anchor;

  const contributions = published
    .filter((c) => inWindow(c.frontmatter.updated))
    .map((c) => ({ slug: c.dirName, title: c.frontmatter.title, tier: c.frontmatter.tier, date: c.frontmatter.updated }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const replications = content.replications.map((r) => r.data)
    .filter((r) => inWindow(r.date) && byId.has(r.contribution_id))
    .map((r) => ({ slug: r.contribution_id, team: r.replicator.team, outcome: r.outcome, delta: r.measured_delta ?? null, date: r.date }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const adoptions = content.adoptions.map((a) => a.data)
    .filter((a) => inWindow(a.date) && byId.has(a.contribution_id))
    .map((a) => ({ slug: a.contribution_id, team: a.adopter.team, status: a.status, date: a.date }))
    .sort((a, b) => b.date.localeCompare(a.date));

  // Movers: in-window scoring events with the arena's weights.
  const pts = new Map(); // name -> points
  const bump = (name, n) => pts.set(name, (pts.get(name) ?? 0) + n);
  for (const c of published) {
    if (!inWindow(c.frontmatter.updated)) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.authored);
  }
  for (const r of content.replications.map((x) => x.data)) {
    if (!inWindow(r.date) || r.outcome !== "replicated") continue;
    const c = byId.get(r.contribution_id);
    if (!c) continue;
    const authorTeams = new Set(c.frontmatter.authors.map((a) => a.team));
    if (authorTeams.has(r.replicator.team)) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.replicationReceived);
    bump(r.replicator.name, POINTS.replicationPerformed);
  }
  for (const a of content.adoptions.map((x) => x.data)) {
    if (!inWindow(a.date) || a.status === "retired") continue;
    const c = byId.get(a.contribution_id);
    if (!c) continue;
    for (const au of c.frontmatter.authors) bump(au.name, POINTS.adoption + (a.impact ? POINTS.adoptionImpactBonus : 0));
  }
  for (const e of content.endorsements.map((x) => x.data)) {
    if (!inWindow(e.date)) continue;
    const c = byId.get(e.contribution_id);
    if (!c) continue;
    const p = e.type === "adoption" ? POINTS.adoption : POINTS.endorsement;
    for (const au of c.frontmatter.authors) bump(au.name, p);
  }
  const movers = [...pts.entries()]
    .map(([name, points]) => ({ handle: slugifyName(name), name, points }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .slice(0, 5);

  return { anchor, window: { start, end: anchor }, contributions, replications, adoptions, movers, generated: now().toISOString().slice(0, 10) };
}

// CLI: node scripts/build-digest.mjs [contentRoot] [outDir]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contentRoot = process.argv[2] ?? fileURLToPath(new URL("../../content", import.meta.url));
  const outDir = process.argv[3] ?? fileURLToPath(new URL("../src/data", import.meta.url));
  try {
    const digest = buildDigest(loadContent(contentRoot));
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "digest.json"), JSON.stringify(digest, null, 2));
    console.log(`build-digest: window ${digest.window.start}..${digest.window.end} → ${join(outDir, "digest.json")}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
