import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { derive } from "../scripts/derive.mjs";

const root = fileURLToPath(new URL("./fixtures/derive-root", import.meta.url));
const brokenRoot = fileURLToPath(new URL("./fixtures/broken-root", import.meta.url));
const fakeRev = () => "abc1234";

test("stats count published contributions, verified replications, unique teams", () => {
  const { stats } = derive(root, { rev: fakeRev });
  assert.deepEqual(stats, { contributions: 1, replications: 1, teams: 1 });
});

test("cards: draft excluded; summary is first sentence of Summary; verified counts only", () => {
  const { cards } = derive(root, { rev: fakeRev });
  assert.equal(cards.length, 1);
  const c = cards[0];
  assert.equal(c.slug, "alpha-cache");
  assert.equal(c.summary, "Caching the shared prefix halved eval spend.");
  assert.equal(c.replications, 1);
  assert.equal(c.teams, 1);
  assert.equal(c.result, "−50% cost");
  assert.deepEqual(c.authors, ["Ada"]);
  assert.equal(c.date, "2026-07-10");
});

test("filters carry counts over published contributions", () => {
  const { filters } = derive(root, { rev: fakeRev });
  assert.deepEqual(filters.tiers, [{ value: "finding", count: 1 }]);
  assert.deepEqual(filters.categories, [{ value: "evals", count: 1 }]);
  assert.deepEqual(filters.tags, [{ value: "caching", count: 1 }]);
});

test("evidence: all replications with outcome; workflow maps to 'own workflow'; endorsement joined; rev injected", () => {
  const { evidence } = derive(root, { rev: fakeRev });
  const ev = evidence["alpha-cache"];
  assert.equal(ev.replications.length, 2);
  assert.deepEqual(ev.replications[0], {
    team: "Cards", delta: "cost -48%", benchmark: "suite-a", date: "2026-07-11", outcome: "replicated"
  });
  assert.equal(ev.replications[1].benchmark, "own workflow");
  assert.equal(ev.replications[1].outcome, "partial");
  assert.equal(ev.endorsements.length, 1);
  assert.equal(ev.endorsements[0].type, "adoption");
  assert.equal(ev.endorsements[0].by, "Grace · Cards");
  assert.equal(ev.rev, "abc1234");
});

test("derive throws loudly on loader errors, naming the file", () => {
  assert.throws(() => derive(brokenRoot, { rev: fakeRev }), /bad-yaml/);
});
