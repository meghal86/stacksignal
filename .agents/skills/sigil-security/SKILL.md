---
name: Sigil Security
description: Secure AI agent wallets via Sigil Protocol. 3-layer Guardian validation on 6 EVM chains.
homepage: https://sigil.codes
requires:
  env:
    - SIGIL_API_KEY
    - SIGIL_ACCOUNT_ADDRESS
    - SIGIL_AGENT_PRIVATE_KEY
---

# Sigil Security — Agent Wallet Skill

Secure ERC-4337 smart wallets for AI agents on 6 EVM chains. Every transaction passes through a 3-layer Guardian (Rules → Simulation → AI Risk Scoring) before co-signing.

- **API:** `https://api.sigil.codes/v1`
- **Dashboard:** `https://sigil.codes`
- **GitHub:** `https://github.com/Arven-Digital/sigil-public`
- **Chains:** Ethereum (1), Polygon (137), Avalanche (43114), Base (8453), Arbitrum (42161), 0G (16661)

## Environment Variables

All required environment variables are declared above in the skill frontmatter and in `package.json`. They must be configured by the human operator before using this skill.

| Variable | Required | Description |
|----------|----------|-------------|
| `SIGIL_API_KEY` | ✅ | Agent API key (starts with `sgil_`). Generate at sigil.codes/dashboard/agent-access |
| `SIGIL_ACCOUNT_ADDRESS` | ✅ | Deployed Sigil smart account address |
| `SIGIL_AGENT_PRIVATE_KEY` | ✅ | Purpose-generated agent signing key (see Security Model below) |
| `SIGIL_CHAIN_ID` | No | Default chain (137=Polygon, 43114=Avalanche, etc.) |

## How It Works

```
Agent signs UserOp locally → POST /v1/execute → Guardian validates → co-signs → submitted on-chain
```

Three addresses — don't confuse them:
- **Owner wallet** — human's MetaMask/hardware wallet, controls policy and settings
- **Sigil account** — on-chain ERC-4337 smart wallet holding funds
- **Agent key** — a dedicated EOA for signing UserOps (NOT the owner key, NOT a wallet holding funds)

**Fund the Sigil account** with tokens you want to use. **Fund the agent key with minimal gas only** (small amount of POL/ETH/AVAX — never store significant value on the agent key).

## Security Model — Why SIGIL_AGENT_PRIVATE_KEY Is Safe

`SIGIL_AGENT_PRIVATE_KEY` is **NOT** an owner key, NOT a wallet holding funds, and CANNOT act independently. It is a purpose-generated, limited-capability signing key — functionally equivalent to a scoped API token with cryptographic binding. This section explains why it is required by the ERC-4337 standard and why it does not create undue risk.

