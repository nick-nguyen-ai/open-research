# MCP server (placeholder — lands in M7)

This directory will hold the OpenResearch MCP server that answers questions
against the corpus index (F7). It is intentionally empty of configuration today:
no `.mcp.json`, no server entry point, nothing the plugin loader would try to start.

Planned in M7:

- A `q&a` tool over the built corpus index (names/signatures frozen at CP-D).
- A watchlist/digest surface (shape frozen at CP-D).

Until then, `platform.config.json` keeps `mcp.enabled: false` and the plugin ships
skills only. Adding real config here before M7 would be dead config — don't.
