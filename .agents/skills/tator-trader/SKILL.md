---
name: tator-trader
description: "Execute crypto trades using natural language via Tator's AI trading API. Use when: buying tokens, selling tokens, swapping, bridging cross-chain, sending tokens, wrapping/unwrapping ETH, opening perp positions, betting on prediction markets, launching tokens, registering blockchain names, or managing yield positions. Triggers: 'buy token', 'sell token', 'swap X for Y', 'bridge to', 'send tokens', 'open long', 'open short', 'bet on', 'launch token', 'register name', 'deposit yield', 'wrap ETH'. Supports 24 chains. Returns UNSIGNED transactions — you sign and broadcast. Costs $0.20 USDC per request via x402. Works with any wallet."
---

# Tator AI Trading API

## What You Probably Got Wrong

**Tator returns UNSIGNED transactions.** You tell Tator what you want to do in plain English, Tator figures out the contracts/routes/parameters, and returns a transaction for YOU to sign. You keep full custody — Tator never touches your keys.

**$0.20 per request, not per trade.** One natural language prompt = one payment. If you ask to "buy ETH and then swap half for USDC", that's one request, one payment, potentially multiple transactions returned.

**This is NOT a swap aggregator.** Tator is an AI that understands trading intent. It handles complex operations like "bridge 100 USDC to Arbitrum and swap for ARB" that would normally require multiple manual steps.

---

## Security Model

**Tator is a transaction builder, not a custodian.** Understanding the trust boundaries is critical:

### What Tator CAN do
- Construct unsigned transactions based on your natural language prompt
- Return transaction calldata, target addresses, and values for you to review
- Charge $0.20 USDC via x402 for the computation

### What Tator CANNOT do
- Access your private keys (they never leave your wallet)
- Execute transactions on your behalf (YOU sign and broadcast)
- Move funds without your explicit signature
- Access tokens you haven't approved in a signed transaction

### What YOU must do
- **NEVER paste private keys, seed phrases, or wallet credentials into any prompt.** Tator only needs your PUBLIC wallet address.
- **Inspect every returned transaction before signing.** See the Transaction Verification Checklist below.
- **Use a hardware wallet or trusted wallet extension for signing.** This adds a physical confirmation step that no software can bypass.
- **Start small.** Test with trivial amounts before executing large trades.

### Trust Boundary

```
┌─────────────────────────────────────────────────────┐
│  YOUR SIDE (you control)                            │
│                                                     │
│  • Private keys (never shared)                      │
│  • Transaction review (before signing)              │
│  • Signing decision (your wallet, your choice)      │
│  • Broadcasting (you submit to the network)         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  TATOR'S SIDE (external service)                    │
│                                                     │
│  • Interprets your natural language prompt           │
│  • Constructs unsigned transaction calldata          │
│  • Returns transactions for your review              │
│  • Charges $0.20 via x402 payment protocol           │
│                                                     │
│  Tator NEVER receives your private key.              │
│  Tator CANNOT execute without your signature.        │
└─────────────────────────────────────────────────────┘
```

### Who Operates This

Tator's endpoint (`x402.quickintel.io`) is operated by **Quick Intel LLC**, a registered US based cryptocurrency security company. The same infrastructure serves over 50 million token security scans across 40+ blockchain networks and provides APIs to platforms including DexTools, DexScreener, and Tator Trader. More information: [quickintel.io](https://quickintel.io)

> **Bottom line:** The worst Tator can do is return a bad transaction. The worst YOU can do is sign it without checking. Always verify before you sign.

---

## Overview

| Detail | Value |
|--------|-------|
| **Endpoint** | `POST https://x402.quickintel.io/v1/tator/prompt` |
| **Cost** | $0.20 USDC (200000 atomic units) |
| **Payment Networks** | Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Unichain, Linea, MegaETH, **Solana** |
| **Payment Token** | USDC (native Circle USDC on each chain) |
| **Protocol** | x402 v2 (HTTP 402 Payment Required) |
| **Idempotency** | Supported via `payment-identifier` extension |
| **Async Mode** | Supported — returns job ID for polling |

### Free Endpoints (No x402 Payment)

| Endpoint | Description |
|----------|-------------|
| `GET /v1/tator/health` | Backend health check |
| `GET /v1/tator/jobs/:jobId` | Poll async job status |

## Supported Chains (24)

| Chain | Chain ID | Native Token |
|-------|----------|--------------|
| ethereum | 1 | ETH |
| base | 8453 | ETH |
| arbitrum | 42161 | ETH |
| optimism | 10 | ETH |
| polygon | 137 | MATIC |
| avalanche | 43114 | AVAX |
| bsc | 56 | BNB |
| linea | 59144 | ETH |
| sonic | 146 | S |
| berachain | 80094 | BERA |
| abstract | 2741 | ETH |
| unichain | 130 | ETH |
| ink | 57073 | ETH |
| soneium | 1868 | ETH |
| ronin | 2020 | RON |
| worldchain | 480 | ETH |
| sei | 1329 | SEI |
| hyperevm | 999 | HYPE |
| katana | 747474 | ETH |
| somnia | 5031 | SOMI |
| plasma | 9745 | ETH |
| monad | 143 | MON |
| megaeth | 4326 | ETH |
| solana | — | SOL |

## Capabilities

### Core Trading
| Operation | Example Prompt |
|-----------|----------------|
| **Buy** | "Buy 0.1 ETH worth of PEPE on Base" |
| **Sell** | "Sell all my DEGEN tokens on Base" |
| **Swap** | "Swap 100 USDC for ETH on Arbitrum" |

