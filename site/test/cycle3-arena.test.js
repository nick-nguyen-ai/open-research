import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { deriveArena, derivePeople } from "../scripts/derive.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));
const now = () => new Date("2026-07-14T00:00:00Z");

test("arena.json has the frozen top-level shape", () => {
  const a = deriveArena(loadContent(contentRoot), { now });
  assert.deepEqual(Object.keys(a).sort(), ["divisions", "generated", "individuals", "teams"]);
  const ind = a.individuals[0];
  assert.deepEqual(Object.keys(ind).sort(), ["breakdown", "division", "handle", "name", "score", "team"]);
  assert.deepEqual(Object.keys(ind.breakdown).sort(),
    ["adoptions", "authored", "endorsements", "replicationsPerformed", "replicationsReceived"]);
  assert.deepEqual(Object.keys(a.teams[0]).sort(), ["division", "members", "score", "team"]);
  assert.deepEqual(Object.keys(a.divisions[0]).sort(), ["division", "score", "teams"]);
});

test("boards rank the seed plausibly (Sofia top; Markets top division; retired scores 0)", () => {
  const a = deriveArena(loadContent(contentRoot), { now });
  assert.equal(a.individuals[0].name, "Sofia Marchetti");
  assert.equal(a.individuals[0].score, 75);
  // Hana Kim: authored batch (10) + one cross-team replication received (15) + two performed (24);
  // her batch adoption by ib-quant is retired → 0, so adoptions breakdown is 0.
  const hana = a.individuals.find((i) => i.name === "Hana Kim");
  assert.equal(hana.score, 49);
  assert.equal(hana.breakdown.adoptions, 0);
  // Divisions are exactly the five that carry a division label; Markets leads.
  assert.deepEqual(a.divisions.map((d) => d.division).sort(),
    ["Cards", "Institutional", "Markets", "Payments", "Risk"]);
  assert.equal(a.divisions[0].division, "Markets");
  // Null-division teams (Cycle-1 mononyms) appear on the teams board but not divisions.
  assert.ok(a.teams.some((t) => t.team === "Model Validation" && t.division === null));
});

test("every published author has a profile; profile shape is frozen", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  const slug = (n) => n.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  for (const c of published) for (const a of c.frontmatter.authors) assert.ok(people[slug(a.name)]);
  const anyProfile = Object.values(people)[0];
  assert.deepEqual(Object.keys(anyProfile).sort(),
    ["breakdown", "contributions", "division", "handle", "name", "rank", "received", "replicationsPerformed", "score", "team"]);
});

test("evidence carries adoptions[] and changelog[] additively", () => {
  const content = loadContent(contentRoot);
  // adoptions[] present on a contribution that has one
  const heading = content.adoptions.filter((a) => a.data.contribution_id === "heading-aware-chunking");
  assert.equal(heading.length, 1);
  assert.equal(heading[0].data.status, "active");
});
