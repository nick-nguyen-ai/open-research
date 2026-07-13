import test from "node:test";
import assert from "node:assert/strict";
import { config, platformConfig, deriveRepoUrl } from "../src/config.mjs";

test("deriveRepoUrl composes host + repo, or null in no-remote mode", () => {
  assert.equal(deriveRepoUrl({ host: "github.com", repo: "org/openresearch" }), "https://github.com/org/openresearch");
  assert.equal(deriveRepoUrl({ host: "ghe.internal", repo: "ai/openresearch" }), "https://ghe.internal/ai/openresearch");
  assert.equal(deriveRepoUrl({ host: "github.com", repo: null }), null);
});

test("config reflects the repo-root platform.config.json (no-remote defaults)", () => {
  assert.equal(platformConfig.name, "OpenResearch");
  assert.equal(config.name, "OpenResearch");
  assert.equal(config.host, "github.com");
  assert.equal(config.repo, null);
  assert.equal(config.repoUrl, null); // no-remote mode
  assert.equal(config.baseUrl, null);
  assert.equal(config.judgeCi, false);
  assert.equal(config.mcpEnabled, false);
});
