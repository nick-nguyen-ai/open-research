import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";

export function loadContent(root) {
  const content = {
    root,
    contributions: [],
    replications: [],
    endorsements: [],
    benchmarks: [],
    adoptions: [],
    errors: []
  };

  const contribDir = join(root, "contributions");
  if (existsSync(contribDir)) {
    for (const name of readdirSync(contribDir)) {
      const dir = join(contribDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const file = join(dir, "index.md");
      if (!existsSync(file)) {
        content.errors.push({
          file: dir,
          rule: "structure",
          message: "contribution directory has no index.md"
        });
        continue;
      }
      try {
        const raw = readFileSync(file, "utf8");
        const { data, content: body } = matter(raw);
        content.contributions.push({
          dirName: name,
          dir,
          file,
          frontmatter: normalizeDates(data),
          body,
          raw
        });
      } catch (err) {
        content.errors.push({
          file,
          rule: "parse",
          message: `frontmatter parse failed: ${err.message}`
        });
      }
    }
  }

  loadYamlDir(content, join(root, "records", "replications"), "replications");
  loadYamlDir(content, join(root, "records", "endorsements"), "endorsements");
  loadYamlDir(content, join(root, "records", "adoptions"), "adoptions");
  loadYamlDir(content, join(root, "benchmarks"), "benchmarks");
  return content;
}

function loadYamlDir(content, dir, key) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".yaml") && !name.endsWith(".yml")) continue;
    const file = join(dir, name);
    try {
      content[key].push({ file, data: parseYaml(readFileSync(file, "utf8")) });
    } catch (err) {
      content.errors.push({
        file,
        rule: "parse",
        message: `YAML parse failed: ${err.message}`
      });
    }
  }
}

// gray-matter (js-yaml, YAML 1.1) turns unquoted dates into Date objects;
// the schemas expect "YYYY-MM-DD" strings.
function normalizeDates(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalizeDates);
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) value[k] = normalizeDates(v);
  }
  return value;
}