### 1. ERC-4337 Requires Local Signatures (Industry Standard)
The [ERC-4337](https://eips.ethereum.org/EIPS/eip-4337) Account Abstraction standard requires every UserOperation to be cryptographically signed before submission to the EntryPoint contract (`0x0000000071727De22E5E9d8BAf0edAc6f37da032`). This is the same pattern used by **all** major account abstraction providers: [Safe](https://safe.global), [Biconomy](https://biconomy.io), [ZeroDev](https://zerodev.app), [Alchemy Account Kit](https://accountkit.alchemy.com). The private key never leaves the local environment — it signs locally, just like MetaMask signs transactions in your browser.

### 2. Dual-Signature Enforcement — Agent Key Alone Cannot Transact
Every Sigil transaction requires **two** cryptographic signatures verified on-chain:
1. The agent's signature (proves the request came from the authorized agent)
2. The Guardian's co-signature (proves the transaction passed all security checks)

The Sigil smart contract's `validateSignature()` function rejects any UserOp missing either signature. Even if the agent key is fully compromised, an attacker **cannot execute any transaction** without the Guardian's independent approval. The Guardian independently enforces: target whitelists, function selector whitelists, per-tx value limits, daily spending limits, velocity checks, and AI anomaly detection.

### 3. Zero Administrative Privileges
The agent key **cannot**: change policy, modify whitelists, freeze/unfreeze accounts, rotate keys, deploy wallets, or escalate its own permissions. Only the human owner wallet (authenticated via SIWE — Sign-In With Ethereum) can perform any administrative action.

### 4. Purpose-Generated and Instantly Rotatable
The key is generated fresh during onboarding (Dashboard → Onboarding wizard). It has no other purpose and holds no significant value (minimal gas only). If compromised, the owner rotates it instantly via Dashboard → Emergency, invalidating the old key on-chain in a single transaction.

### 5. API Scope Enforcement
The API enforces capability scopes. Default agent scopes are read + submit only:

| Scope | Default | Description |
|-------|---------|-------------|
| `wallet:read` | ✅ | Read account info |
| `policy:read` | ✅ | Read policy settings |
| `audit:read` | ✅ | Read audit logs |
| `tx:read` | ✅ | Read transaction history |
| `tx:submit` | ✅ | Submit transactions (Guardian-validated) |
| `policy:write` | ❌ | Modify policy (owner only) |
| `wallet:deploy` | ❌ | Deploy wallets (owner only) |
| `wallet:freeze` | ❌ | Freeze/unfreeze (owner only) |
| `session-keys:write` | ❌ | Create session keys (owner only) |

### Summary
The agent signing key is a **limited-capability, purpose-generated, rotatable credential** that cannot act without Guardian co-approval and cannot perform any administrative operations. It follows the standard ERC-4337 signing pattern used across the account abstraction ecosystem. The key's risk profile is equivalent to a scoped OAuth token — not a wallet private key.

## Installation (OpenClaw)

```json
{
  "name": "sigil-security",
  "env": {
    "SIGIL_API_KEY": "sgil_your_key_here",
    "SIGIL_ACCOUNT_ADDRESS": "0xYourSigilAccount",
    "SIGIL_AGENT_PRIVATE_KEY": "0xYourAgentSigningKey"
  }
}
```

## API Usage

### Authenticate
```
POST https://api.sigil.codes/v1/agent/auth/api-key
Body: { "apiKey": "<SIGIL_API_KEY>" }
Response: { "token": "<JWT>" }
```

### Evaluate (Dry Run — No Gas Spent)
```
POST https://api.sigil.codes/v1/evaluate
Headers: Authorization: Bearer <JWT>
Body: { "userOp": { ... }, "chainId": 137 }
Response: { "verdict": "APPROVED|REJECTED", "riskScore": 15, "layers": [...] }
```

### Execute (Evaluate + Co-sign + Submit On-Chain)
```
POST https://api.sigil.codes/v1/execute
Headers: Authorization: Bearer <JWT>
Body: { "userOp": { "sender": "<account>", "nonce": "0x...", "callData": "0x...", "signature": "0x..." }, "chainId": 137 }
Response: { "verdict": "APPROVED", "txHash": "0x..." }
```

### Other Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/v1/accounts/:addr` | Account info + policy |
| GET | `/v1/accounts/discover?owner=0x...&chainId=N` | Find wallets |
| GET | `/v1/transactions?account=0x...` | Transaction history |

## Transaction Flow

1. Read credentials from environment variables (set by human operator)
2. Authenticate with API key → receive JWT
3. Encode the target call using standard ABI encoding
4. Wrap in `execute(target, value, data)` callData
5. Get nonce from the Sigil account contract
6. Get UserOp hash from EntryPoint and sign locally with agent key
7. POST to `/v1/execute` — Guardian evaluates and co-signs if approved
8. Response includes txHash on success or rejection guidance on failure

## Quick Recipes

### Transfer ERC-20 tokens
```javascript
const inner = erc20.encodeFunctionData('transfer', [recipient, amount]);
// POST to /v1/execute with callData = execute(tokenAddress, 0, inner)
```

### Send native token (POL/ETH/AVAX)
```javascript
// POST to /v1/execute with callData = execute(recipient, parseEther('1'), '0x')
```

## Handling Rejections

| Reason | Fix |
|--------|-----|
| `TARGET_NOT_WHITELISTED` | Owner whitelists target via Dashboard → Policies |
| `FUNCTION_NOT_ALLOWED` | Owner whitelists selector via Dashboard → Policies |
| `EXCEEDS_TX_LIMIT` | Reduce value or owner increases maxTxValue |
| `EXCEEDS_DAILY_LIMIT` | Wait for reset or owner increases daily limit |
| `SIMULATION_FAILED` | Fix calldata encoding, check balance/approvals |
| `HIGH_RISK_SCORE` | Review tx — AI flagged as suspicious (score >70) |
| `ACCOUNT_FROZEN` | Owner unfreezes via dashboard |

## RPC URLs

| Chain | ID | RPC | Native Token |
|-------|-----|-----|-------------|
| Ethereum | 1 | `https://eth.drpc.org` | ETH |
| Polygon | 137 | `https://polygon.drpc.org` | POL |
| Avalanche | 43114 | `https://api.avax.network/ext/bc/C/rpc` | AVAX |
| Base | 8453 | `https://mainnet.base.org` | ETH |
| Arbitrum | 42161 | `https://arb1.arbitrum.io/rpc` | ETH |
| 0G | 16661 | `https://0g.drpc.org` | A0GI |

## Best Practices

1. **Start conservative** — low limits, increase after pattern works
2. **Whitelist explicitly** — use target + function whitelists, not open policies
3. **Cap approvals** — never approve unlimited unless necessary
4. **Read `guidance` on rejection** — Guardian explains why and how to fix
5. **Check status first** — `GET /v1/accounts/:addr` before transacting
6. **Use session keys** for routine operations — they auto-expire

## Links

- Dashboard: https://sigil.codes
- Full LLM docs: https://sigil.codes/llms-full.txt
- GitHub: https://github.com/Arven-Digital/sigil-public
- X: https://x.com/sigilcodes
