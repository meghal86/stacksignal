---
name: solanaprox-ai
description: Pay-per-use AI inference via Solana USDC. Connect Phantom, deposit any amount, call Claude or GPT-4 instantly. No accounts, no API keys. Wallet is your only credential.
version: 1.0.0
author: lpxdigital
tags: [solana, usdc, ai, inference, phantom, payments, mcp, claude, autonomous]
---

# SolanaProx — AI Inference via Solana USDC

Pay-per-use AI inference powered by Solana USDC. No accounts, no API keys, no geographic restrictions. Your Phantom wallet is your only credential.

## What You Can Do

- Call Claude Sonnet, GPT-4, and other models via Solana USDC payments
- Pay per request — no subscriptions, no minimums
- Use from anywhere in the world — no billing address required
- Works for autonomous agents — wallet is the auth primitive
- Real-time deposit detection via Helius WebSockets

## Claude Desktop Setup

Add SolanaProx to your Claude Desktop config and Claude pays for its own inference in USDC autonomously.

```json
{
  "mcpServers": {
    "solanaprox": {
      "command": "npx",
      "args": ["solanaprox-mcp"]
    }
  }
}
```

**Config file location:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/claude/claude_desktop_config.json`

Restart Claude Desktop after saving. Claude will now pay for inference via your Solana wallet automatically.

## Cursor Setup

```json
{
  "mcpServers": {
    "solanaprox": {
      "command": "npx",
      "args": ["solanaprox-mcp"]
    }
  }
}
```

## API Reference

Base URL: `https://solanaprox.com`

### Send a Message
```bash
POST /v1/messages
X-Wallet-Address: YOUR_PHANTOM_WALLET
Content-Type: application/json

{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 1024,
  "messages": [
    {"role": "user", "content": "Your message here"}
  ]
}
```

Response follows the Anthropic Messages API format.

### Check Balance
```bash
GET /v1/balance
X-Wallet-Address: YOUR_PHANTOM_WALLET
```

Response:
```json
{
  "wallet": "your-wallet-address",
  "balance_usd": 0.042,
  "calls_remaining": 14
}
```

## Setup

**Step 1 — Get a Phantom wallet**
Download at phantom.com. Your wallet address is your identity.

**Step 2 — Deposit USDC**
Send any amount of USDC (Solana network) to the SolanaProx merchant address shown on solanaprox.com. No minimum deposit.

**Step 3 — Start calling**
Include your wallet address as `X-Wallet-Address` header. Balance deducts automatically per call.

## Pricing

- **$0.003 per call** (Claude Sonnet, GPT-4 Turbo)
- No subscription
- No minimum
- Pay only for what you use

## Supported Models

- `claude-sonnet-4-20250514`
- `gpt-4-turbo`

## Why Solana USDC

- Dollar-denominated — no sats conversion needed
- Sub-second settlement via Solana
- Real-time deposit detection via Helius WebSockets
- Phantom wallet — most popular Solana wallet, one-click connect
- Works for bots and autonomous agents — no human approval needed

## Examples

Ask your agent:
> "Use SolanaProx to answer this question and pay from my Solana wallet"

> "Call Claude via SolanaProx and summarize this document"

> "What's my SolanaProx balance?"

## Part of the AIProx Ecosystem

SolanaProx is listed in the AIProx open agent registry — discoverable by any orchestrator querying for `ai-inference` agents on the `solana-usdc` rail.

```bash
curl https://aiprox.dev/api/agents/solanaprox
```

- AIProx Registry: https://aiprox.dev
- LightningProx (Bitcoin rail): https://lightningprox.com
- LPXPoly (Polymarket analysis): https://lpxpoly.com

Built by LPX Digital Group LLC — @SolanaProx
