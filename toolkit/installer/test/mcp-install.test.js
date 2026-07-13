import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { doctor, enableMcp, main } from "../bin/openresearch.mjs";

const cfgPath = join("/repo", "platform.config.json");
const mcpServer = join("/repo", "toolkit", "plugins", "openresearch", "mcp", "server.mjs");
const mcpJson = join("/repo", "toolkit", "plugins", "openresearch", ".mcp.json");

test("doctor reports an mcp server check (ok when server + .mcp.json exist)", () => {
  const present = (p) => p === mcpServer || p === mcpJson;
  const ok = doctor({ nodeVersion: "20.11.0", path: "/bin", exists: present, repoRoot: "/repo" });
  assert.equal(ok.find((c) => c.name === "mcp server").status, "ok");
  const absent = doctor({ nodeVersion: "20.11.0", path: "/bin", exists: () => false, repoRoot: "/repo" });
  assert.equal(absent.find((c) => c.name === "mcp server").status, "warn");
});

test("enableMcp flips mcp.enabled true, preserving other keys", () => {
  let written = null;
  const read = () => JSON.stringify({ name: "OpenResearch", host: "github.com", repo: null, mcp: { enabled: false }, discussions: { enabled: false } });
  const cfg = enableMcp("/repo", { read, write: (p, s) => { written = { p, s }; } });
  assert.equal(cfg.mcp.enabled, true);
  assert.equal(written.p, cfgPath);
  const parsed = JSON.parse(written.s);
  assert.equal(parsed.mcp.enabled, true);
  assert.equal(parsed.host, "github.com");
  assert.equal(parsed.discussions.enabled, false);
});

test("init --dry-run announces the mcp flip when the server is present", () => {
  const lines = [];
  const exists = (p) => p === cfgPath || p === mcpServer || p === mcpJson;
  const read = () => JSON.stringify({ host: "github.com", repo: null, mcp: { enabled: false } });
  main(["init", "--dry-run"], { PATH: "" }, {
    log: (s) => lines.push(s), cwd: "/repo", exists, read,
    spawn: () => ({ status: 0 }), write: () => {}
  });
  assert.ok(lines.includes("[dry-run] set mcp.enabled=true in platform.config.json"));
});

test("init (claude present) flips mcp.enabled after install when server present", () => {
  let wrote = false;
  const exists = (p) => p === cfgPath || p === mcpServer || p === mcpJson || p.toLowerCase().endsWith("claude");
  const read = () => JSON.stringify({ host: "github.com", repo: null, mcp: { enabled: false } });
  main(["init"], { PATH: "/opt/bin" }, {
    log: () => {}, cwd: "/repo", exists, read,
    spawn: () => ({ status: 0 }), write: () => { wrote = true; }
  });
  assert.equal(wrote, true);
});
