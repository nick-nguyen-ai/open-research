import { test } from "node:test";
import assert from "node:assert/strict";
import { getValidator } from "../src/schemas.js";

const valid = {
  contribution_id: "prompt-cache-evals",
  adopter: { name: "Sofia Marchetti", team: "markets-analytics", division: "Markets" },
  pipeline: "markets-nightly-evals",
  status: "active",
  since: "2026-07-08",
  impact: "eval spend down 58% month over month",
  date: "2026-07-13"
};

test("accepts a valid adoption (impact optional but present)", () => {
  assert.equal(getValidator("adoption")(valid), true);
});

test("accepts a valid adoption without the optional impact", () => {
  const { impact, ...rest } = valid;
  assert.equal(getValidator("adoption")(rest), true);
});

test("rejects an adoption missing a required field (pipeline)", () => {
  const { pipeline, ...rest } = valid;
  assert.equal(getValidator("adoption")(rest), false);
});

test("rejects an unknown status", () => {
  assert.equal(getValidator("adoption")({ ...valid, status: "maybe" }), false);
});

test("rejects an unknown top-level property (additionalProperties:false)", () => {
  assert.equal(getValidator("adoption")({ ...valid, rating: 5 }), false);
});
