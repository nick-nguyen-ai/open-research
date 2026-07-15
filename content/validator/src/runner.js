import { loadContent } from "./load.js";
import * as schemaRule from "./rules/schema.js";
import * as templateRule from "./rules/template.js";
import * as crossrefRule from "./rules/crossrefs.js";
import * as linksRule from "./rules/links.js";
import * as secretsRule from "./rules/secrets.js";
import * as reviewsRule from "./rules/reviews.js";

const RULES = [schemaRule, templateRule, crossrefRule, linksRule, secretsRule, reviewsRule];

export function runValidation(root) {
  const content = loadContent(root);
  const findings = [...content.errors];
  for (const rule of RULES) {
    findings.push(...rule.check(content));
  }
  return findings;
}
