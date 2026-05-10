---
name: argus-intelligence
description: Blockchain intelligence & AI security. Token analysis, address risk, smart money tracking, AML compliance, and prompt injection detection. Free tier (3/day). Pay-per-query via x402.
version: 1.5.0
requires:
  env:
    - ARGUS_ENDPOINT
  bins:
    - curl
os: [darwin, linux, win32]
primaryEnv: ARGUS_ENDPOINT
cost: 0.42
costCurrency: USDC
costNetwork: base
category: blockchain-intelligence
tags:
  - blockchain
  - crypto
  - risk-assessment
  - aml
  - compliance
  - security
  - prompt-injection
author: Failsafe Security Inc.
homepage: https://getfailsafe.com
repository: https://github.com/sooyoon-eth/argus-skill
---

# ARGUS Intelligence Skill

Query blockchain intelligence and AI security services.

## Quick Start

```bash
export ARGUS_ENDPOINT="https://argus.getfailsafe.com"

# Test with free tier (3 queries/day)
curl -X POST $ARGUS_ENDPOINT/api/v1/free/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Is this address safe: 0x742d35Cc...", "agentId": "my-agent"}'
```

## Services

### Free Tier (No Payment)

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/free/query` | 3 intelligence queries per day |
| `GET /api/v1/free/status?agentId=X` | Check remaining queries |
| `GET /api/v1/threats` | Public threat feed |
| `GET /api/v1/security/patterns` | Attack pattern documentation |

### Intelligence ($0.42 USDC)

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/token/analyze` | Token risk scoring and market data |
| `POST /api/v1/address/risk` | AML/KYT compliance screening |
| `POST /api/v1/compliance/check` | OFAC sanctions and blacklist checks |
| `POST /api/v1/smart-money/track` | Whale and institutional tracking |
| `POST /api/v1/entity/investigate` | Entity forensics |
| `GET /api/v1/market/scan` | Market overview |

### Prompt Security ($0.10 USDC)

| Endpoint | Description |
|----------|-------------|
| `POST /api/v1/security/prompt-check` | Detect prompt injection attacks |
| `POST /api/v1/security/prompt-check/batch` | Batch checking (10% off for 10+) |

## Usage Examples

### Token Analysis

```bash
curl -X POST $ARGUS_ENDPOINT/api/v1/token/analyze \
  -H "Content-Type: application/json" \
  -d '{"token": "ETH", "chain": "ethereum"}'
```

### Address Risk

```bash
curl -X POST $ARGUS_ENDPOINT/api/v1/address/risk \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"}'
```

### Prompt Security

```bash
curl -X POST $ARGUS_ENDPOINT/api/v1/security/prompt-check \
  -H "Content-Type: application/json" \
  -d '{"prompt": "User input to validate", "context": "defi"}'
```

**Response:**

```json
{
  "is_safe": true,
  "risk_score": 15,
  "risk_level": "low",
  "recommendation": "ALLOW"
}
```

## Payment (x402)

For paid endpoints, ARGUS returns `402 Payment Required` with payment instructions.

1. Send USDC to treasury on Base network
2. Create payment proof: `base64({"txHash":"0x...","paymentId":"...","from":"0x..."})`
3. Retry with `X-Payment-Proof` header

**Treasury (Base):** `0x8518E91eBcb6bE76f478879720bD9759e01B7954`

## Configuration

```bash
export ARGUS_ENDPOINT="https://argus.getfailsafe.com"
```

## Response Format

All endpoints return JSON with:

- `recommendation`: PROCEED, CAUTION, REVIEW, or REJECT
- `risk_score`: 0-100 (lower is safer)
- `confidence`: 0-100%
- Detailed analysis fields

## Rate Limits

- 30 requests/minute per IP
- Free tier: 3 queries/day per agent ID

## Support

- Website: https://getfailsafe.com
- Telegram: @ARGUSIntelBot
