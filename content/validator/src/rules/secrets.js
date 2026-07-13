import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PATTERNS = [
  { name: "aws-access-key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "private-key", re: /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/ },
  { name: "github-token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "slack-token", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { name: "bearer-token", re: /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/ },
  { name: "assigned-secret", re: /(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{12,}["']/i },
  { name: "card-number", re: /\b(?:4[0-9]{3}|5[1-5][0-9]{2})[ -]?[0-9]{4}[ -]?[0-9]{4}[ -]?[0-9]{4}\b/ }
];

const TEXT_EXT = new Set([
  ".md", ".yaml", ".yml", ".json", ".py", ".js", ".ts", ".sh",
  ".txt", ".csv", ".toml", ".cfg", ".ini",
  ".pem", ".key", ".crt", ".pub"
]);

const SKIP_DIRS_ANY_DEPTH = new Set(["node_modules"]);

export function check(content) {
  const findings = [];
  const validatorDir = join(content.root, "validator");
  const excludedPaths = new Set([validatorDir]);
  walk(content.root, excludedPaths, (file) => {
    if (!TEXT_EXT.has(extname(file))) return;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        if (p.re.test(line)) {
          findings.push({ file, rule: "secrets", message: `possible ${p.name} on line ${i + 1}` });
        }
      }
    });
  });
  return findings;
}

function walk(dir, excludedPaths, fn) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (SKIP_DIRS_ANY_DEPTH.has(name) || name.startsWith(".") || excludedPaths.has(p)) continue;
      walk(p, excludedPaths, fn);
    } else {
      fn(p);
    }
  }
}
