import { test } from "node:test";
import assert from "node:assert/strict";
import { check, REQUIRED_HEADINGS } from "../src/rules/template.js";

const body = `
## Summary
Enabling prompt caching on shared eval prefixes cut cost 60% with identical scores.
## Context
Nightly evals re-send the same system prompt.
## Technique
Mark the shared prefix cacheable.
## Evidence
Cost dropped from $18.40 to $7.30 per run.
## How to replicate
Run the bundle against any suite with a shared prefix.
`;

function contribution(tier, bodyText) {
  return {
    root: "/fake",
    contributions: [{ dirName: "x", dir: "d", file: "f", frontmatter: { tier }, body: bodyText, raw: "" }],
    replications: [], endorsements: [], benchmarks: [], errors: []
  };
}

test("finding with all required sections passes", () => {
  assert.deepEqual(check(contribution("finding", body)), []);
});

test("finding missing a section is flagged per missing heading", () => {
  const noEvidence = body.replace("## Evidence", "## Proof");
  const findings = check(contribution("finding", noEvidence));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /"## Evidence"/);
});

test("note requires no headings but rejects near-empty body", () => {
  assert.deepEqual(check(contribution("note", "A useful note about prompt caching that is comfortably over the minimum length for a publishable body.")), []);
  const findings = check(contribution("note", "too short"));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /under 100 characters/);
});

test("every tier has a headings entry", () => {
  assert.deepEqual(
    Object.keys(REQUIRED_HEADINGS).sort(),
    ["finding", "note", "technical-report", "tutorial"]
  );
});
