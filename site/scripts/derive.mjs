import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { firstSentence, slugifyName } from "../src/lib/format.mjs";

function gitRev(file) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%h", "--", file], { encoding: "utf8" }).trim();
    return out || null;
  } catch {
    return null; // no git history available (e.g. tarball checkout) — citation omits the revision
  }
}

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

export function derive(contentRoot, { rev = gitRev, log = gitLog } = {}) {
  const content = loadContent(contentRoot);
  if (content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`derive: content has errors — run npm run validate\n${lines.join("\n")}`);
  }

  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const reps = content.replications.map((r) => r.data);
  const endos = content.endorsements.map((e) => e.data);
  const adopts = content.adoptions.map((a) => a.data);
  const revws = (content.reviews ?? []).map((r) => r.data);

  // Review status ladder: human review outranks machine review outranks none.
  const reviewStatusOf = (id) => {
    const mine = revws.filter((r) => r.contribution_id === id);
    if (mine.some((r) => r.reviewer.kind === "human")) return "human";
    if (mine.length > 0) return "machine";
    return "none";
  };

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
      authors: fm.authors.map((a) => a.name),
      reviewStatus: reviewStatusOf(fm.id)
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
      adoptions: adopts.filter((a) => a.contribution_id === id).map((a) => ({
        team: a.adopter.team,
        pipeline: a.pipeline,
        status: a.status,
        impact: a.impact ?? null,
        since: a.since,
        date: a.date
      })),
      reviews: revws.filter((r) => r.contribution_id === id).map((r) => ({
        reviewer: r.reviewer.kind === "human"
          ? { kind: "human", name: r.reviewer.name, team: r.reviewer.team }
          : { kind: "llm-judge", model: r.reviewer.model },
        verdicts: { ...r.verdicts },
        statement: r.statement,
        suggestions: r.suggestions ?? [],
        override: r.override
          ? { by: `${r.override.by.name} · ${r.override.by.team}`, reason: r.override.reason, date: r.override.date }
          : null,
        date: r.date
      })),
      changelog: log(c.dir),
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

// ---- Arena scoring (Cycle 3, CP-C). Point values are contract; see the plan's Global Constraints. ----
const POINTS = {
  authored: 10,
  replicationReceived: 15,
  replicationPerformed: 12,
  adoption: 8,
  adoptionImpactBonus: 4,
  endorsement: 3,
  reviewPerformed: 5
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
        breakdown: { authored: 0, replicationsReceived: 0, replicationsPerformed: 0, adoptions: 0, endorsements: 0, reviewsPerformed: 0 },
        contributions: [], replicationsPerformed: [], reviewsPerformed: [], received: []
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

  // 5. Reviews (human only — the machine referee is staff, not faculty; self-review scores 0)
  for (const rv of byFile(content.reviews ?? [])) {
    const rec = rv.data;
    if (rec.reviewer.kind !== "human") continue;
    const c = byId.get(rec.contribution_id);
    if (!c) continue;
    if (c.frontmatter.authors.some((a) => a.name === rec.reviewer.name)) continue;
    credit(rec.reviewer.name, rec.reviewer.team, rec.reviewer.division, POINTS.reviewPerformed);
    const p = person(rec.reviewer.name);
    p.breakdown.reviewsPerformed += 1;
    p.reviewsPerformed.push({ slug: c.dirName, title: c.frontmatter.title, date: rec.date });
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

export function derivePeople(content) {
  const model = buildScoreModel(content);
  const out = {};
  model.individuals.forEach((ind, i) => {
    out[ind.handle] = {
      handle: ind.handle, name: ind.name, team: ind.team, division: ind.division,
      rank: i + 1, score: ind.score, breakdown: { ...ind.breakdown },
      contributions: ind.contributions,
      replicationsPerformed: ind.replicationsPerformed,
      reviewsPerformed: ind.reviewsPerformed,
      received: ind.received
    };
  });
  return out;
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

// ---- Watchlist (Cycle 4, CP-D). Additive derive output. ----
const WATCH_RANK = { tested: 0, claimed: 1, watching: 2 };

export function deriveWatchlist(content) {
  const byId = new Map(content.contributions.map((c) => [c.frontmatter.id, c]));
  const person = (p) => (p ? { name: p.name, team: p.team } : null);
  const rows = content.watchlist.map((w) => {
    const d = w.data;
    const rc = d.resulting_contribution ? byId.get(d.resulting_contribution) : null;
    return {
      id: d.id,
      title: d.title,
      source_url: d.source_url,
      venue: d.venue ?? null,
      added_by: person(d.added_by),
      status: d.status,
      claimed_by: person(d.claimed_by),
      resulting_contribution: rc ? { slug: rc.dirName, title: rc.frontmatter.title } : null
    };
  });
  rows.sort((a, b) => (WATCH_RANK[a.status] - WATCH_RANK[b.status]) || a.title.localeCompare(b.title));
  return rows;
}

// ---- Benchmark registry (Cycle 4, CP-D). Additive derive output. ----
export function deriveBenchmarks(content) {
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const publishedIds = new Set(published.map((c) => c.frontmatter.id));
  return content.benchmarks.map((b) => {
    const bm = b.data;
    const contributions = published
      .filter((c) => (c.frontmatter.benchmarks ?? []).includes(bm.id))
      .map((c) => ({ slug: c.dirName, title: c.frontmatter.title }));
    const replications = content.replications
      .map((r) => r.data)
      .filter((r) => r.benchmark_id === bm.id && publishedIds.has(r.contribution_id))
      .map((r) => ({ slug: r.contribution_id, team: r.replicator.team, outcome: r.outcome, delta: r.measured_delta ?? null, date: r.date }));
    return {
      id: bm.id,
      owner: { name: bm.owner.name, team: bm.owner.team },
      description: bm.description,
      data_pointer: bm.data_pointer,
      metrics: (bm.metrics ?? []).map((m) => ({ name: m.name, definition: m.definition, higher_is_better: m.higher_is_better ?? null })),
      contributions,
      replications
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
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
    const arenaContent = loadContent(contentRoot);
    const arena = deriveArena(arenaContent);
    writeFileSync(join(outDir, "arena.json"), JSON.stringify(arena, null, 2));
    const people = derivePeople(arenaContent);
    writeFileSync(join(outDir, "people.json"), JSON.stringify(people, null, 2));
    writeFileSync(join(outDir, "watchlist.json"), JSON.stringify(deriveWatchlist(arenaContent), null, 2));
    writeFileSync(join(outDir, "benchmarks.json"), JSON.stringify(deriveBenchmarks(arenaContent), null, 2));
    console.log(`derive: ${stats.contributions} contributions → ${outDir}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
