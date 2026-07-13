import test from "node:test";
import assert from "node:assert/strict";
import { buildDigest } from "../scripts/build-digest.mjs";

function content() {
  return {
    contributions: [
      { dirName: "new-one", frontmatter: { id: "new-one", title: "New one", tier: "finding", status: "published", updated: "2026-07-14", authors: [{ name: "Ann", team: "t1", division: "D1" }] } },
      { dirName: "old-one", frontmatter: { id: "old-one", title: "Old one", tier: "note", status: "published", updated: "2026-06-01", authors: [{ name: "Old", team: "t9" }] } }
    ],
    replications: [
      { file: "r.yaml", data: { contribution_id: "new-one", replicator: { name: "Bea", team: "t2" }, outcome: "replicated", benchmark_id: "b", measured_delta: "+5pt", date: "2026-07-13" } }
    ],
    adoptions: [
      { file: "a.yaml", data: { contribution_id: "new-one", adopter: { name: "Cal", team: "t3" }, pipeline: "p", status: "active", since: "2026-07-10", date: "2026-07-12" } }
    ],
    endorsements: [],
    errors: []
  };
}

test("buildDigest anchors to the latest content date and includes only the 7-day window", () => {
  const d = buildDigest(content());
  assert.equal(d.anchor, "2026-07-14");
  assert.equal(d.window.start, "2026-07-08");
  assert.equal(d.window.end, "2026-07-14");
  assert.deepEqual(d.contributions.map((c) => c.slug), ["new-one"]); // old-one is out of window
  assert.equal(d.replications.length, 1);
  assert.equal(d.adoptions.length, 1);
  // movers: Ann earned authored(10)+received(15)+adoption(8) in-window; Bea earned performed(12)
  const ann = d.movers.find((m) => m.name === "Ann");
  assert.ok(ann && ann.points >= 33);
  assert.ok(d.movers.find((m) => m.name === "Bea"));
});
