// Replication run: heading-aware chunking vs fixed windows (per the
// heading-aware-chunking tutorial, steps 1-4), evaluated with recall@10
// using OpenResearch's own BM25 engine as the retriever.
// Corpus: this repo's markdown contributions + design docs (real documents).
// Queries: every h2 heading (+ doc title terms); the correct hit is a chunk
// from that document containing that section's heading or body.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIndex, search, tokenize } from "../../../../site/src/lib/bm25.mjs";

// repo root, resolved relative to this bundle (works from any checkout location)
const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".md")) files.push(p);
  }
}
walk(join(ROOT, "content/contributions"));
walk(join(ROOT, "docs"));

const docs = files.map((f, i) => ({ id: `d${i}`, file: f.replace(/\\/g, "/").split("OpenResearch/")[1], text: readFileSync(f, "utf8") }));

const approxTokens = (s) => tokenize(s).length;

// (a) baseline: fixed 800-token windows (split on whitespace budget)
function fixedChunks(doc) {
  const words = doc.text.split(/\s+/);
  const out = [];
  for (let i = 0; i < words.length; i += 800) {
    out.push({ id: `${doc.id}#w${i}`, doc: doc.id, text: words.slice(i, i + 800).join(" ") });
  }
  return out;
}

// (b) heading-aware: split at h2 (depth 2), merge < 200 tokens into parent,
// cap 800 tokens splitting at paragraph boundaries repeating the heading path.
function headingChunks(doc) {
  const lines = doc.text.split("\n");
  const sections = [{ heading: "(preamble)", body: [] }];
  for (const line of lines) {
    const m = /^## (.+)$/.exec(line);
    if (m) sections.push({ heading: m[1].trim(), body: [] });
    else sections.at(-1).body.push(line);
  }
  const merged = [];
  for (const s of sections) {
    const text = s.body.join("\n").trim();
    if (approxTokens(text) < 200 && merged.length) {
      merged.at(-1).text += `\n## ${s.heading}\n${text}`;
    } else {
      merged.push({ heading: s.heading, text: `## ${s.heading}\n${text}` });
    }
  }
  const out = [];
  for (const s of merged) {
    if (approxTokens(s.text) <= 800) {
      out.push({ id: `${doc.id}#${out.length}`, doc: doc.id, text: s.text });
    } else {
      const paras = s.text.split(/\n\n+/);
      let buf = [];
      for (const p of paras) {
        if (approxTokens(buf.join("\n\n")) + approxTokens(p) > 800 && buf.length) {
          out.push({ id: `${doc.id}#${out.length}`, doc: doc.id, text: `[${s.heading}] ` + buf.join("\n\n") });
          buf = [];
        }
        buf.push(p);
      }
      if (buf.length) out.push({ id: `${doc.id}#${out.length}`, doc: doc.id, text: `[${s.heading}] ` + buf.join("\n\n") });
    }
  }
  return out;
}

// queries: one per h2 section across the corpus; relevant = chunk of the right
// doc that contains the section heading text (the "did retrieval land in the
// right part of the right document" question).
const queries = [];
for (const doc of docs) {
  for (const line of doc.text.split("\n")) {
    const m = /^## (.+)$/.exec(line);
    if (m && m[1].trim().length > 3) {
      const title = (doc.text.match(/^title: (.+)$/m) ?? [, ""])[1];
      queries.push({ q: `${m[1].trim()} ${title}`.trim(), doc: doc.id, heading: m[1].trim() });
    }
  }
}

function evalChunking(chunkFn, label) {
  const corpus = docs.flatMap(chunkFn);
  const idx = buildIndex(corpus.map((c) => ({ id: c.id, slug: c.doc, tier: "", section: "", text: c.text, tokens: approxTokens(c.text) })));
  let hit = 0;
  for (const { q, doc, heading } of queries) {
    const hits = search(idx, q, 10);
    const ok = hits.some((h) => {
      if (h.slug !== doc) return false;
      const chunk = corpus.find((c) => c.id === h.id);
      return chunk && chunk.text.toLowerCase().includes(heading.toLowerCase());
    });
    if (ok) hit++;
  }
  const recall = hit / queries.length;
  console.log(`${label}: chunks=${corpus.length} recall@10=${recall.toFixed(3)} (${hit}/${queries.length})`);
  return recall;
}

console.log(`corpus: ${docs.length} docs, ${queries.length} queries`);
const base = evalChunking(fixedChunks, "fixed-800   ");
const ha = evalChunking(headingChunks, "heading-aware");
console.log(`delta: ${((ha - base) * 100).toFixed(1)}pt recall@10`);
