export function check(content) {
  const findings = [];
  const contributionIds = new Set(content.contributions.map((c) => c.frontmatter.id).filter(Boolean));
  const benchmarkIds = new Set(content.benchmarks.map((b) => b.data?.id).filter(Boolean));

  const flag = (file, message) => findings.push({ file, rule: "crossref", message });

  for (const r of [...content.replications, ...content.endorsements, ...(content.adoptions ?? []), ...(content.reviews ?? [])]) {
    const id = r.data?.contribution_id;
    if (id && !contributionIds.has(id)) {
      flag(r.file, `contribution_id "${id}" does not match any contribution`);
    }
  }
  for (const r of content.replications) {
    const b = r.data?.benchmark_id;
    if (b && !benchmarkIds.has(b)) {
      flag(r.file, `benchmark_id "${b}" is not in the benchmark registry`);
    }
  }
  for (const c of content.contributions) {
    for (const b of c.frontmatter.benchmarks ?? []) {
      if (!benchmarkIds.has(b)) flag(c.file, `benchmark "${b}" is not in the benchmark registry`);
    }
    for (const rel of c.frontmatter.related?.internal ?? []) {
      if (!contributionIds.has(rel)) flag(c.file, `related.internal "${rel}" does not match any contribution`);
    }
  }
  for (const w of content.watchlist ?? []) {
    const rc = w.data?.resulting_contribution;
    if (rc && !contributionIds.has(rc)) {
      flag(w.file, `resulting_contribution "${rc}" does not match any contribution`);
    }
  }
  return findings;
}
