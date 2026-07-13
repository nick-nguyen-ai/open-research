# MCP demo transcript (CP-D gate)

Captured against the built `site/public/qa-index.json`. Frames are newline-delimited JSON-RPC 2.0,
driven with `node toolkit/plugins/openresearch/mcp/server.mjs` over stdio (one request per line on
stdin, one response per line on stdout; the `notifications/initialized` line is a notification and
produces no response line).

## Requests sent (in order)

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"demo-client","version":"1.0.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"openresearch_search","arguments":{"query":"heading aware chunking","k":3}}}
```

## Responses received

```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05","capabilities":{"tools":{}},"serverInfo":{"name":"openresearch","version":"0.4.0"}}}
```

```json
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"openresearch_search","description":"Lexical (BM25) search over the OpenResearch corpus. Returns the top-k contribution chunks with slug, section, score, and the source repo path.","inputSchema":{"type":"object","properties":{"query":{"type":"string","description":"Natural-language or keyword query."},"k":{"type":"integer","minimum":1,"maximum":20,"description":"How many chunks to return (default 5)."}},"required":["query"]}},{"name":"openresearch_answer","description":"Search the corpus and return a citation scaffold (top chunks + citation lines) for the calling model to compose an answer from. Never invents facts; never calls an LLM.","inputSchema":{"type":"object","properties":{"question":{"type":"string","description":"The question to answer from the corpus."}},"required":["question"]}}]}}
```

```json
{"jsonrpc":"2.0","id":3,"result":{"content":[{"type":"text","text":"Top 3 chunks for \"heading aware chunking\":\n\n1. [heading-aware-chunking · Summary] (score 9.915895)\n   Heading-aware chunking beats fixed windows on policy documents. +11pt recall@10. 0.71 → 0.82 recall@10 on the policy corpus\n   source: content/contributions/heading-aware-chunking/index.md\n\n2. [heading-aware-chunking · You'll build] (score 9.10711)\n   You'll build. A structure-aware chunker that splits documents along their heading tree instead of\r\nfixed token windows, plus a small recall@10 comparison against your current chunking.\n   source: content/contributions/heading-aware-chunking/index.md\n\n3. [heading-aware-chunking · Steps] (score 3.020316)\n   Steps. 1. Parse each document's headings into a tree — markdown structure is your chunk\r\n   boundary map.\r\n2. Split at heading depth 2; merge leaves under 200 tokens into their parent so no\r\n   chunk is a fragment.\r\n3. Cap chunks at 800 tokens; when a section exceeds the cap, split at paragraph\r\n   boundaries and repeat the heading path as context.\r\n4. Re-index and run your retrieval eval. On our policy corpus recall@10 rose from\r\n   0.71 to 0.82 with no other changes.\n   source: content/contributions/heading-aware-chunking/index.md"}],"structuredContent":{"query":"heading aware chunking","results":[{"id":"heading-aware-chunking#summary","slug":"heading-aware-chunking","tier":"tutorial","section":"Summary","score":9.915895,"text":"Heading-aware chunking beats fixed windows on policy documents. +11pt recall@10. 0.71 → 0.82 recall@10 on the policy corpus","path":"content/contributions/heading-aware-chunking/index.md"},{"id":"heading-aware-chunking#youll-build","slug":"heading-aware-chunking","tier":"tutorial","section":"You'll build","score":9.10711,"text":"You'll build. A structure-aware chunker that splits documents along their heading tree instead of\r\nfixed token windows, plus a small recall@10 comparison against your current chunking.","path":"content/contributions/heading-aware-chunking/index.md"},{"id":"heading-aware-chunking#steps","slug":"heading-aware-chunking","tier":"tutorial","section":"Steps","score":3.020316,"text":"Steps. 1. Parse each document's headings into a tree — markdown structure is your chunk\r\n   boundary map.\r\n2. Split at heading depth 2; merge leaves under 200 tokens into their parent so no\r\n   chunk is a fragment.\r\n3. Cap chunks at 800 tokens; when a section exceeds the cap, split at paragraph\r\n   boundaries and repeat the heading path as context.\r\n4. Re-index and run your retrieval eval. On our policy corpus recall@10 rose from\r\n   0.71 to 0.82 with no other changes.","path":"content/contributions/heading-aware-chunking/index.md"}]}}}
```

## Result

`initialize` reports `serverInfo.name = "openresearch"`, `version = "0.4.0"`, `protocolVersion = "2024-11-05"`.
`tools/list` reports exactly `openresearch_search` and `openresearch_answer`.
`tools/call openresearch_search {query:"heading aware chunking", k:3}` returns its top hit as
`slug: "heading-aware-chunking"` (score 9.915895) — the server never calls an LLM; it returns ranked
corpus chunks plus their source repo paths for the calling session to compose an answer from.