### Transfers
| Operation | Example Prompt |
|-----------|----------------|
| **Send** | "Send 50 USDC to 0x1234...abcd" |
| **Wrap** | "Wrap 1 ETH on Base" |
| **Unwrap** | "Unwrap all my WETH to ETH" |
| **Burn** | "Burn half of my PEPE on base" |

### Bridging
| Operation | Protocols | Example Prompt |
|-----------|-----------|----------------|
| **Bridge** | Relay, LiFi, GasZip, deBridge | "Bridge 100 USDC from Base to Arbitrum" |

### Perpetuals (Avantis - Base)
| Operation | Example Prompt |
|-----------|----------------|
| **Long** | "Open 5x long on ETH with 100 USDC" |
| **Short** | "Open 3x short on BTC with 50 USDC" |
| **Close** | "Close my ETH long position" |

### Prediction Markets (Myriad)
| Operation | Example Prompt |
|-----------|----------------|
| **Bet** | "Bet $10 on YES for 'Will ETH hit 5k?'" |
| **Check** | "Show my prediction market positions" |

### Token Launching
| Platform | Chain | Example Prompt |
|----------|-------|----------------|
| **Clanker** | Base | "Launch a token called MYTOKEN with symbol MTK on Clanker" |
| **Pump.fun** | Solana | "Launch MEME token on pump.fun" |

### Name Registration
| Service | Chain | Example Prompt |
|---------|-------|----------------|
| **Basenames** | Base | "Register myname.base" |
| **MegaETH** | MegaETH | "Register myname.mega" |
| **Somnia** | Somnia | "Register myname.somi" |

### Yield / DeFi
| Protocol | Chains | Example Prompt |
|----------|--------|----------------|
| **Aave** | Multi-chain | "Deposit 1000 USDC into Aave on Base" |
| **Morpho** | Base, Ethereum | "Deposit ETH into Morpho vault" |
| **Compound** | Multi-chain | "Supply 500 USDC to Compound" |
| **Yearn** | Ethereum | "Deposit into Yearn USDC vault" |
| **Withdraw** | All | "Withdraw my Aave position" |

## Pre-Flight Checks

### 1. USDC Balance on a Supported Payment Chain

You need at least $0.20 USDC on any supported payment chain. Base is recommended for EVM (lowest fees), Solana is also supported.

```javascript
// EVM (Base)
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const balance = await usdcContract.balanceOf(walletAddress);
const hasEnough = balance >= 200000n; // $0.20 with 6 decimals
```

### 2. Sufficient Funds for Trade

Tator will return an error if you try to trade more than you have. Check your balance for the token you're trading BEFORE calling Tator.

## How x402 Payment Works

x402 is an HTTP-native payment protocol. Here's the complete flow:

### EVM Payment Flow (Base, Ethereum, Arbitrum, etc.)

```
┌─────────────────────────────────────────────────────────────┐
│  1. REQUEST    POST to endpoint with trade prompt           │
│                                                             │
│  2. 402        Server returns "Payment Required"            │
│                PAYMENT-REQUIRED header contains payment info │
│                                                             │
│  3. SIGN       Your wallet signs EIP-3009 authorization     │
│                (transferWithAuthorization for USDC)          │
│                                                             │
│  4. RETRY      Resend request with PAYMENT-SIGNATURE header │
│                Contains base64-encoded signed payment proof  │
│                                                             │
│  5. SETTLE     Server verifies signature, settles on-chain  │
│                                                             │
│  6. RESPONSE   Server returns trade result (200 OK)         │
│                PAYMENT-RESPONSE header contains tx receipt   │
└─────────────────────────────────────────────────────────────┘
```

### Solana (SVM) Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. REQUEST    POST to endpoint with trade prompt           │
│                                                             │
│  2. 402        Server returns "Payment Required"            │
│                Solana entry includes extra.feePayer address  │
│                                                             │
│  3. BUILD      Build SPL TransferChecked transaction:       │
│                - Set feePayer to gateway's facilitator       │
│                - Transfer USDC to gateway's payTo address    │
│                - Partially sign with your wallet             │
│                                                             │
│  4. RETRY      Resend request with PAYMENT-SIGNATURE header │
│                payload: { transaction: "<base64>" }          │
│                                                             │
│  5. SETTLE     Gateway co-signs as feePayer, submits to     │
│                Solana, confirms transaction                  │
│                                                             │
│  6. RESPONSE   Server returns trade result (200 OK)         │
│                PAYMENT-RESPONSE header contains tx signature │
└─────────────────────────────────────────────────────────────┘
```

### x402 v2 Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `PAYMENT-REQUIRED` | Response (402) | Base64 JSON with payment requirements and accepted networks |
| `PAYMENT-SIGNATURE` | Request (retry) | Base64 JSON with signed EIP-3009 authorization (EVM) or partially-signed transaction (SVM) |
| `PAYMENT-RESPONSE` | Response (200) | Base64 JSON with settlement tx hash/signature and block number |

**Note:** The legacy `X-PAYMENT` header is also accepted for v1 backward compatibility, but `PAYMENT-SIGNATURE` is preferred.

---

## ⚠️ PAYMENT-SIGNATURE Payload Structure (CRITICAL)

This is the exact structure your `PAYMENT-SIGNATURE` header must contain after base64 decoding. Getting this wrong is the #1 cause of payment failures.

### EVM Payment Payload (Decoded)

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "eip155:8453",
  "payload": {
    "signature": "0x804f6127...1b",
    "authorization": {
      "from": "0xYourWalletAddress",
      "to": "0xPayToAddressFrom402Response",
      "value": "200000",
      "validAfter": "0",
      "validBefore": "1771454085",
      "nonce": "0xa1b2c3d4...bytes32hex"
    }
  }
}
```

### SVM (Solana) Payment Payload (Decoded)

