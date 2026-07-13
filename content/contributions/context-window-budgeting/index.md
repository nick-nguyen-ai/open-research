---
id: context-window-budgeting
title: Budget the context window like memory, not like a bucket
tier: note
authors:
  - name: Priyanka Nair
    team: ib-quant
    division: Institutional
category: agents
tags: [context, agents, cost]
status: published
created: 2026-07-13
updated: 2026-07-14
---

*Treat the context window as a budget with named line items, not a bucket you fill until
it overflows.* An agent that greedily appends every tool result and every retrieved
chunk will hit the limit exactly when it needs room to reason, and the eviction that
follows is blind — it drops whatever is oldest, not whatever matters least.

Reserve allocations up front. A split that has held up for us on a 200k window: ~15k for
the system prompt and tool schemas, ~120k for the working set (the task, the plan, and
the current retrieved evidence), and a fixed ~40k scratch region for intermediate
reasoning and draft tool calls, with the remainder kept as slack. The point is that each
region has an owner and a ceiling, so growth in one cannot silently cannibalize another.

The failure mode we watched for is scratch starvation. When retrieval was allowed to
expand into the scratch reservation, the agent still had "room" by the token count but no
space to think — it stopped decomposing multi-step tasks and started answering from the
first plausible chunk, and quality dropped well before any hard limit was reached. Pin
the scratch floor and the collapse goes away.
