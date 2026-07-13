import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { derive } from "../scripts/derive.mjs";
import { loadContent } from "@openresearch/validator/load";

const contentRoot = fileURLToPath(new URL("../../content", import.meta.url));

test("record has reached 10 published contributions", () => {
  const { stats, cards } = derive(contentRoot, { rev: () => "test" });
  // CP-B floor: the soft-launch content bar is >=10 published contributions; later cycles add more.
  assert.ok(stats.contributions >= 10, `expected >=10 contributions, got ${stats.contributions}`);
  assert.ok(cards.length >= 10, `expected >=10 cards, got ${cards.length}`);
});

test("author team + division spread: >=4 teams across >=3 divisions", () => {
  const { contributions } = loadContent(contentRoot);
  const published = contributions.filter((c) => c.frontmatter.status === "published");
  const teams = new Set();
  const divisions = new Set();
  for (const c of published) {
    for (const a of c.frontmatter.authors) {
      teams.add(a.team);
      if (a.division) divisions.add(a.division);
    }
  }
  assert.ok(teams.size >= 4, `expected >=4 author teams, got ${teams.size}`);
  assert.ok(divisions.size >= 3, `expected >=3 divisions, got ${divisions.size}`);
});

test("toolkit.json shape matches plugin.json version and skill roster", () => {
  const toolkit = JSON.parse(readFileSync(fileURLToPath(new URL("../src/data/toolkit.json", import.meta.url)), "utf8"));
  const plugin = JSON.parse(readFileSync(fileURLToPath(new URL("../../toolkit/plugins/openresearch/.claude-plugin/plugin.json", import.meta.url)), "utf8"));
  assert.equal(toolkit.name, "openresearch");
  assert.equal(toolkit.version, plugin.version);
  assert.equal(toolkit.version, "0.4.0");
  assert.equal(toolkit.skills.length, 5);
  assert.equal(toolkit.skills.filter((s) => !s.shipsIn).length, 5);
  assert.equal(toolkit.skills.filter((s) => s.shipsIn === "M7").length, 0);
  assert.equal(toolkit.install.init, "npx openresearch init");
  assert.equal(toolkit.install.marketplaceAdd, "claude plugin marketplace add ./toolkit");
});