```json
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
  "payload": {
    "transaction": "base64-encoded-partially-signed-solana-transaction"
  }
}
```

### Field-by-Field Rules

| Field | Location | Type | Notes |
|-------|----------|------|-------|
| `x402Version` | Top level | Number | **Must be `2`.** Missing this may cause failures. |
| `scheme` | Top level | String | Always `"exact"` |
| `network` | Top level | String | CAIP-2 identifier from the 402 response (e.g., `"eip155:8453"`) |
| `signature` | `payload.signature` | String | **MUST be a direct child of `payload`, NOT inside `authorization`.** `0x`-prefixed hex. |
| `from` | `payload.authorization.from` | String | Your wallet address, `0x`-prefixed |
| `to` | `payload.authorization.to` | String | `payTo` address from the 402 response, `0x`-prefixed |
| `value` | `payload.authorization.value` | String | **Decimal string** (e.g., `"200000"` for $0.20). NOT hex, NOT BigInt. |
| `validAfter` | `payload.authorization.validAfter` | String | **Decimal string** Unix timestamp. Use `"0"` for immediate. |
| `validBefore` | `payload.authorization.validBefore` | String | **Decimal string** Unix timestamp. Set ~1 hour in the future. |
| `nonce` | `payload.authorization.nonce` | String | `0x`-prefixed bytes32 hex. Must be unique per payment. |

### ❌ Common Mistakes That Cause Payment Failures

**1. `signature` nested inside `authorization` (WRONG)**
```json
// ❌ WRONG — causes "Cannot read properties of undefined (reading 'length')"
{
  "payload": {
    "authorization": {
      "from": "0x...",
      "to": "0x...",
      "value": "200000",
      "signature": "0x..."
    }
  }
}
```
```json
// ✅ CORRECT — signature is a SIBLING of authorization
{
  "payload": {
    "signature": "0x...",
    "authorization": {
      "from": "0x...",
      "to": "0x...",
      "value": "200000"
    }
  }
}
```

**2. Missing `x402Version` at top level**
```json
// ❌ WRONG — missing x402Version
{
  "scheme": "exact",
  "network": "eip155:8453",
  "payload": { ... }
}
```
```json
// ✅ CORRECT
{
  "x402Version": 2,
  "scheme": "exact",
  "network": "eip155:8453",
  "payload": { ... }
}
```

**3. Using hex or BigInt for `value`/`validAfter`/`validBefore`**
```json
// ❌ WRONG — hex strings
{ "value": "0x30D40", "validAfter": "0x0", "validBefore": "0x69A1F3C5" }

// ❌ WRONG — raw numbers (may lose precision)
{ "value": 200000, "validAfter": 0, "validBefore": 1771454085 }

// ✅ CORRECT — decimal strings
{ "value": "200000", "validAfter": "0", "validBefore": "1771454085" }
```

**4. Wrong endpoint path**
```
❌ /v1/tator/api/v1/prompt  (internal backend route — don't use)
✅ /v1/tator/prompt          (correct public endpoint)
```

---

## Payment-Identifier (Idempotency)

The gateway supports the `payment-identifier` extension. At $0.20 per request, this is especially important for Tator — if your agent retries on a network timeout, you don't want to pay twice:

```javascript
const paymentPayload = {
  x402Version: 2,
  scheme: 'exact',
  network: 'eip155:8453',
  payload: { /* ... */ },
  extensions: {
    'payment-identifier': {
      paymentId: 'pay_' + crypto.randomUUID().replace(/-/g, '')
    }
  }
};
```

If the gateway has already processed a request with the same payment ID, it returns the cached response without charging again. Payment IDs must be 16-128 characters, alphanumeric with hyphens and underscores.

### Discovery Endpoint

Query the gateway's accepted payments and schemas before making calls:

```
GET https://x402.quickintel.io/accepted
```

Returns all routes, supported payment networks, pricing, and input/output schemas for agent integration.

---

## API Request

```http
POST https://x402.quickintel.io/v1/tator/prompt
Content-Type: application/json

{
  "prompt": "Buy 0.1 ETH worth of PEPE on Base",
  "walletAddress": "0xYourWalletAddress",
  "provider": "your-agent-name"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | string | Yes | Natural language trading instruction |
| `walletAddress` | string | Yes | Your wallet address (receives tokens, signs TX) |
| `provider` | string | Yes | Identifier for your agent/app (e.g., "lobster", "openclaw", "my-agent") |
| `async` | boolean | No | Use async mode — returns a job ID to poll. Default: `false` |
| `chain` | string | No | Preferred blockchain for the operation (e.g., "base", "ethereum") |
| `slippage` | number | No | Slippage tolerance percentage for swaps. Default: `1` |

### Writing Good Prompts

**CRITICAL: Better prompts = better results. You pay $0.20 regardless of outcome.**

#### ✅ Good Prompts

```
"Buy 0.1 ETH worth of PEPE on Base"
→ Clear: amount, token, chain

"Swap 100 USDC for ETH on Arbitrum"
→ Clear: input amount, input token, output token, chain

"Bridge 50 USDC from Base to Arbitrum"
→ Clear: amount, token, source chain, destination chain

"Open 5x long on ETH with 100 USDC collateral on Avantis"
→ Clear: leverage, direction, asset, collateral, protocol

"Buy 0x1234...abcd on Base"
→ Uses contract address for obscure tokens
```

#### ❌ Bad Prompts

```
"Buy some crypto"
→ Too vague: which token? which chain? how much?

"Get me PEPE"
→ Missing: chain, amount

"Swap tokens"
→ Missing: which tokens, amounts, chain

