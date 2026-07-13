import { existsSync } from "node:fs";
import { resolve, dirname, sep } from "node:path";

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export function check(content) {
  const findings = [];
  const rootAbs = resolve(content.root);

  for (const c of content.contributions) {
    for (const m of c.body.matchAll(LINK_RE)) {
      const target = m[1];
      if (/^(?:https?:)?\/\//i.test(target) || target.startsWith("#") || target.startsWith("mailto:")) {
        continue;
      }
      const targetPath = resolve(dirname(c.file), target.split("#")[0]);
      if (targetPath !== rootAbs && !targetPath.startsWith(rootAbs + sep)) {
        findings.push({ file: c.file, rule: "links", message: `link "${target}" escapes the content directory` });
      } else if (!existsSync(targetPath)) {
        findings.push({ file: c.file, rule: "links", message: `relative link "${target}" does not resolve to a file` });
      }
    }

    const bundle = c.frontmatter.replication_bundle;
    if (bundle && !existsSync(resolve(c.dir, bundle))) {
      findings.push({ file: c.file, rule: "links", message: `replication_bundle "${bundle}" does not exist` });
    }
  }
  return findings;
}
