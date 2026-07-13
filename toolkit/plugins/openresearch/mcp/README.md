# MCP server

`server.mjs` is the OpenResearch Q&A MCP server: a hand-rolled JSON-RPC 2.0
server over stdio, zero dependencies. It speaks the `initialize` /
`notifications/initialized` / `tools/list` / `tools/call` subset of the
protocol.

Tools:

- `openresearch_search` — lexical (BM25) search over the corpus; returns
  top-k chunks with slug, section, score, and source repo path.
- `openresearch_answer` — searches the corpus and returns a citation
  scaffold (top chunks + citation lines) for the calling session to compose
  an answer from. The server never calls an LLM and never invents facts.

Index source: the built `site/public/qa-index.json` when present, falling
back in dev to an in-memory build from `content/` via
`site/scripts/build-index.mjs`.

Gating: `platform.config.json`'s `mcp.enabled` is the workflow gate. It
starts `false`; `npx openresearch init` flips it to `true` (preserving every
other key) once the server is confirmed present.

See `DEMO.md` for a captured request/response transcript, and
`site/test/mcp-server.test.js` / `toolkit/installer/test/mcp-install.test.js`
for the protocol tests.