"Trade on the best chain"
→ Ambiguous: Tator can't guess preferences
```

#### Tips for Best Results

1. **Always include the chain** — "on Base", "on Arbitrum"
2. **Specify amounts** — "0.1 ETH", "100 USDC", "all my DEGEN"
3. **Use contract addresses for obscure tokens** — Many tokens share names
4. **Be explicit about direction** — "buy X with Y" or "sell X for Y"
5. **For bridging** — Include source AND destination chain

## API Response Types

### Type 1: Transaction (Most Common)

```json
{
  "type": "transaction",
  "transactions": [
    {
      "to": "0xContractAddress",
      "data": "0xCalldata...",
      "value": "100000000000000000",
      "chainId": 8453,
      "description": "Buy PEPE with 0.1 ETH on Base"
    }
  ],
  "message": "Transaction ready. Sign and broadcast to complete."
}
```

**You must:**
1. **Verify** each transaction (see Transaction Verification Checklist below)
2. Sign each transaction with your wallet
3. Broadcast to the network
4. Wait for confirmation

### Type 2: Info Response

```json
{
  "type": "info",
  "message": "PEPE is currently trading at $0.00001234 on Base. 24h volume: $5.2M.",
  "data": {
    "price": "0.00001234",
    "volume24h": "5200000"
  }
}
```

Returned when you ask for information, not a trade.

### Type 3: Error Response

```json
{
  "type": "error",
  "message": "Insufficient balance. You have 0.05 ETH but need 0.1 ETH.",
  "code": "INSUFFICIENT_BALANCE"
}
```

| Error Code | Meaning |
|------------|---------|
| `INSUFFICIENT_BALANCE` | Not enough tokens for trade |
| `UNSUPPORTED_CHAIN` | Chain not supported |
| `TOKEN_NOT_FOUND` | Can't find token (try contract address) |
| `INVALID_PROMPT` | Couldn't understand request |
| `SLIPPAGE_TOO_HIGH` | Trade would have excessive slippage |

### Type 4: Multi-Transaction Response

```json
{
  "type": "transaction",
  "transactions": [
    {
      "to": "0xApprovalContract",
      "data": "0x095ea7b3...",
      "value": "0",
      "chainId": 8453,
      "description": "Approve USDC spending"
    },
    {
      "to": "0xSwapContract",
      "data": "0x38ed1739...",
      "value": "0",
      "chainId": 8453,
      "description": "Swap USDC for ETH"
    }
  ],
  "message": "2 transactions required. Execute in order."
}
```

**Verify, then sign and broadcast transactions IN ORDER.** Wait for each to confirm before sending the next.

## Async Mode

For long-running operations or when you don't want to block:

```http
POST https://x402.quickintel.io/v1/tator/prompt
Content-Type: application/json
PAYMENT-SIGNATURE: <base64-encoded-payment>

{
  "prompt": "Buy 0.1 ETH worth of PEPE on Base",
  "walletAddress": "0xYourWallet",
  "provider": "my-agent",
  "async": true
}
```

### Async Response

```json
{
  "type": "pending",
  "jobId": "job_abc123",
  "message": "Request queued. Poll the jobs endpoint for result."
}
```

### Poll for Result (FREE — no x402 payment required)

```http
GET https://x402.quickintel.io/v1/tator/jobs/job_abc123
```

Returns the same response format as sync mode once complete. This endpoint is free — you already paid when you submitted the prompt.

---

## ⚠️ Transaction Verification Checklist

**Every transaction Tator returns should be inspected before signing.** This is your last line of defense — a transaction can only move your funds if you sign it.

### Quick Checks (Do Every Time)

**1. Verify the `to` address**
- For swaps: Should be a known DEX router (Uniswap, SushiSwap, 1inch, etc.)
- For bridges: Should be a known bridge contract (Relay, LiFi, deBridge, etc.)
- For sends: Should be the recipient address YOU specified in your prompt
- For token launches: Should be the Clanker or Pump.fun deployment contract
- **Red flag:** Unknown `to` address that doesn't match the expected protocol

**2. Verify the `value` field**
- This is the amount of native token (ETH/SOL/etc.) being sent WITH the transaction
- For token swaps using ERC-20s, this should usually be `"0"` (tokens move via calldata, not `value`)
- For buying with native ETH, this should match the amount you requested
- **Red flag:** Unexpectedly large `value` that doesn't match your prompt

**3. Check for approval transactions**
- Approvals (function selector `0x095ea7b3`) grant a contract permission to spend your tokens
- The spender address should be a known DEX router or protocol contract
- The amount should be reasonable — unlimited approvals (`type(uint256).max`) are common but carry more risk than exact amounts
- **Red flag:** Approval to an unknown address, or approval for a token you didn't mention

**4. Verify the `chainId`**
- Should match the chain you requested in your prompt
- **Red flag:** Transaction targeting a different chain than expected

**5. Check the `description` field**
- Tator includes a human-readable description of each transaction
- It should align with what you asked for
- **Red flag:** Description doesn't match your original prompt

### Deep Checks (For Large Trades or High-Value Operations)

**6. Decode the calldata**
- Use [openchain.xyz/signatures](https://openchain.xyz/signatures) or [4byte.directory](https://www.4byte.directory/) to decode the function selector (first 4 bytes of `data`)
- Common expected selectors:
  - `0x095ea7b3` — `approve(address,uint256)`
  - `0x38ed1739` — `swapExactTokensForTokens` (Uniswap V2)
  - `0x5ae401dc` — `multicall` (Uniswap V3)
  - `0x3593564c` — `execute` (Uniswap Universal Router)
- **Red flag:** Unrecognized function selector on a high-value transaction

**7. Verify contract addresses on a block explorer**
- Look up the `to` address on [BaseScan](https://basescan.org), [Etherscan](https://etherscan.io), [Arbiscan](https://arbiscan.io), etc.
- Check: Is it verified? Is it a known protocol? Does it have significant transaction history?
- **Red flag:** Unverified contract, no transaction history, or recently deployed with no audit

**8. Simulate the transaction**
- Use [Tenderly](https://tenderly.co), [Blocknative](https://blocknative.com), or your wallet's built-in simulation to preview effects before signing
- Shows exactly which tokens move where and what approvals are set
- **Red flag:** Simulation shows unexpected token transfers or approvals

### Automated Verification (For Agents)

If you're building an agent that signs programmatically, implement verification checks before signing:

```javascript
function verifyTatorTransaction(tx, originalPrompt, expectedChainId) {
  const warnings = [];

  // Check 1: Chain matches what was requested
  if (tx.chainId !== expectedChainId) {
    warnings.push(`CHAIN MISMATCH: Expected ${expectedChainId}, got ${tx.chainId}`);
  }

  // Check 2: Value is reasonable (set your own threshold)
  const MAX_VALUE_WEI = BigInt('1000000000000000000'); // 1 ETH
  if (BigInt(tx.value || '0') > MAX_VALUE_WEI) {
    warnings.push(`HIGH VALUE: ${tx.value} wei exceeds safety threshold`);
  }

  // Check 3: Known contract allowlist
  const KNOWN_ROUTERS = new Set([
    '0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad', // Uniswap Universal Router (Base)
    '0x2626664c2603336e57b271c5c0b26f421741e481', // Uniswap V3 Router (Base)
    '0x6131b5fae19ea4f9d964eac0408e4408b66337b5', // Kyberswap (Base)
    // Add other known contracts for your use case
  ]);

  const toAddress = tx.to.toLowerCase();
  if (!KNOWN_ROUTERS.has(toAddress)) {
    warnings.push(`UNKNOWN CONTRACT: ${tx.to} — verify on block explorer before signing`);
  }

  // Check 4: If it's an approval, verify the spender
  if (tx.data?.startsWith('0x095ea7b3')) {
    const spender = '0x' + tx.data.slice(34, 74);
    if (!KNOWN_ROUTERS.has(spender.toLowerCase())) {
      warnings.push(`APPROVAL TO UNKNOWN SPENDER: ${spender} — verify before signing`);
    }
  }

  // Check 5: Description sanity check
  if (tx.description && !tx.description.toLowerCase().includes(
    originalPrompt.split(' ')[0].toLowerCase() // Very basic — improve for production
  )) {
    warnings.push(`DESCRIPTION MISMATCH: "${tx.description}" may not match your intent`);
  }

  return {
    safe: warnings.length === 0,
    warnings
  };
}

