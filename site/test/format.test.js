import test from "node:test";
import assert from "node:assert/strict";
import { fmtDate, readTime, tierLabel, firstSentence, slugifyHeading } from "../src/lib/format.mjs";

test("fmtDate long and short from string and Date", () => {
  assert.equal(fmtDate("2026-07-13", "long"), "July 2026");
  assert.equal(fmtDate("2026-06-30", "short"), "30 Jun");
  assert.equal(fmtDate(new Date("2026-07-13T00:00:00Z"), "long"), "July 2026");
  assert.equal(fmtDate("2026-06-30", "full"), "30 June 2026");
});

test("readTime floors at 1 minute, 220 wpm", () => {
  assert.equal(readTime("word ".repeat(10)), "1 min read");
  assert.equal(readTime("word ".repeat(900)), "4 min read");
});

test("tierLabel maps all five tiers", () => {
  assert.equal(tierLabel("finding"), "Finding");
  assert.equal(tierLabel("technical-report"), "Technical report");
  assert.equal(tierLabel("research-paper"), "Research paper");
  assert.equal(tierLabel("tutorial"), "Tutorial");
  assert.equal(tierLabel("note"), "Note");
});

test("firstSentence stops at first terminator, caps at 200 chars", () => {
  assert.equal(firstSentence("One two. Three four."), "One two.");
  assert.equal(firstSentence("No terminator here"), "No terminator here");
  assert.equal(firstSentence("x".repeat(300)).length, 200);
});

test("slugifyHeading matches Astro's github-slugger for our headings", () => {
  assert.equal(slugifyHeading("You'll need"), "youll-need");
  assert.equal(slugifyHeading("How to replicate"), "how-to-replicate");
  assert.equal(slugifyHeading("Steps"), "steps");
});
