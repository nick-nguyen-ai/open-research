import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import {
  parseArgs, findRepoRoot, resolveSource,
  planInit, planUpdate, which, doctor
} from "../bin/openresearch.mjs";

test("parseArgs reads command, --dry-run, and --version <semver>", () => {
  assert.deepEqual(parseArgs(["init"]), { command: "init", dryRun: false, version: null });
  assert.deepEqual(parseArgs(["init", "--dry-run"]), { command: "init", dryRun: true, version: null });
  assert.deepEqual(parseArgs(["update", "--version", "0.3.0"]), { command: "update", dryRun: false, version: "0.3.0" });
});

test("resolveSource: repo URL when set, local toolkit path in no-remote mode", () => {
  assert.equal(
    resolveSource({ host: "github.com", repo: "org/openresearch" }, "/repo"),
    "https://github.com/org/openresearch"
  );
  assert.equal(resolveSource({ host: "github.com", repo: null }, "/repo"), join("/repo", "toolkit"));
});

test("planInit plans marketplace-add then install", () => {
  const plan = planInit("/repo/toolkit");
  assert.deepEqual(plan, [
    ["claude", "plugin", "marketplace", "add", "/repo/toolkit"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ]);
});

test("planUpdate plans update+install; --version must match plugin.json", () => {
  assert.deepEqual(planUpdate("/repo/toolkit", { version: null, pluginVersion: "0.3.0" }), [
    ["claude", "plugin", "marketplace", "update", "openresearch"],
    ["claude", "plugin", "install", "openresearch@openresearch"]
  ]);
  assert.deepEqual(planUpdate("/repo/toolkit", { version: "0.3.0", pluginVersion: "0.3.0" }).length, 2);
  assert.throws(
    () => planUpdate("/repo/toolkit", { version: "0.9.9", pluginVersion: "0.3.0" }),
    /does not match plugin.json version 0.3.0/
  );
});

test("which probes PATH via injected exists + delimiter", () => {
  const exists = (p) => p === join("/opt/bin", "claude");
  assert.equal(which("claude", { path: "/opt/bin", exists, delimiter: ":", exts: [""] }), true);
  assert.equal(which("gh", { path: "/opt/bin", exists, delimiter: ":", exts: [""] }), false);
});

test("findRepoRoot walks up to platform.config.json, else throws", () => {
  const exists = (p) => p === join("/a", "platform.config.json");
  assert.equal(findRepoRoot("/a/b/c", exists), "/a");
  assert.throws(() => findRepoRoot("/x/y", () => false), /platform.config.json not found/);
});

test("doctor: node<20 fails; present claude is ok; missing gh warns", () => {
  const exists = (p) => p.endsWith("claude");
  const fail = doctor({ nodeVersion: "18.20.0", path: "/bin", exists, repoRoot: "/repo" });
  assert.equal(fail.find((c) => c.name === "node >= 20").status, "fail");

  const ok = doctor({ nodeVersion: "20.11.0", path: "/bin", exists, repoRoot: "/repo" });
  assert.equal(ok.find((c) => c.name === "node >= 20").status, "ok");
  assert.equal(ok.find((c) => c.name === "claude CLI").status, "ok");
  assert.equal(ok.find((c) => c.name === "gh CLI").status, "warn");
  assert.equal(ok.find((c) => c.name.startsWith("bedrock")).status, "warn");
});