// Usage
const result = await tatorResponse.json();
if (result.type === 'transaction') {
  for (const tx of result.transactions) {
    const check = verifyTatorTransaction(tx, originalPrompt, 8453);
    if (!check.safe) {
      console.warn('⚠️ Transaction verification warnings:', check.warnings);
      // Decide: skip, require human approval, or proceed with caution
    }
  }
}
```

> **For automated agents:** Never enable fully automatic signing without implementing verification checks. A human-in-the-loop confirmation for high-value transactions is strongly recommended.

---

## Wallet Integration Patterns

### Pattern 1: Using `@x402/fetch` (Simplest — Recommended)

The `@x402/fetch` library handles the entire 402 → sign → retry flow automatically:

```javascript
import { x402Fetch } from '@x402/fetch';
import { createWallet } from '@x402/evm';
import { ethers } from 'ethers';

const wallet = createWallet(process.env.PRIVATE_KEY);
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// 1. Call Tator API (x402 payment handled automatically)
const response = await x402Fetch('https://x402.quickintel.io/v1/tator/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Buy 0.1 ETH worth of PEPE on Base',
    walletAddress: wallet.address,
    provider: 'my-agent'
  }),
  wallet,
  preferredNetwork: 'eip155:8453'
});

const result = await response.json();

// 2. Verify and handle response
if (result.type === 'transaction') {
  for (const tx of result.transactions) {
    // ALWAYS verify before signing — see Transaction Verification Checklist
    console.log(`Reviewing TX: ${tx.description}`);
    console.log(`  To: ${tx.to} | Value: ${tx.value} | Chain: ${tx.chainId}`);

    const signedTx = await signer.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value,
      chainId: tx.chainId
    });
    const receipt = await signedTx.wait();
    console.log(`TX confirmed: ${receipt.hash}`);
  }
} else if (result.type === 'info') {
  console.log(result.message);
} else if (result.type === 'error') {
  console.error(`Error: ${result.message}`);
}
```

### Pattern 2: Manual EVM Signing with viem (Full Control)

Complete working example for agents that need manual control over the x402 payment AND trade execution:

```javascript
import { keccak256, toHex, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const TATOR_URL = 'https://x402.quickintel.io/v1/tator/prompt';
const PREFERRED_NETWORK = 'eip155:8453'; // Base

const account = privateKeyToAccount(process.env.PRIVATE_KEY);

// ── Step 1: Hit the endpoint, get 402 with payment requirements ──

const tradeBody = JSON.stringify({
  prompt: 'Buy 0.1 ETH worth of PEPE on Base',
  walletAddress: account.address,
  provider: 'my-agent',
});

const initialRes = await fetch(TATOR_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: tradeBody,
});

if (initialRes.status !== 402) {
  throw new Error(`Expected 402, got ${initialRes.status}`);
}

const paymentRequired = await initialRes.json();

// ── Step 2: Find your preferred network in the accepts array ──

const networkInfo = paymentRequired.accepts.find(
  (a) => a.network === PREFERRED_NETWORK
);
if (!networkInfo) {
  throw new Error(`Network ${PREFERRED_NETWORK} not available`);
}

