import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const serverPath = fileURLToPath(new URL("../../toolkit/plugins/openresearch/mcp/server.mjs", import.meta.url));

// Drive the server: write a list of request objects, collect one response line each
// (notifications produce no line). Resolves when `expected` response lines arrive.
function driveServer(requests, expected) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [serverPath], { stdio: ["pipe", "pipe", "inherit"] });
    const responses = [];
    let buf = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("timeout")); }, 15000);
    child.stdout.on("data", (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (line) responses.push(JSON.parse(line));
        if (responses.length >= expected) {
          clearTimeout(timer);
          child.stdin.end();
          child.kill();
          resolve(responses);
        }
      }
    });
    child.on("error", reject);
    for (const r of requests) child.stdin.write(JSON.stringify(r) + "\n");
  });
}

test("initialize → tools/list → tools/call search over the real corpus", async () => {
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name: "test", version: "0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "openresearch_search", arguments: { query: "heading aware chunking", k: 3 } } }
  ];
  const [init, list, call] = await driveServer(requests, 3);

  assert.equal(init.id, 1);
  assert.equal(init.result.protocolVersion, "2024-11-05");
  assert.equal(init.result.serverInfo.name, "openresearch");

  assert.equal(list.id, 2);
  const names = list.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["openresearch_answer", "openresearch_search"]);
  for (const t of list.result.tools) assert.ok(t.inputSchema && t.inputSchema.type === "object");

  assert.equal(call.id, 3);
  assert.ok(Array.isArray(call.result.structuredContent.results));
  assert.ok(call.result.structuredContent.results.length >= 1);
  assert.equal(call.result.structuredContent.results[0].slug, "heading-aware-chunking");
  assert.match(call.result.content[0].text, /heading-aware-chunking/);
});

test("openresearch_answer returns citations; unknown tool errors -32602", async () => {
  const requests = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "openresearch_answer", arguments: { question: "how do I cut eval cost?" } } },
    { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "nope_tool", arguments: {} } },
    { jsonrpc: "2.0", id: 4, method: "bogus/method" }
  ];
  const [, answer, badTool, badMethod] = await driveServer(requests, 4);
  assert.ok(Array.isArray(answer.result.structuredContent.citations));
  assert.equal(badTool.error.code, -32602);
  assert.equal(badMethod.error.code, -32601);
});
