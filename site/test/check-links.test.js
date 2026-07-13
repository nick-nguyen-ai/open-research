import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { checkDist } from "../scripts/check-links.mjs";

const ok = fileURLToPath(new URL("./fixtures/dist-ok", import.meta.url));
const broken = fileURLToPath(new URL("./fixtures/dist-broken", import.meta.url));

test("clean dist with required routes and pagefind passes", () => {
  assert.deepEqual(checkDist(ok, { requiredRoutes: ["/", "/browse/"] }), []);
});

test("missing internal href target is reported with source file", () => {
  const problems = checkDist(broken, { requiredRoutes: ["/"] });
  assert.equal(problems.length >= 2, true); // broken href + missing pagefind
  assert.match(problems.join("\n"), /\/missing\//);
  assert.match(problems.join("\n"), /pagefind/);
});

test("missing required route is reported", () => {
  const problems = checkDist(ok, { requiredRoutes: ["/", "/nope/"] });
  assert.match(problems.join("\n"), /required route \/nope\//);
});