// ── Step 3: Sign EIP-712 TransferWithAuthorization ──

const nonce = keccak256(toHex(`${Date.now()}-${Math.random()}`));
const validAfter = 0n;
const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

const domain = {
  name: networkInfo.extra.name,       // "USD Coin"
  version: networkInfo.extra.version,  // "2"
  chainId: 8453,
  verifyingContract: networkInfo.asset,
};

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

const message = {
  from: account.address,
  to: networkInfo.payTo,
  value: BigInt(networkInfo.amount),
  validAfter,
  validBefore,
  nonce,
};

const signature = await account.signTypedData({
  domain,
  types,
  primaryType: 'TransferWithAuthorization',
  message,
});

// ── Step 4: Build the PAYMENT-SIGNATURE payload ──
// CRITICAL: signature is a SIBLING of authorization, not nested inside it.
// CRITICAL: value/validAfter/validBefore must be DECIMAL STRINGS in the payload.

const paymentPayload = {
  x402Version: 2,
  scheme: 'exact',
  network: PREFERRED_NETWORK,
  payload: {
    signature,                         // ← Direct child of payload
    authorization: {                   // ← No signature in here
      from: account.address,
      to: networkInfo.payTo,
      value: networkInfo.amount,                  // Decimal string: "200000"
      validAfter: validAfter.toString(),          // Decimal string: "0"
      validBefore: validBefore.toString(),        // Decimal string
      nonce,                                      // 0x-prefixed bytes32
    },
  },
};

const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

// ── Step 5: Retry the request with the payment header ──

const paidRes = await fetch(TATOR_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': paymentHeader,
  },
  body: tradeBody,
});

// ── Step 6: Handle the trade response ──

const paymentResponse = paidRes.headers.get('payment-response');
if (paymentResponse) {
  const receipt = JSON.parse(Buffer.from(paymentResponse, 'base64').toString());
  console.log('x402 payment settled:', receipt.txHash);
}

const result = await paidRes.json();

// ── Step 7: Verify and sign the trade transactions ──

if (result.type === 'transaction') {
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http('https://mainnet.base.org'),
  });

  for (const tx of result.transactions) {
    // ALWAYS verify before signing — see Transaction Verification Checklist
    console.log(`Reviewing TX: ${tx.description}`);
    console.log(`  To: ${tx.to} | Value: ${tx.value} | Chain: ${tx.chainId}`);

    const txHash = await walletClient.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || '0'),
      chain: base,
    });
    console.log(`Trade TX sent: ${txHash} — ${tx.description}`);
  }
} else if (result.type === 'error') {
  console.error(`Tator error: ${result.message}`);
}
```

### Pattern 3: Manual EVM Signing with ethers.js (Full Control)

Complete working example using ethers.js v6:

```javascript
import { ethers } from 'ethers';

const TATOR_URL = 'https://x402.quickintel.io/v1/tator/prompt';
const PREFERRED_NETWORK = 'eip155:8453'; // Base

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ── Step 1: Hit the endpoint, get 402 with payment requirements ──

const tradeBody = JSON.stringify({
  prompt: 'Buy 0.1 ETH worth of PEPE on Base',
  walletAddress: wallet.address,
  provider: 'my-agent',
});

const initialRes = await fetch(TATOR_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: tradeBody,
});

if (initialRes.status !== 402) {
  throw new Error(`Expected 402, got ${initialRes.status}`);
}

const paymentRequired = await initialRes.json();

// ── Step 2: Find your preferred network in the accepts array ──

const networkInfo = paymentRequired.accepts.find(
  (a) => a.network === PREFERRED_NETWORK
);
if (!networkInfo) {
  throw new Error(`Network ${PREFERRED_NETWORK} not available`);
}

// ── Step 3: Sign EIP-712 TransferWithAuthorization ──

const nonce = ethers.keccak256(
  ethers.toUtf8Bytes(`${Date.now()}-${Math.random()}`)
);
const validAfter = 0n;
const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);

const domain = {
  name: networkInfo.extra.name,        // "USD Coin"
  version: networkInfo.extra.version,   // "2"
  chainId: 8453,
  verifyingContract: networkInfo.asset,
};

const types = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

const message = {
  from: wallet.address,
  to: networkInfo.payTo,
  value: BigInt(networkInfo.amount),
  validAfter,
  validBefore,
  nonce,
};

const signature = await wallet.signTypedData(domain, types, message);

// ── Step 4: Build the PAYMENT-SIGNATURE payload ──
// CRITICAL: signature is a SIBLING of authorization, not nested inside it.
// CRITICAL: value/validAfter/validBefore must be DECIMAL STRINGS in the payload.

const paymentPayload = {
  x402Version: 2,
  scheme: 'exact',
  network: PREFERRED_NETWORK,
  payload: {
    signature,                         // ← Direct child of payload
    authorization: {                   // ← No signature in here
      from: wallet.address,
      to: networkInfo.payTo,
      value: networkInfo.amount,                  // Decimal string: "200000"
      validAfter: validAfter.toString(),          // Decimal string: "0"
      validBefore: validBefore.toString(),        // Decimal string
      nonce,                                      // 0x-prefixed bytes32
    },
  },
};

const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

// ── Step 5: Retry the request with the payment header ──

const paidRes = await fetch(TATOR_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': paymentHeader,
  },
  body: tradeBody,
});

// ── Step 6: Handle the trade response ──

const paymentResponse = paidRes.headers.get('payment-response');
if (paymentResponse) {
  const receipt = JSON.parse(
    Buffer.from(paymentResponse, 'base64').toString()
  );
  console.log('x402 payment settled:', receipt.txHash);
}

