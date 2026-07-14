export const REQUIRED_HEADINGS = {
  finding: ["Summary", "Context", "Technique", "Evidence", "How to replicate"],
  "technical-report": ["Abstract", "Background", "Method", "Results", "Discussion", "How to replicate"],
  "research-paper": ["Abstract", "Introduction", "Related work", "Method", "Results", "Discussion", "Conclusion", "How to replicate"],
  tutorial: ["You'll need", "You'll build", "Steps", "Wrap-up"],
  note: []
};

export function check(content) {
  const findings = [];
  for (const c of content.contributions) {
    const required = REQUIRED_HEADINGS[c.frontmatter.tier];
    if (!required) continue; // unknown tier is the schema rule's finding, not ours
    const headings = [...c.body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1]);
    for (const h of required) {
      if (!headings.includes(h)) {
        findings.push({
          file: c.file,
          rule: "template",
          message: `missing required section "## ${h}" for tier "${c.frontmatter.tier}"`
        });
      }
    }
    if (c.body.trim().length < 100) {
      findings.push({
        file: c.file,
        rule: "template",
        message: "body is under 100 characters — add substance before publishing"
      });
    }
  }
  return findings;
}
