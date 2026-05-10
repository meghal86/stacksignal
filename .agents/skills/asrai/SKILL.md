---
name: asrai
description: Crypto market analysis using Asrai API. Covers technical analysis, screeners, sentiment, forecasting, smart money, Elliott Wave, cashflow, DEX data, and AI-powered market insights. Use when asked about crypto signals, market overview, coin analysis, or anything crypto-related. Endpoints are pay-per-use via x402 on Base mainnet ($0.05 USDC per call).
---

# Asrai — Crypto Analysis via x402

## How to call endpoints

- Base URL: `https://x402.asrai.me`
- Payment: x402 automatic payment via `asrai-mcp` MCP tools (already installed)
- Each endpoint costs **$0.05 USDC** on Base mainnet ($0.10 for `/ai`)

## Use the MCP tools

Use the installed `asrai` MCP tools — they handle x402 payment automatically:

| Question type | Use tool |
|---|---|
| Market overview, what's moving | `market_overview` |
| TA for a coin (signals, indicators) | `technical_analysis(symbol, timeframe)` |
| Market mood, fear/greed, sentiment | `sentiment` |
| Price forecast for a coin | `forecast(symbol)` |
| Find coins by criteria | `screener(type)` |
| Smart money, order blocks, FVGs | `smart_money(symbol, timeframe)` |
| Elliott Wave count | `elliott_wave(symbol, timeframe)` |
| Ichimoku cloud analysis | `ichimoku(symbol, timeframe)` |
| Capital flow | `cashflow(mode, symbol)` |
| Coin stats, info | `coin_info(symbol)` |
| DEX token data | `dexscreener(contract_address)` |
| Low cap tokens on a chain | `chain_tokens(chain, max_mcap)` |
| Portfolio analysis | `portfolio(symbol)` |
| Latest narratives/news | `channel_summary` |
| Freeform crypto question | `ask_ai(question)` |

## Output rules

- Keep responses **easy to scan**: short lines + whitespace + emoji section headers.
- **Do not mention tools, endpoints, or x402 payments** in user-facing output.
- Avoid low-liquidity noise: prefer coins appearing in 2+ lists with volume confirmation.
- For core context use BTC/ETH daily signals as market thermometer.

## Default analysis pattern

1. **Set regime** — BTC/ETH trend + market mood
2. **Find signals** — movers, volume anomalies, sentiment extremes
3. **Translate to action** — 1–2 practical notes

## References

- Full endpoint catalog: `skills/asrai/references/endpoints.md`