const result = await paidRes.json();

// ── Step 7: Verify and sign the trade transactions ──

if (result.type === 'transaction') {
  for (const tx of result.transactions) {
    // ALWAYS verify before signing — see Transaction Verification Checklist
    console.log(`Reviewing TX: ${tx.description}`);
    console.log(`  To: ${tx.to} | Value: ${tx.value} | Chain: ${tx.chainId}`);

    const txResponse = await wallet.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value || '0',
      chainId: tx.chainId,
    });
    const txReceipt = await txResponse.wait();
    console.log(`Trade TX confirmed: ${txReceipt.hash} — ${tx.description}`);
  }
} else if (result.type === 'error') {
  console.error(`Tator error: ${result.message}`);
}
```

### Pattern 4: Solana Wallet (SVM)

```javascript
import { createSvmClient } from '@x402/svm/client';
import { toClientSvmSigner } from '@x402/svm';
import { wrapFetchWithPayment } from '@x402/fetch';
import { createKeyPairSignerFromBytes } from '@solana/kit';
import { base58 } from '@scure/base';

// Create Solana signer
const keypair = await createKeyPairSignerFromBytes(
  base58.decode(process.env.SOLANA_PRIVATE_KEY)
);
const signer = toClientSvmSigner(keypair);
const client = createSvmClient({ signer });
const paidFetch = wrapFetchWithPayment(fetch, client);

// Call Tator API (x402 payment via Solana USDC)
const response = await paidFetch('https://x402.quickintel.io/v1/tator/prompt', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: 'Buy 0.1 ETH worth of PEPE on Base',
    walletAddress: '0xYourEvmWallet',
    provider: 'my-agent'
  })
});

const result = await response.json();
// Verify transactions before signing — see Transaction Verification Checklist
```

### Pattern 5: AgentWallet (frames.ag)

```javascript
// Step 1: Call Tator through AgentWallet's x402 handler
const tatorResponse = await fetch('https://frames.ag/api/wallets/{username}/actions/x402/fetch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${AGENTWALLET_API_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://x402.quickintel.io/v1/tator/prompt',
    method: 'POST',
    body: {
      prompt: 'Swap 100 USDC for ETH on Base',
      walletAddress: agentWalletAddress,
      provider: 'my-agent'
    }
  })
});

const result = await tatorResponse.json();

// Step 2: Verify and broadcast via AgentWallet
if (result.type === 'transaction') {
  for (const tx of result.transactions) {
    // Verify before signing — see Transaction Verification Checklist
    const broadcastResponse = await fetch(
      'https://frames.ag/api/wallets/{username}/actions/send-transaction',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AGENTWALLET_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chainId: tx.chainId,
          to: tx.to,
          data: tx.data,
          value: tx.value
        })
      }
    );
    const txResult = await broadcastResponse.json();
    console.log(`TX sent: ${txResult.hash}`);
  }
}
```

### Pattern 6: Vincent Wallet (heyvincent.ai)

```javascript
// Step 1: Call Tator (pay via Vincent)
const paymentAuth = await vincent.createX402Payment({
  network: 'eip155:8453',
  amount: '200000',
  token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
});

const tatorResponse = await fetch('https://x402.quickintel.io/v1/tator/prompt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'PAYMENT-SIGNATURE': paymentAuth.encoded
  },
  body: JSON.stringify({
    prompt: 'Bridge 50 USDC from Base to Arbitrum',
    walletAddress: vincentWalletAddress,
    provider: 'my-agent'
  })
});

const result = await tatorResponse.json();

// Step 2: Verify and broadcast via Vincent
if (result.type === 'transaction') {
  for (const tx of result.transactions) {
    // Verify before signing — see Transaction Verification Checklist
    const receipt = await vincent.sendTransaction({
      chainId: tx.chainId,
      to: tx.to,
      data: tx.data,
      value: tx.value
    });
    console.log(`TX confirmed: ${receipt.transactionHash}`);
  }
}
```

### Pattern 7: Sponge Wallet (x402_fetch — One-Liner)

Sponge Wallet handles the entire x402 payment flow automatically via its `x402_fetch` endpoint — no manual signing, no 402 parsing, no header construction:

```bash
curl -sS -X POST "https://api.wallet.paysponge.com/api/x402/fetch" \
  -H "Authorization: Bearer $SPONGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://x402.quickintel.io/v1/tator/prompt",
    "method": "POST",
    "body": {
      "prompt": "Buy 0.1 ETH worth of PEPE on Base",
      "walletAddress": "0xYourSpongeWalletAddress",
      "provider": "sponge-agent"
    },
    "preferred_chain": "base"
  }'
```

Sponge detects the 402, signs the payment with the agent's managed wallet, retries, and returns the Tator response along with `payment_made` and `payment_details` metadata. **Note:** You still need to verify and sign the returned transactions through Sponge's transfer/swap endpoints or your own wallet. See the **sponge-wallet** skill for setup and registration.

### Other Compatible Wallets

Any wallet that supports x402 or EIP-3009 signing works with Tator, including [Lobster.cash](https://lobster.cash) (Crossmint-powered agent wallets with Amazon checkout and Visa cards) and any wallet built on Crossmint's infrastructure. See their respective skills or docs for setup and onboarding.

---

## Complete Example: Scan Then Buy

```javascript
import { x402Fetch } from '@x402/fetch';
import { createWallet } from '@x402/evm';
import { ethers } from 'ethers';

