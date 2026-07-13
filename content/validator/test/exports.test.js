import test from "node:test";
import assert from "node:assert/strict";

test("package exposes ./load subpath export", async () => {
  const mod = await import("@openresearch/validator/load");
  assert.equal(typeof mod.loadContent, "function");
});
