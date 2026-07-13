import test from "node:test";
import assert from "node:assert/strict";
import { deriveWatchlist } from "../scripts/derive.mjs";

function content({ contributions = [], watchlist = [] } = {}) {
  return {
    contributions: contributions.map((fm) => ({ dirName: fm.id, frontmatter: fm })),
    watchlist: watchlist.map((data) => ({ file: `${data.id}.yaml`, data })),
    errors: []
  };
}

test("deriveWatchlist resolves resulting_contribution and sorts tested<claimed<watching", () => {
  const rows = deriveWatchlist(content({
    contributions: [{ id: "reranker", title: "Reranker", status: "published", authors: [] }],
    watchlist: [
      { id: "b-watch", title: "B", source_url: "https://x/1", added_by: { name: "N", team: "t" }, status: "watching" },
      { id: "a-test", title: "A", source_url: "https://x/2", added_by: { name: "N", team: "t" }, status: "tested",
        claimed_by: { name: "N", team: "t" }, resulting_contribution: "reranker" }
    ]
  }));
  assert.equal(rows[0].id, "a-test"); // tested first
  assert.deepEqual(rows[0].resulting_contribution, { slug: "reranker", title: "Reranker" });
  assert.deepEqual(rows[0].added_by, { name: "N", team: "t" });
  assert.equal(rows[1].id, "b-watch");
  assert.equal(rows[1].resulting_contribution, null);
  assert.equal(rows[1].claimed_by, null);
});
