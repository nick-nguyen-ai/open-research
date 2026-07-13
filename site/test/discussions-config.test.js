import test from "node:test";
import assert from "node:assert/strict";
import { config } from "../src/config.mjs";

test("discussions default off; config exposes discussionsEnabled", () => {
  assert.equal(config.discussionsEnabled, false);
});
