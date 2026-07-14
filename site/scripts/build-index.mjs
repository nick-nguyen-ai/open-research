import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { loadContent } from "@openresearch/validator/load";
import { buildIndex } from "../src/lib/bm25.mjs";
import { slugifyHeading } from "../src/lib/format.mjs";

// Split published contributions into a search corpus: one Summary chunk from
// frontmatter + one chunk per H2 section. Pure — depends only on loaded content.
export function chunkContent(content) {
  const corpus = [];
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  for (const c of published) {
    const fm = c.frontmatter;
    const slug = c.dirName;
    const summaryParts = [fm.title];
    if (fm.result) summaryParts.push(fm.result);
    if (fm.result_detail) summaryParts.push(fm.result_detail);
    // Ids must be unique — Task 3's MCP server resolves chunks by id. The
    // frontmatter chunk always keeps plain #summary; a colliding section id
    // (e.g. a "## Summary" H2, or duplicate headings) gets -2, -3, ...
    const used = new Set([`${slug}#summary`]);
    corpus.push({ id: `${slug}#summary`, slug, tier: fm.tier, section: "Summary", text: summaryParts.join(". ") });
    for (const sec of splitSections(c.body)) {
      const base = `${slug}#${slugifyHeading(sec.heading)}`;
      let id = base;
      for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      used.add(id);
      corpus.push({
        id,
        slug, tier: fm.tier, section: sec.heading,
        text: `${sec.heading}. ${sec.text}`
      });
    }
  }
  return corpus;
}

function splitSections(body) {
  // Normalize line endings: the committed index must not depend on whether
  // the working tree was checked out with LF or CRLF.
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let cur = null;
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push(cur);
      cur = { heading: m[1], lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) out.push(cur);
  return out
    .map((s) => ({ heading: s.heading, text: s.lines.join("\n").trim() }))
    .filter((s) => s.text.length > 0);
}

export function buildQaIndex(contentRoot) {
  const content = loadContent(contentRoot);
  if (content.errors.length > 0) {
    const lines = content.errors.map((e) => `${e.file} · ${e.rule} · ${e.message}`);
    throw new Error(`build-index: content has errors — run npm run validate\n${lines.join("\n")}`);
  }
  return buildIndex(chunkContent(content));
}

// CLI: node scripts/build-index.mjs [contentRoot] [outDir]
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const contentRoot = process.argv[2] ?? fileURLToPath(new URL("../../content", import.meta.url));
  const outDir = process.argv[3] ?? fileURLToPath(new URL("../public", import.meta.url));
  try {
    const index = buildQaIndex(contentRoot);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "qa-index.json"), JSON.stringify(index));
    console.log(`build-index: ${index.chunks.length} chunks → ${join(outDir, "qa-index.json")}`);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}
