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

test("contribution with result and result_detail validates", () => {
  const validate = getValidator("contribution");
  const ok = validate({
    id: "with-result", title: "A finding with a headline result",
    tier: "finding", authors: [{ name: "N", team: "T" }],
    category: "evals", tags: ["caching"], status: "published",
    created: "2026-07-13", updated: "2026-07-13",
    result: "−60% cost per run",
    result_detail: "$18.40 → $7.30 · 30 nightly runs · scores unchanged"
  });
  assert.equal(ok, true, JSON.stringify(validate.errors));
});
