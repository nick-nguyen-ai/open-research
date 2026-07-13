import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) htmlFiles(p, out);
    else if (name.endsWith(".html")) out.push(p);
  }
  return out;
}

function routeToFile(dist, route) {
  const clean = route.split(/[?#]/)[0];
  if (clean.endsWith("/")) return join(dist, clean, "index.html");
  if (/\.[a-z0-9]+$/i.test(clean)) return join(dist, clean);
  return join(dist, clean, "index.html");
}

export function checkDist(dist, { requiredRoutes = [] } = {}) {
  const problems = [];
  for (const route of requiredRoutes) {
    if (!existsSync(routeToFile(dist, route))) problems.push(`required route ${route} missing from ${dist}`);
  }
  if (!existsSync(join(dist, "pagefind", "pagefind.js"))) {
    problems.push("pagefind index missing (dist/pagefind/pagefind.js)");
  }
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, "utf8");
    for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
      const href = m[1];
      if (href.startsWith("/pagefind/")) continue;
      if (!existsSync(routeToFile(dist, href))) {
        problems.push(`${file}: broken internal link ${href}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dist = process.argv[2] ?? fileURLToPath(new URL("../dist", import.meta.url));
  const problems = checkDist(dist, {
    requiredRoutes: [
      "/", "/browse/", "/contribute/", "/benchmarks/", "/arena/", "/toolkit/", "/404.html",
      "/contributions/prompt-cache-evals/", "/contributions/heading-aware-chunking/",
      "/contributions/structured-output-kyc/", "/contributions/temperature-drift-evals/",
      "/contributions/retrieval-reranker-lite/", "/contributions/pii-scrubber-prompts/",
    ]
  });
  if (problems.length > 0) {
    for (const p of problems) console.error(p);
    console.error(`\n✗ ${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`✓ dist checks passed (${dist})`);
}
