import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { check } from "../src/rules/links.js";

const root = fileURLToPath(new URL("./fixtures/valid-root/", import.meta.url));
const dir = join(root, "contributions", "prompt-cache-evals");
const file = join(dir, "index.md");

function contribution(body, frontmatter = {}) {
  return {
    root,
    contributions: [{ dirName: "prompt-cache-evals", dir, file, frontmatter, body, raw: "" }],
    replications: [], endorsements: [], benchmarks: [], errors: []
  };
}

test("resolving relative link and external links pass", () => {
  const body = "See [the bundle](bundle/README.md) and [Anthropic docs](https://docs.anthropic.com) and [top](#summary).";
  assert.deepEqual(check(contribution(body)), []);
});

test("broken relative link is flagged", () => {
  const findings = check(contribution("See [missing](bundle/nope.md)."));
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "links");
  assert.match(findings[0].message, /bundle\/nope\.md/);
});

test("link escaping the content root is flagged", () => {
  const findings = check(contribution("See [escape](../../../../../etc/passwd)."));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /escapes/);
});

test("declared replication_bundle must exist", () => {
  assert.deepEqual(check(contribution("body", { replication_bundle: "bundle/" })), []);
  const findings = check(contribution("body", { replication_bundle: "bundle/missing/" }));
  assert.equal(findings.length, 1);
  assert.match(findings[0].message, /replication_bundle/);
});
