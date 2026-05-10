---
name: lpxpoly
description: AI-powered Polymarket analysis. Get edge opportunities, analyze specific markets, and set price alerts. Powered by LightningProx — pay per analysis in Bitcoin sats. No accounts, no API keys.
version: 1.0.0
author: lpxdigital
tags: [polymarket, prediction-markets, bitcoin, lightning, ai, trading, market-data, edge]
---

# LPXPoly — AI Polymarket Analysis

AI-powered analysis of Polymarket prediction markets. Identify mispriced markets, get edge opportunities, and set price alerts — all paid via Bitcoin Lightning.

## What You Can Do

- Get AI-identified edge opportunities across trending Polymarket markets
- Analyze any specific Polymarket market with AI
- Set price alerts on any market
- Pay per analysis in sats via Lightning — no accounts, no API keys

## Claude Desktop Setup

```json
{
  "mcpServers": {
    "lpxpoly": {
      "command": "npx",
      "args": ["lpxpoly-mcp"]
    },
    "lightningprox": {
      "command": "npx",
      "args": ["lightningprox-mcp"]
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

## API Reference

Base URL: `https://lpxpoly.com`

### Get Edge Opportunities
```bash
GET /api/edge
```
Returns AI-identified OVERVALUED and UNDERVALUED markets from Polymarket. Cached and refreshed every 15 minutes.

Response:
```json
{
  "opportunities": [
    {
      "question": "Will X happen?",
      "slug": "will-x-happen",
      "category": "Politics",
      "yes_price": 0.42,
      "signal": "UNDERVALUED",
      "ai_fair_value": 0.58,
      "delta": 0.16,
      "volume_24h": 12500,
      "liquidity": 45000,
      "verdict": "AI sees higher probability than market"
    }
  ],
  "scanned_count": 30,
  "generated_at": "2026-02-24T12:00:00Z"
}
```

### Analyze a Specific Market
```bash
POST /api/scan
Content-Type: application/json
X-Spend-Token: your-lightning-spend-token

{
  "market_url": "https://polymarket.com/event/market-slug",
  "spend_token": "your-lightning-spend-token"
}
```

Response:
```json
{
  "market_question": "Will X happen?",
  "market_slug": "will-x-happen",
  "analysis": "Full AI analysis...",
  "yes_price": 0.42,
  "no_price": 0.58,
  "volume_24h": 12500,
  "total_volume": 250000,
  "liquidity": 45000
}
```

### Get Lightning Invoice
```bash
POST /api/invoice
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "messages": [{"role": "user", "content": "analyze this market"}],
  "max_tokens": 1024
}
```

### Set Price Alert
```bash
POST /api/alerts/create
Content-Type: application/json

{
  "market_url": "https://polymarket.com/event/market-slug",
  "direction": "above",
  "threshold": 0.65
}
```

### List Alerts
```bash
GET /api/alerts
```

### Delete Alert
```bash
POST /api/alerts/delete
Content-Type: application/json

{"id": "alert-id"}
```

## Payment

LPXPoly uses LightningProx for AI analysis payments. You need a Lightning spend token.

**Get a spend token:**
1. Visit lightningprox.com
2. Fund a Lightning wallet
3. Generate a spend token
4. Pass it as `X-Spend-Token` header or in the request body

**Cost:** ~30-100 sats per analysis depending on model and length.

## Examples

Ask your agent:
> "What are the best edge opportunities on Polymarket right now?"

> "Analyze this Polymarket market and tell me if it's mispriced: [URL]"

> "Set an alert on this market when it goes above 70%"

> "Find undervalued markets in the Politics category on Polymarket"

## Links

- Site: https://lpxpoly.com
- Twitter: @LPXPoly
- AIProx Registry: https://aiprox.dev/api/agents/lpxpoly
- LightningProx (payment rail): https://lightningprox.com

Built by LPX Digital Group LLC — part of the AIProx agent ecosystem.
