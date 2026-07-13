import { getValidator, formatErrors } from "../schemas.js";

export function check(content) {
  const findings = [];

  const validate = getValidator("contribution");
  for (const c of content.contributions) {
    if (!validate(c.frontmatter)) {
      findings.push({ file: c.file, rule: "schema", message: formatErrors(validate.errors) });
      continue;
    }
    if (c.frontmatter.id !== c.dirName) {
      findings.push({
        file: c.file,
        rule: "schema",
        message: `frontmatter id "${c.frontmatter.id}" must match directory name "${c.dirName}"`
      });
    }
  }

  checkGroup(content.replications, "replication", findings);
  checkGroup(content.endorsements, "endorsement", findings);
  checkGroup(content.benchmarks, "benchmark", findings);
  return findings;
}

function checkGroup(items, schemaName, findings) {
  const validate = getValidator(schemaName);
  for (const item of items) {
    if (!validate(item.data)) {
      findings.push({ file: item.file, rule: "schema", message: formatErrors(validate.errors) });
    }
  }
}
