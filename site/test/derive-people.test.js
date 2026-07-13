import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadContent } from "@openresearch/validator/load";
import { derivePeople, deriveArena } from "../scripts/derive.mjs";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));

test("derivePeople keys by handle and covers every scored individual", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const arena = deriveArena(content, { now: () => new Date("2026-07-14T00:00:00Z") });
  assert.equal(Object.keys(people).length, arena.individuals.length);
  for (const ind of arena.individuals) {
    assert.ok(people[ind.handle], `profile missing for ${ind.handle}`);
    assert.equal(people[ind.handle].name, ind.name);
    assert.equal(people[ind.handle].score, ind.score);
  }
});

test("rank matches the individuals board order", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const arena = deriveArena(content, { now: () => new Date("2026-07-14T00:00:00Z") });
  assert.equal(people[arena.individuals[0].handle].rank, 1);
});

test("every published contribution author has a profile (bylines never dangle)", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const published = content.contributions.filter((c) => c.frontmatter.status === "published");
  for (const c of published) {
    for (const a of c.frontmatter.authors) {
      const handle = a.name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      assert.ok(people[handle], `no profile for author ${a.name} (${handle})`);
    }
  }
});

test("a known author profile carries authored contributions and received rows", () => {
  const content = loadContent(contentRoot);
  const people = derivePeople(content);
  const sofia = people["sofia-marchetti"];
  assert.ok(sofia.contributions.some((c) => c.slug === "retrieval-reranker-lite"));
  assert.ok(sofia.replicationsPerformed.length >= 1);
  assert.equal(sofia.score, 75);
});
