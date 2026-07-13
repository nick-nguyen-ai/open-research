import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator, formatErrors } from "../src/schemas.js";

const valid = {
  id: "prompt-cache-evals",
  title: "Prompt caching cut our eval suite cost by 60%",
  tier: "finding",
  authors: [{ name: "Nick", team: "Model Validation" }],
  category: "evals",
  tags: ["caching", "cost"],
  status: "published",
  created: "2026-07-13",
  updated: "2026-07-13"
};

test("accepts valid contribution frontmatter", () => {
  assert.equal(getValidator("contribution")(valid), true);
});

test("rejects unknown tier", () => {
  assert.equal(getValidator("contribution")({ ...valid, tier: "paper" }), false);
});

test("rejects missing required field", () => {
  const { title, ...rest } = valid;
  const v = getValidator("contribution");
  assert.equal(v(rest), false);
  assert.match(formatErrors(v.errors), /title/);
});

test("rejects author without team", () => {
  assert.equal(
    getValidator("contribution")({ ...valid, authors: [{ name: "Nick" }] }),
    false
  );
});

test("throws for unknown schema name", () => {
  assert.throws(() => getValidator("nope"), /No schema/);
});
