import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { deriveToolkit } from "../scripts/derive.mjs";

const toolkitRoot = fileURLToPath(new URL("./fixtures/toolkit-root", import.meta.url));
const missingRoot = fileURLToPath(new URL("./fixtures/nope-toolkit", import.meta.url));

test("deriveToolkit merges plugin.json version with marketplace roster", () => {
  const t = deriveToolkit(toolkitRoot, { repo: null, host: "github.com" });
  assert.equal(t.name, "openresearch");
  assert.equal(t.version, "9.9.9"); // pinning anchor comes from plugin.json
  assert.equal(t.source, "./plugins/openresearch");
  assert.equal(t.skills.length, 3);
  assert.deepEqual(t.skills.find((s) => s.name === "judge"), { name: "judge", purpose: "advisory review", shipsIn: null });
  assert.equal(t.skills.find((s) => s.name === "try-this-paper").shipsIn, "M7");
  assert.equal(t.install.init, "npx openresearch init");
  assert.equal(t.install.marketplaceAdd, "claude plugin marketplace add ./toolkit"); // no-remote
});

test("deriveToolkit uses repo URL for marketplaceAdd when repo is set", () => {
  const t = deriveToolkit(toolkitRoot, { repo: "org/openresearch", host: "github.com" });
  assert.equal(t.install.marketplaceAdd, "claude plugin marketplace add https://github.com/org/openresearch");
});

test("deriveToolkit fails loud when the toolkit files are missing", () => {
  assert.throws(() => deriveToolkit(missingRoot, { repo: null, host: "github.com" }), /missing/);
});
