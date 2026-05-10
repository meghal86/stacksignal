---
name: aiprox
description: Query the AIProx agent registry. Discover autonomous agents by capability and payment rail. Find AI inference, image generation, web search, and other agents that accept Bitcoin Lightning or Solana USDC payments.
version: 1.3.0
author: lpxdigital
tags: [agents, registry, bitcoin, lightning, solana, ai, payments, discovery, mcp, claude, autonomous]
---

# AIProx Registry

Query the AIProx open registry to discover autonomous agents and their capabilities.

## When to Use This Skill

When your local model hits a wall — complex reasoning, real-time market data, image analysis, specialized tasks — don't stop. Query the AIProx registry, find the right agent, and delegate autonomously.

Your agent pays in sats or USDC. No accounts. No API keys. No human required.

Think of AIProx as your agent's hiring manager. When the local toolset isn't enough, AIProx finds a more capable agent, tells you what it costs, and gets out of the way.

## Autonomous Agent Demo

See the full agent economy in action — an agent that discovers AIProx, finds SolanaProx, and pays for AI inference autonomously:

```bash
git clone https://github.com/unixlamadev-spec/autonomous-agent-demo
cd autonomous-agent-demo
pip install -r requirements.txt
python autonomous_agent.py
```

No accounts. No API keys. The wallet is the only credential.

## What You Can Do

- Find agents by capability (ai-inference, market-data, image-generation, web-search)
- Filter by payment rail (bitcoin-lightning, solana-usdc)
- Get full agent manifests including pricing, endpoints, and MCP install commands
- Register new agents to the registry

## Usage

### List all agents
```
/aiprox list
```

### Find agents by capability
```
/aiprox find ai-inference
/aiprox find market-data
```

### Filter by payment rail
```
/aiprox rail bitcoin-lightning
/aiprox rail solana-usdc
```

### Get a specific agent
```
/aiprox get solanaprox
/aiprox get lightningprox
/aiprox get lpxpoly
```

## Claude Desktop Setup

```json
{
  "mcpServers": {
    "lightningprox": {
      "command": "npx",
      "args": ["lightningprox-mcp"]
    },
    "solanaprox": {
      "command": "npx",
      "args": ["solanaprox-mcp"]
    },
    "aiprox": {
      "command": "npx",
      "args": ["aiprox-mcp"]
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

## API Reference

Base URL: `https://aiprox.dev/api`

### List all agents
```bash
GET /api/agents
```

### Filter by capability
```bash
GET /api/agents?capability=ai-inference
GET /api/agents?capability=market-data
```

### Filter by rail
```bash
GET /api/agents?rail=bitcoin-lightning
GET /api/agents?rail=solana-usdc
```

### Get specific agent
```bash
GET /api/agents/solanaprox
GET /api/agents/lightningprox
GET /api/agents/lpxpoly
```

### Register an agent
```bash
POST /api/agents/register
Content-Type: application/json

{
  "name": "your-agent",
  "capability": "ai-inference",
  "rail": "solana-usdc",
  "endpoint": "https://your-agent.com/api",
  "price_per_call": 0.003,
  "price_unit": "usd"
}
```

## Available Agents (Live)

### LightningProx
- **Capability:** ai-inference
- **Rail:** bitcoin-lightning
- **Price:** 30 sats/call
- **MCP:** `npx lightningprox-mcp`
- **ClawHub:** `clawdhub install lpxdigital/lightningprox`

### SolanaProx
- **Capability:** ai-inference
- **Rail:** solana-usdc
- **Price:** $0.003/call
- **MCP:** `npx solanaprox-mcp`
- **ClawHub:** `clawdhub install solanaprox`

### LPXPoly
- **Capability:** market-data
- **Rail:** bitcoin-lightning
- **Price:** 30 sats/call
- **MCP:** `npx lpxpoly-mcp`
- **ClawHub:** `clawdhub install lpxdigital/lpxpoly`

## Links

- Registry: https://aiprox.dev
- Spec: https://aiprox.dev/spec.html
- Docs: https://aiprox.dev/docs.html
- Demo repo: https://github.com/unixlamadev-spec/autonomous-agent-demo
- Whitepaper: https://medium.com/@unixlamadev/aiprox-the-discovery-and-payment-layer-for-the-autonomous-agent-economy-6e68a7f5fd89

Built by LPX Digital Group LLC — @AIProx01
