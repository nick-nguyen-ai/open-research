import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const toolkit = (rel) => fileURLToPath(new URL(`../../toolkit/${rel}`, import.meta.url));

test("marketplace.json parses and the plugin source path exists on disk", () => {
  const mk = JSON.parse(readFileSync(toolkit("marketplace.json"), "utf8"));
  assert.equal(mk.name, "openresearch");
  const entry = mk.plugins.find((p) => p.name === "openresearch");
  assert.ok(entry, "marketplace must list the openresearch plugin");
  assert.equal(entry.source, "./plugins/openresearch");
  // source path resolves to a real directory containing the plugin manifest
  assert.ok(existsSync(toolkit(`${entry.source}/.claude-plugin/plugin.json`)));
});

test("plugin.json pins version 0.3.0 (the installer's pinning anchor)", () => {
  const pl = JSON.parse(readFileSync(toolkit("plugins/openresearch/.claude-plugin/plugin.json"), "utf8"));
  assert.equal(pl.name, "openresearch");
  assert.equal(pl.version, "0.3.0");
});

test("marketplace skills roster: three M3 skills shipped, two M7 upcoming", () => {
  const mk = JSON.parse(readFileSync(toolkit("marketplace.json"), "utf8"));
  const skills = mk.plugins.find((p) => p.name === "openresearch").skills;
  const shipped = skills.filter((s) => !s.shipsIn).map((s) => s.name).sort();
  const upcoming = skills.filter((s) => s.shipsIn === "M7").map((s) => s.name).sort();
  assert.deepEqual(shipped, ["judge", "paper-reader", "publish"]);
  assert.deepEqual(upcoming, ["try-this-paper", "write-replication"]);
});
