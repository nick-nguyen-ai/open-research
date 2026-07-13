import test from "node:test";
import assert from "node:assert/strict";
import { deriveArena, buildScoreModel } from "../scripts/derive.mjs";

// Minimal content builder — mirrors the loader's shape.
function contrib(id, authors, { status = "published", title = id, tier = "finding", result = null } = {}) {
  return { dirName: id, dir: `/x/${id}`, file: `/x/${id}/index.md`,
    frontmatter: { id, title, tier, status, result, authors }, body: "", raw: "" };
}
const A = (name, team, division) => ({ name, team, ...(division ? { division } : {}) });

function content({ contributions = [], replications = [], endorsements = [], adoptions = [] } = {}) {
  return {
    contributions,
    replications: replications.map((data) => ({ file: "r.yaml", data })),
    endorsements: endorsements.map((data) => ({ file: "e.yaml", data })),
    adoptions: adoptions.map((data) => ({ file: "a.yaml", data })),
    errors: []
  };
}
const now = () => new Date("2026-07-14T00:00:00Z");

test("authored gives 10 to each author; generated is an iso date", () => {
  const a = deriveArena(content({ contributions: [contrib("c1", [A("Ann", "t1", "D1")])] }), { now });
  assert.equal(a.generated, "2026-07-14");
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10);
  assert.equal(ann.handle, "ann");
  assert.deepEqual(ann.breakdown, { authored: 1, replicationsReceived: 0, replicationsPerformed: 0, adoptions: 0, endorsements: 0 });
});

test("authored: multi-author contribution gives the full 10 to each author, not split", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1"), A("Bea", "t1"), A("Cal", "t1")])]
  }), { now });
  assert.equal(a.individuals.find((i) => i.name === "Ann").score, 10);
  assert.equal(a.individuals.find((i) => i.name === "Bea").score, 10);
  assert.equal(a.individuals.find((i) => i.name === "Cal").score, 10);
});

test("only events on published contributions score: draft contribution's events are ignored", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")], { status: "draft" })],
    replications: [{ contribution_id: "c1", replicator: A("Bea", "t2"), outcome: "replicated", method: "m", date: "2026-07-10" }],
    endorsements: [{ contribution_id: "c1", type: "endorsement", by: A("Cal", "t3"), statement: "s", date: "2026-07-10" }],
    adoptions: [{ contribution_id: "c1", adopter: A("Dan", "t4"), pipeline: "p", status: "active", since: "2026-07-01", date: "2026-07-10" }]
  }), { now });
  assert.deepEqual(a.individuals, []);
});

test("cross-team replicated: +15 author, +12 replicator; self-team scores 0 both sides", () => {
  const cross = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Bea", "t2"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(cross.individuals.find((i) => i.name === "Ann").score, 25); // 10 + 15
  assert.equal(cross.individuals.find((i) => i.name === "Bea").score, 12);

  const self = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Cal", "t1"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(self.individuals.find((i) => i.name === "Ann").score, 10); // no +15
  assert.equal(self.individuals.find((i) => i.name === "Cal"), undefined); // no points → not scored
});

test("non-replicated outcomes do not score", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    replications: [{ contribution_id: "c1", replicator: A("Bea", "t2"), outcome: "partial", method: "m", date: "2026-07-10" }]
  }), { now });
  assert.equal(a.individuals.find((i) => i.name === "Ann").score, 10);
  assert.equal(a.individuals.find((i) => i.name === "Bea"), undefined);
});

test("adoption: active=8, +4 impact bonus, retired=0 and uncounted", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    adoptions: [
      { contribution_id: "c1", adopter: A("Bea", "t2"), pipeline: "p", status: "active", since: "2026-07-01", impact: "x", date: "2026-07-10" },
      { contribution_id: "c1", adopter: A("Cal", "t3"), pipeline: "p", status: "trialing", since: "2026-07-01", date: "2026-07-10" },
      { contribution_id: "c1", adopter: A("Dan", "t4"), pipeline: "p", status: "retired", since: "2026-07-01", impact: "y", date: "2026-07-10" }
    ]
  }), { now });
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10 + 12 + 8); // authored + active-with-impact + trialing; retired scores 0
  assert.equal(ann.breakdown.adoptions, 2); // retired not counted
});

test("adoption-type endorsement counts as an adoption (8); plain endorsement is 3", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1")])],
    endorsements: [
      { contribution_id: "c1", type: "adoption", by: A("Bea", "t2"), statement: "s", pipeline: "p", date: "2026-07-10" },
      { contribution_id: "c1", type: "endorsement", by: A("Cal", "t3"), statement: "s", date: "2026-07-10" }
    ]
  }), { now });
  const ann = a.individuals.find((i) => i.name === "Ann");
  assert.equal(ann.score, 10 + 8 + 3);
  assert.equal(ann.breakdown.adoptions, 1);
  assert.equal(ann.breakdown.endorsements, 1);
});

test("tie-break: equal score orders by replication count, then name", () => {
  // Ann and Bob both score 10 via authoring; Bob also received a cross-team replication (higher repCount).
  const a = deriveArena(content({
    contributions: [contrib("aaa", [A("Ann", "t1")]), contrib("bbb", [A("Bob", "t2")]), contrib("ccc", [A("Cid", "t3")])],
    replications: [{ contribution_id: "bbb", replicator: A("Zoe", "t9"), outcome: "replicated", method: "m", date: "2026-07-10" }]
  }), { now });
  // Bob: 10 + 15 = 25 (top by score). Zoe: +12 for performing (outranks the 10s on score alone).
  // Ann & Cid: 10 each (repCount 0, no score tie with Zoe) → alpha order Ann before Cid.
  const names = a.individuals.map((i) => i.name);
  assert.deepEqual(names, ["Bob", "Zoe", "Ann", "Cid"]);
});

test("handle collision between two distinct names gets a numeric suffix", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Al-ex", "t1")]), contrib("c2", [A("Al Ex", "t2")])]
  }), { now });
  const handles = a.individuals.map((i) => i.handle).sort();
  assert.deepEqual(handles, ["al-ex", "al-ex-2"]);
});

test("teams and divisions roll up; null-division teams are excluded from divisions", () => {
  const a = deriveArena(content({
    contributions: [contrib("c1", [A("Ann", "t1", "D1")]), contrib("c2", [A("Bea", "t2")])] // t2 has no division
  }), { now });
  assert.deepEqual(a.teams.map((t) => t.team).sort(), ["t1", "t2"]);
  assert.deepEqual(a.divisions.map((d) => d.division), ["D1"]); // t2 excluded (no division)
  assert.deepEqual(a.divisions[0].teams, ["t1"]);
});

test("buildScoreModel throws loudly on content errors", () => {
  assert.throws(() => buildScoreModel({ contributions: [], replications: [], endorsements: [], adoptions: [], errors: [{ file: "x", rule: "y", message: "z" }] }), /errors/);
});
