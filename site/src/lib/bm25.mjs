// BM25 lexical index — pure functions, zero dependencies. The Q&A search seam.
// buildIndex(corpus) + search(index, query, k) freeze at CP-D; CBA swaps Bedrock
// embeddings behind the same search(index, query, k) signature.

const STOPWORDS = new Set(
  ("a an and are as at be by for from has have he in into is it its of on or that the " +
   "their them then there these this those to was were will with we our you your").split(" ")
);

const K1 = 1.5;
const B = 0.75;

export function tokenize(text) {
  return (String(text).toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

// corpus: [{ id, slug, tier, section, text }] → serializable index.
export function buildIndex(corpus) {
  const chunks = [];
  const docs = [];      // parallel to chunks: { tf: { term: count } }
  // Term-keyed maps are prototype-less: a token like "constructor" must not
  // resolve through Object.prototype and corrupt its count.
  const df = Object.create(null);  // term -> number of chunks containing it
  let totalTokens = 0;
  for (const c of corpus) {
    const terms = tokenize(c.text);
    const tf = Object.create(null);
    for (const t of terms) tf[t] = (tf[t] ?? 0) + 1;
    for (const t of Object.keys(tf)) df[t] = (df[t] ?? 0) + 1;
    chunks.push({ id: c.id, slug: c.slug, tier: c.tier, section: c.section, text: c.text, tokens: terms.length });
    docs.push({ tf });
    totalTokens += terms.length;
  }
  const N = chunks.length;
  const avgdl = N > 0 ? totalTokens / N : 0;
  return { chunks, model: { df, avgdl, docs, N } };
}

export function search(index, query, k = 5) {
  const { chunks, model } = index;
  const { df, avgdl, docs, N } = model;
  const qterms = [...new Set(tokenize(query))];
  const results = [];
  for (let i = 0; i < chunks.length; i++) {
    const { tf } = docs[i];
    const len = chunks[i].tokens;
    let score = 0;
    for (const t of qterms) {
      // Own-property guards keep lookups safe even if the serializable index
      // was JSON round-tripped (which restores Object.prototype on the maps).
      const f = Object.hasOwn(tf, t) ? tf[t] : 0;
      if (!f) continue;
      const n = Object.hasOwn(df, t) ? df[t] : 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * (len / (avgdl || 1))));
    }
    if (score > 0) {
      const c = chunks[i];
      results.push({
        id: c.id, slug: c.slug, tier: c.tier, section: c.section,
        score: Number(score.toFixed(6)), text: c.text,
        path: `content/contributions/${c.slug}/index.md`
      });
    }
  }
  results.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return results.slice(0, k);
}
