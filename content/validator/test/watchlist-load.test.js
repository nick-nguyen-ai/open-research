import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { getValidator } from "../src/schemas.js";
import { loadContent } from "../src/load.js";
import { runValidation } from "../src/runner.js";

const root = fileURLToPath(new URL("./fixtures/watchlist-root/", import.meta.url));

const valid = {
  id: "some-paper",
  title: "A watched paper",
  source_url: "https://arxiv.org/abs/2305.02156",
  added_by: { name: "Demo Author", team: "demo-team" },
  status: "watching"
};

test("accepts a minimal watching entry", () => {
  assert.equal(getValidator("watchlist")(valid), true);
});

test("accepts a tested entry with claimed_by + resulting_contribution", () => {
  assert.equal(getValidator("watchlist")({
    ...valid, status: "tested", claimed_by: { name: "X", team: "t" }, resulting_contribution: "reranker-demo"
  }), true);
});

test("rejects an unknown status", () => {
  assert.equal(getValidator("watchlist")({ ...valid, status: "maybe" }), false);
});

test("rejects an unknown top-level property (additionalProperties:false)", () => {
  assert.equal(getValidator("watchlist")({ ...valid, priority: 1 }), false);
});

test("loader exposes content.watchlist additively; frozen keys intact", () => {
  const content = loadContent(root);
  assert.ok(Array.isArray(content.watchlist));
  assert.equal(content.watchlist.length, 2);
  for (const k of ["contributions", "replications", "endorsements", "benchmarks", "adoptions", "errors"]) {
    assert.ok(k in content, `content.${k} must still exist`);
  }
});

test("crossref flags a watchlist entry whose resulting_contribution is unknown", () => {
  const findings = runValidation(root);
  const ghost = findings.find((f) => f.rule === "crossref" && /no-such-contribution/.test(f.message));
  assert.ok(ghost, "expected a crossref finding for the ghost resulting_contribution");
});
