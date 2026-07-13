#!/usr/bin/env node
// OpenResearch Q&A MCP server. Hand-rolled JSON-RPC 2.0 over stdio, zero dependencies.
// Protocol subset: initialize, notifications/initialized, tools/list, tools/call.
// Tools: openresearch_search, openresearch_answer. The server NEVER calls an LLM —
// it returns ranked chunks + a citation scaffold; the calling session composes prose.
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { search } from "../../../../site/src/lib/bm25.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "openresearch", version: "0.4.0" };

function findRepoRoot(startDir) {
  let dir = startDir;
  while (true) {
    if (existsSync(join(dir, "platform.config.json"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

// Prefer the published artifact; fall back to an in-memory build from content/ (dev).
async function loadIndex() {
  const repoRoot = findRepoRoot(HERE) ?? process.cwd();
  const built = join(repoRoot, "site", "public", "qa-index.json");
  if (existsSync(built)) return JSON.parse(readFileSync(built, "utf8"));
  const { buildQaIndex } = await import("../../../../site/scripts/build-index.mjs");
  return buildQaIndex(join(repoRoot, "content"));
}

const TOOLS = [
  {
    name: "openresearch_search",
    description: "Lexical (BM25) search over the OpenResearch corpus. Returns the top-k contribution chunks with slug, section, score, and the source repo path.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Natural-language or keyword query." },
        k: { type: "integer", minimum: 1, maximum: 20, description: "How many chunks to return (default 5)." }
      },
      required: ["query"]
    }
  },
  {
    name: "openresearch_answer",
    description: "Search the corpus and return a citation scaffold (top chunks + citation lines) for the calling model to compose an answer from. Never invents facts; never calls an LLM.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", description: "The question to answer from the corpus." } },
      required: ["question"]
    }
  }
];

function clampK(k) {
  const n = Number.parseInt(k, 10);
  if (!Number.isFinite(n)) return 5;
  return Math.max(1, Math.min(20, n));
}

function formatSearch(query, results) {
  if (results.length === 0) return `No corpus chunks matched "${query}".`;
  const lines = results.map((r, i) =>
    `${i + 1}. [${r.slug} · ${r.section}] (score ${r.score})\n   ${r.text}\n   source: ${r.path}`);
  return `Top ${results.length} chunks for "${query}":\n\n${lines.join("\n\n")}`;
}

function formatAnswer(question, results) {
  if (results.length === 0) return `No corpus material found for: ${question}\nAnswer from the corpus is not possible; say so.`;
  const cites = results.map((r) => `- ${r.slug} · ${r.section} — ${r.path}`).join("\n");
  const body = results.map((r, i) => `[${i + 1}] (${r.slug} · ${r.section})\n${r.text}`).join("\n\n");
  return [
    `Answer scaffold for: ${question}`,
    ``,
    `Compose a concise answer ONLY from the chunks below; cite each claim as [n]. If they do not answer the question, say so.`,
    ``,
    body,
    ``,
    `Citations:`,
    cites
  ].join("\n");
}

function reply(id, result) { return { jsonrpc: "2.0", id, result }; }
function errorReply(id, code, message) { return { jsonrpc: "2.0", id, error: { code, message } }; }

function callTool(index, id, params) {
  const name = params?.name;
  const args = params?.arguments ?? {};
  if (name === "openresearch_search") {
    const results = search(index, String(args.query ?? ""), clampK(args.k));
    return reply(id, {
      content: [{ type: "text", text: formatSearch(String(args.query ?? ""), results) }],
      structuredContent: { query: args.query ?? "", results }
    });
  }
  if (name === "openresearch_answer") {
    const results = search(index, String(args.question ?? ""), 6);
    return reply(id, {
      content: [{ type: "text", text: formatAnswer(String(args.question ?? ""), results) }],
      structuredContent: {
        question: args.question ?? "",
        chunks: results,
        citations: results.map((r) => ({ slug: r.slug, section: r.section, path: r.path }))
      }
    });
  }
  return errorReply(id, -32602, `Unknown tool: ${name ?? "(none)"}`);
}

function handle(index, msg) {
  const { id, method, params } = msg;
  if (method === "initialize") {
    return reply(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO });
  }
  if (method === "notifications/initialized") return null; // notification — no reply
  if (method === "tools/list") return reply(id, { tools: TOOLS });
  if (method === "tools/call") return callTool(index, id, params);
  if (id === undefined || id === null) return null; // unknown notification
  return errorReply(id, -32601, `Method not found: ${method}`);
}

const index = await loadIndex(); // top-level await: fail loud at startup if the corpus is broken

const rl = createInterface({ input: process.stdin });
rl.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  let msg;
  try { msg = JSON.parse(trimmed); } catch { return; }
  const res = handle(index, msg);
  if (res) process.stdout.write(JSON.stringify(res) + "\n");
});