async function buyTokenSafely(tokenAddress, amountEth, chain) {
  const wallet = createWallet(process.env.PRIVATE_KEY);
  const provider = new ethers.JsonRpcProvider(getRpcUrl(chain));
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Step 1: Scan token first ($0.03) — uses quickintel-scan skill
  const scanResponse = await x402Fetch('https://x402.quickintel.io/v1/scan/full', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chain, tokenAddress }),
    wallet,
    preferredNetwork: 'eip155:8453'
  });

  const scan = await scanResponse.json();

  // Check if safe
  if (scan.tokenDynamicDetails.is_Honeypot) {
    throw new Error('HONEYPOT DETECTED - Do not buy');
  }
  if (scan.quickiAudit.has_Scams) {
    throw new Error('SCAM DETECTED - Do not buy');
  }

  // ⚠️ Liquidity check — scanner may miss non-standard pairs
  if (!scan.tokenDynamicDetails.liquidity) {
    console.warn(
      '⚠️ Liquidity not detected by scanner — token may use a non-standard pair. ' +
      'Verify via DEX aggregator before trading. Proceeding with caution.'
    );
  }

  console.log(`Token ${scan.tokenDetails.tokenSymbol} passed safety check`);

  // Step 2: Buy token ($0.20)
  const buyResponse = await x402Fetch('https://x402.quickintel.io/v1/tator/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: `Buy ${amountEth} ETH worth of ${tokenAddress} on ${chain}`,
      walletAddress: wallet.address,
      provider: 'my-agent'
    }),
    wallet,
    preferredNetwork: 'eip155:8453'
  });

  const result = await buyResponse.json();

  if (result.type === 'error') {
    throw new Error(result.message);
  }

  // Step 3: Verify and sign
  if (result.type === 'transaction') {
    for (const tx of result.transactions) {
      // Verify before signing — see Transaction Verification Checklist
      console.log(`Reviewing TX: ${tx.description} | To: ${tx.to} | Value: ${tx.value}`);

      const signedTx = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId
      });
      const receipt = await signedTx.wait();
      console.log(`✅ ${tx.description}: ${receipt.hash}`);
    }
  }

  return { scan, result };
}

// Usage
await buyTokenSafely(
  '0xa4a2e2ca3fbfe21aed83471d28b6f65a233c6e00', // TIBBIR
  '0.1',
  'base'
);
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `402 Payment Required` | No payment header | Sign and include PAYMENT-SIGNATURE header |
| `402 Payment verification failed` | Invalid signature or insufficient USDC | Check payload structure (see Common Mistakes above), verify USDC balance |
| `402 Signature verification failed: Cannot read properties of undefined` | `signature` nested inside `authorization` instead of as a sibling | Move `signature` to be a direct child of `payload` |
| `402 Nonce already used` | Replay detected or retry without payment-identifier | Use payment-identifier for safe retries |
| `INSUFFICIENT_BALANCE` | Can't afford trade | Check token balance first |
| `UNSUPPORTED_CHAIN` | Chain not in list | Use supported chain |
| `TOKEN_NOT_FOUND` | Unknown token | Use contract address |
| `INVALID_PROMPT` | Unclear request | Be more specific |
| `SLIPPAGE_TOO_HIGH` | Low liquidity | Reduce trade size |
| `TX_FAILED` | Transaction reverted | Check gas, approvals |

## Important Notes

- **NEVER share private keys or seed phrases.** Tator only needs your public wallet address (`walletAddress` field). If anything asks for your private key, stop immediately.
- **Always inspect returned transactions before signing.** See the Transaction Verification Checklist above. This is your primary security control.
- **Use a hardware wallet for high-value trades.** Hardware wallets provide physical confirmation that cannot be bypassed by software.
- **Start with small test amounts.** Verify the full flow works correctly with a trivial amount before scaling up.
- **Payment charged regardless of outcome.** If Tator can't understand your prompt or the trade fails, you still pay $0.20. Use `payment-identifier` to safely retry without being charged again.
- **You sign, you broadcast.** Tator never has custody. The transaction won't execute until YOU sign and broadcast.
- **Multi-TX requires sequential execution.** Approvals must confirm before swaps.
- **Bridge times vary.** Some bridges take minutes.
- **Perps have liquidation risk.** Leverage trading can lose your collateral.
- **Use contract addresses for new/obscure tokens.** Token names are not unique.
- **Multi-chain payment:** You can pay on any supported chain — 9 EVM chains (Base, Ethereum, Arbitrum, Optimism, Polygon, Avalanche, Unichain, Linea, MegaETH) plus Solana. The 402 response lists all accepted networks.
- **Solana payment:** Pay with USDC on Solana using the SVM payment flow. The 402 response includes the `extra.feePayer` address needed to build the transaction.
- **Job polling is free.** Once you've paid for the prompt in async mode, polling `/v1/tator/jobs/:jobId` costs nothing.
- **Always scan before buying unknown tokens.** Use the **quickintel-scan** skill ($0.03) to check for honeypots, scams, and rug pull risks before executing trades. The liquidity field may not detect non-standard pairs — verify independently via DEX aggregators.
- **Tator's endpoint (`x402.quickintel.io`) is operated by Quick Intel LLC**, a registered US based company providing crypto security APIs to platforms including DexTools, DexScreener, & Gecko Terminal. The same infrastructure serves over 100 million token scans. For more information: [quickintel.io](https://quickintel.io)

## Cross-Reference

For security scanning before trading, see the **quickintel-scan** skill which costs $0.03 per scan. Always scan unknown tokens before buying.

For token launch strategy, evaluation, and tax guidance, see the **token-launcher** skill.

## Resources

- **Tator Docs:** https://docs.quickintel.io/tator
- **x402 Protocol:** https://www.x402.org
- **x402 EVM Spec:** https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_evm.md
- **Gateway Discovery:** https://x402.quickintel.io/accepted
- **Quick Intel:** https://quickintel.io
- **Support:** https://t.me/tatortrader