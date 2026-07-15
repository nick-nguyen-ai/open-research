// Review-record semantics the schema can't express: an override exists to
// publish over an objection, so it requires at least one needs-work verdict.
export function check(content) {
  const findings = [];
  for (const r of content.reviews ?? []) {
    const data = r.data ?? {};
    if (!data.override) continue;
    const verdicts = Object.values(data.verdicts ?? {});
    if (!verdicts.includes("needs-work")) {
      findings.push({
        file: r.file,
        rule: "review",
        message: "override present but no verdict is needs-work — nothing to override"
      });
    }
  }
  return findings;
}
