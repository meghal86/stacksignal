---
title: Configure MCP Servers for External Tools
impact: MEDIUM
impactDescription: MCP extends agent capabilities without custom tool implementation
tags: architecture, MCP, servers, external-tools
---

## Configure MCP Servers for External Tools

Use MCP (Model Context Protocol) server configuration to give agents access to external tools and data sources. This avoids reimplementing tool integrations that already exist as MCP servers.

**Incorrect (reimplementing existing tool integrations):**

```typescript
const agent = new BuiltInAgent({
  name: "developer",
  tools: [
    defineTool({
      name: "read_file",
      handler: async ({ path }) => fs.readFileSync(path, "utf-8"),
    }),
    defineTool({
      name: "search_code",
      handler: async ({ query }) => { /* custom implementation */ },
    }),
  ],
})
```

**Correct (MCP servers provide standard tool integrations):**

```typescript
const agent = new BuiltInAgent({
  name: "developer",
  mcpServers: [
    {
      name: "filesystem",
      transport: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"] },
    },
    {
      name: "github",
      transport: { type: "stdio", command: "npx", args: ["-y", "@modelcontextprotocol/server-github"] },
    },
  ],
})
```

Reference: [MCP Integration](https://docs.copilotkit.ai/guides/mcp)
