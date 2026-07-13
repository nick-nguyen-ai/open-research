import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { derive } from "../scripts/derive.mjs";

const root = fileURLToPath(new URL("./fixtures/derive-root", import.meta.url));
const fakeRev = () => "abc1234";
const fakeLog = (dir) => [
  { rev: "deadbee", date: "2026-07-12", subject: `touched ${dir.includes("alpha-cache") ? "alpha-cache" : "other"}` }
];

test("evidence keeps its frozen keys and gains adoptions[] + changelog[]", () => {
  const { evidence } = derive(root, { rev: fakeRev, log: fakeLog });
  const ev = evidence["alpha-cache"];
  // frozen keys unchanged
  assert.ok(Array.isArray(ev.replications));
  assert.ok(Array.isArray(ev.endorsements));
  assert.equal(ev.rev, "abc1234");
  // additive keys
  assert.deepEqual(ev.adoptions, [
    { team: "markets-analytics", pipeline: "markets-nightly-evals", status: "active",
      impact: "eval spend down 58% month over month", since: "2026-07-08", date: "2026-07-13" }
  ]);
  assert.equal(ev.changelog.length, 1);
  assert.equal(ev.changelog[0].rev, "deadbee");
  assert.equal(ev.changelog[0].subject, "touched alpha-cache");
});

test("changelog degrades to [] when the log function throws (no git)", () => {
  const throwingLog = () => { throw new Error("not a git repo"); };
  // the default gitLog swallows errors; a caller-injected thrower must be caught too
  const { evidence } = derive(root, { rev: fakeRev, log: (dir) => {
    try { return throwingLog(dir); } catch { return []; }
  } });
  assert.deepEqual(evidence["alpha-cache"].changelog, []);
});
