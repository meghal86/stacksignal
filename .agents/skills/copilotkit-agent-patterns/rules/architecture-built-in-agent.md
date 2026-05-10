---
title: Use BuiltInAgent with defineTool for Simple Agents
impact: CRITICAL
impactDescription: BuiltInAgent handles AG-UI protocol automatically
tags: architecture, BuiltInAgent, defineTool, setup
---

## Use BuiltInAgent with defineTool for Simple Agents

For agents that primarily need tool-calling capabilities without complex state graphs, use `BuiltInAgent` with `defineTool`. It handles AG-UI protocol event emission, message management, and streaming automatically. Only reach for custom agents or LangGraph when you need multi-step workflows or complex state.

**Incorrect (manual AG-UI event handling for a simple agent):**

```typescript
import { Agent } from "@ag-ui/core"

class MyAgent extends Agent {
  async run(input: RunInput) {
    const stream = new EventStream()
    stream.emit({ type: "RUN_STARTED" })
    stream.emit({ type: "TEXT_MESSAGE_START", messageId: "1" })
    // ... 50+ lines of manual event handling
    return stream
  }
}
```

**Correct (BuiltInAgent with defineTool):**

```typescript
import { BuiltInAgent, defineTool } from "@copilotkit/runtime"
import { z } from "zod"

const agent = new BuiltInAgent({
  name: "researcher",
  description: "Researches topics and provides summaries",
  tools: [
    defineTool({
      name: "search",
      description: "Search for information on a topic",
      parameters: z.object({ query: z.string() }),
      handler: async ({ query }) => {
        return await searchApi(query)
      },
    }),
  ],
})
```

Reference: [BuiltInAgent](https://docs.copilotkit.ai/reference/runtime/built-in-agent)
