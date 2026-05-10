---
name: soulprint
description: "Soulprint decentralized identity verification for AI agents. Use when: proving a real human is behind a bot, issuing privacy-preserving identity proofs, running a validator node, adding identity verification middleware to an API or MCP server, checking bot reputation scores, enforcing protocol-level immutable trust thresholds, or running BFT P2P consensus without a blockchain. Supports Colombian cédula (full) and 6+ other countries. v0.3.3 adds BFT consensus: nullifier registration via PROPOSE→VOTE→COMMIT without gas fees or external dependencies."
homepage: https://soulprint.digital
metadata:
  {
    "openclaw":
      {
        "emoji": "🌀",
        "requires": { "bins": ["node", "npx"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "soulprint",
              "bins": ["soulprint"],
              "label": "Install Soulprint CLI (npm)",
            },
          ],
      },
  }
---

# Soulprint — Decentralized Identity for AI Agents

Soulprint proves a real human is behind any AI bot using privacy-preserving proofs — no centralized authority, no biometric cloud uploads. Everything runs on-device.

**GitHub:** https://github.com/manuelariasfz/soulprint  
**npm:** https://www.npmjs.com/package/soulprint  
**Docs:** https://soulprint.digital/docs/

---

## When to Use

✅ **USE this skill when:**

- "Verify my identity for an AI agent"
- "Run a Soulprint validator node"
- "Add identity verification to my MCP server or API"
- "Check the reputation score of a bot or DID"
- "Generate a privacy proof from a Colombian cédula"
- "Issue or verify an SPT (Soulprint Token)"
- "Enforce a minimum trust threshold that cannot be lowered"

❌ **DON'T use this skill when:**

- Storing or transmitting biometric data remotely (Soulprint runs 100% locally)
- Verifying identities from countries not yet supported

---

## Quick Start

### 1. Verify Your Identity (one-time)

```bash
# Install local dependencies (OCR + face recognition) — only needed once
npx soulprint install-deps

# Run interactive verification — all local, nothing uploaded
npx soulprint verify-me
# Scans document, runs local face match, generates privacy proof
# Saves identity token to local storage
```

### 2. Show Your Token

```bash
npx soulprint show
# Output: DID, trust score (0-100), credentials, expiry, proof hash
```

### 3. Renew Token

```bash
npx soulprint renew
```

### 4. Run a Validator Node

```bash
# Starts HTTP (port 4888) + P2P network (port 6888) simultaneously
npx soulprint node
```

Node API endpoints:
```
GET  /info                — node info and network stats
GET  /protocol            — immutable protocol constants (floors, thresholds)
POST /verify              — verify proof and register anti-replay hash
POST /reputation/attest   — issue bot reputation attestation (+1 / -1)
GET  /reputation/:did     — get current bot reputation score (0-20)
GET  /proof-hash/:hash    — check if a proof hash is registered
```

---

## Protocol Constants (Immutable — P2P Enforced)

All validator nodes in the network share these constants. They are enforced at
**two levels**:

1. **`Object.freeze()`** — prevents runtime modification within a process
2. **P2P Network Hash** — `PROTOCOL_HASH` is computed from all constant values.
   Any modification changes the hash → **the node gets rejected by the entire network**.

```typescript
import { PROTOCOL_HASH, isProtocolHashCompatible } from 'soulprint-core';

// Each node computes this at startup from its actual PROTOCOL values
PROTOCOL_HASH  // "dfe1ccca1270ec86f93308dc4b981bab1d6bd74bdcc334059f4380b407ca07ca"

// P2P enforcement: peer registration validates hash
// POST /peers/register { url, protocol_hash } → 409 if mismatch
// Gossip headers: X-Protocol-Hash validated on receive → rejected if different
```

| Constant | Value | Meaning |
|---|---|---|
| `PROTOCOL_HASH` | `dfe1ccca...` | SHA-256 of all constants — mismatch = isolated from network |
| `SCORE_FLOOR` | **65** | Minimum threshold any service can set. Lower values auto-clamped to 65 |
| `VERIFIED_SCORE_FLOOR` | **52** | Verified identities (with document) can never drop below this total score |
| `MIN_ATTESTER_SCORE` | **65** | Minimum score required to issue reputation attestations |
| `VERIFY_RETRY_MAX` | **3** | Max retries when contacting a validator node |
| `VERIFY_RETRY_BASE_MS` | **500** | Base delay for retry backoff (doubles per attempt) |
| `DEFAULT_REPUTATION` | **10** | Starting reputation for all new agents |
| `IDENTITY_MAX` | **80** | Maximum identity sub-score |
| `REPUTATION_MAX` | **20** | Maximum reputation sub-score |

Check a node's live constants:
```bash
curl http://localhost:4888/protocol
# Returns all constants + immutable: true
```

---

## Integrate in Your API

### MCP Server (3 lines)

```typescript
import { requireSoulprint } from "soulprint-mcp";

server.tool("premium-tool", requireSoulprint({ minScore: 80 }), async (args, ctx) => {
  const { did, score } = ctx.soulprint;
  // only reachable if identity token is valid and score >= 80
  // Note: minScore is auto-clamped to 65 minimum (protocol floor)
});
```

The `minScore` option is **automatically clamped** to the protocol floor:
- `requireSoulprint({ minScore: 40 })` → effectively uses **65** (clamped)
- `requireSoulprint({ minScore: 80 })` → uses **80** (already above floor)

### MCP Server with validator verification + retries

```typescript
import { requireSoulprint } from "soulprint-mcp";

// Verifies token locally AND confirms with a remote validator node.
// If the validator is temporarily down, retries up to 3 times with backoff,
// then falls back to offline mode automatically.
server.tool(
  "secure-tool",
  requireSoulprint({
    minScore:     80,
    validatorUrl: "http://localhost:4888",
  }),
  async (args, ctx) => {
    const { did, score, reputation } = ctx.soulprint;
    return { content: [{ type: "text", text: `Verified: ${did}` }] };
  }
);
```

### Express / Fastify

```typescript
import { soulprintMiddleware } from "soulprint-express";

app.use(soulprintMiddleware({ minScore: 65 }));

app.get("/protected", (req, res) => {
  const { did, score } = req.soulprint;
  res.json({ did, score });
});
```

Token is read from (in order):
1. MCP capabilities header: `x-soulprint-token`
2. HTTP header: `X-Soulprint`
3. Bearer authorization header

---

## Trust Score (0–100)

| Component | Max | Source |
|---|---|---|
| Email verified | 8 | credential: email |
| Phone verified | 12 | credential: phone |
| GitHub account | 16 | credential: github |
| Document OCR | 20 | credential: document |
| Face match | 16 | credential: face_match |
| Biometric proof | 8 | credential: biometric |
| Bot reputation | 20 | Validator attestations |
| **Total** | **100** | |

**Score floors (enforced by all validator nodes):**
- Any service using `requireSoulprint()` will have its threshold clamped to **≥ 65**
- Users with document verified can never drop below **52** total score, regardless of reputation attacks

Default bot reputation: 10/20 (neutral).

---

## Retry Logic

All verification calls to validator nodes automatically retry on failure:

```
Attempt 1  → immediate
Attempt 2  → wait 500ms
Attempt 3  → wait 1000ms
           → fall back to offline signature-only verification
```

This is handled transparently by `requireSoulprint()` when `validatorUrl` is set.
No configuration needed — behavior is defined by protocol constants.

## Credential Validators (Open Source, Built-in)

Each validator node comes with real credential verification — no API keys required for most:

### Email Verified (nodemailer — SMTP)
```bash
# 1. Request OTP
curl -X POST http://localhost:4888/credentials/email/start \
  -d '{"did":"did:soulprint:abc...","email":"user@example.com"}'
# → { sessionId, message: "OTP sent to your email" }

# 2. Verify OTP (6-digit code from email)
curl -X POST http://localhost:4888/credentials/email/verify \
  -d '{"sessionId":"...","otp":"123456"}'
# → { credential: "EmailVerified", did, attestation }
```
Config: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (dev: uses Ethereal catch-all, no config needed)

### Phone Verified (TOTP — no SMS, no API key)
```bash
# 1. Get TOTP setup URI
curl -X POST http://localhost:4888/credentials/phone/start \
  -d '{"did":"did:soulprint:abc...","phone":"+573001234567"}'
# → { sessionId, totpUri, instructions }
# User scans totpUri QR with Google Authenticator / Authy / Aegis

# 2. Verify 6-digit TOTP code
curl -X POST http://localhost:4888/credentials/phone/verify \
  -d '{"sessionId":"...","code":"123456"}'
# → { credential: "PhoneVerified", did, attestation }
```
No external services — uses RFC 6238 TOTP standard. Works offline.

### GitHub Linked (OAuth — native fetch)
```bash
# Redirect user to GitHub OAuth
GET http://localhost:4888/credentials/github/start?did=did:soulprint:abc...
# → Redirects to github.com/login/oauth/authorize
# GitHub redirects back to /credentials/github/callback
# → { credential: "GitHubLinked", did, github: { login }, attestation }
```
Config: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `SOULPRINT_BASE_URL`
Create OAuth App: https://github.com/settings/applications/new

### Biometric Bound (built-in — via verify-me)
Issued automatically when user completes `npx soulprint verify-me`.
No separate endpoint needed — tied to identity proof hash.

---

## Anti-Farming Protection

The reputation system is protected against point farming.
**If a bot tries to farm points, the +1 is automatically converted to -1.**

### Rules (immutable, enforced by all validator nodes)
| Rule | Limit | Consequence |
|---|---|---|
| Daily gain cap | Max **+1 point/day** per DID | Farming detected → -1 penalty |
| Weekly gain cap | Max **+2 points/week** | Farming detected → -1 penalty |
| Same issuer | Max **1 reward/day** from same service | Farming detected → -1 penalty |
| Session duration | Min **30 seconds** | Short sessions ineligible for reward |
| Tool entropy | Min **4 distinct tools** | Too-uniform usage blocked |
| Robotic pattern | Call interval stddev < 10% of mean | Pattern detected → -1 penalty |
| New DID probation | DIDs < 7 days old need **2+ attestations** before earning | First 7 days: 0 points |

### What farming looks like vs. real usage
```
❌ Farming (detected):
   - Call tool A 3x, tool B 3x, tool C 3x every 60 seconds
   - Regular 2-second intervals (robotic pattern)
   - Same service rewards same DID multiple times/day

✅ Real usage (rewarded):
   - Session lasts > 30 seconds
   - Uses 4+ different tools naturally
   - Variable time between actions
   - Different services on different days
```

---

- **Proof system:** local circuit — 844 logic gates — advanced proof scheme (snarkjs)
- **Prove time:** ~564ms locally | **Verify time:** ~25ms
- **Anti-replay:** unique identity hash per person — prevents double registration
- **Privacy guarantee:** all sensitive inputs stay on-device; only the proof and its public hash are shared

---

## P2P Network

Validator nodes form a peer-to-peer mesh network:

```
libp2p v2.10:
  TCP transport + encrypted channels + stream multiplexing
  Kademlia DHT (peer routing)
  GossipSub (attestation broadcast — topic: soulprint-attestations-v1)
  mDNS (local network auto-discovery)
```

Nodes check protocol compatibility on connect. Nodes with a different protocol
version or modified score floors are rejected from the network automatically.

Attestations propagate via GossipSub; HTTP fallback for legacy nodes.

---

## 7 npm Packages

| Package | Version | Purpose |
|---|---|---|
| `soulprint` | latest | CLI (`npx soulprint verify-me`) |
| `soulprint-core` | 0.1.7 | DID management, tokens, protocol constants, anti-farming |
| `soulprint-verify` | 0.1.4 | OCR + face match (on-demand), biometric PROTOCOL thresholds |
| `soulprint-zkp` | 0.1.4 | ZK proofs (Circom + snarkjs), face_key via PROTOCOL.FACE_KEY_DIMS |
| `soulprint-network` | 0.2.3 | HTTP validator + P2P + credential validators + anti-farming engine |
| `soulprint-mcp` | 0.1.4 | MCP middleware with auto-clamp + retry |
| `soulprint-express` | 0.1.3 | Express/Fastify middleware |

---

## Country Support

| Country | Document | Status |
|---|---|---|
| 🇨🇴 Colombia | Cédula de Ciudadanía | ✅ Full (OCR + MRZ + face match) |
| 🇲🇽 Mexico | INE / CURP | ⚡ Partial |
| 🇦🇷 Argentina | DNI | ⚡ Partial |
| 🇻🇪 Venezuela | Cédula V/E | ⚡ Partial |
| 🇵🇪 Peru | DNI | ⚡ Partial |
| 🇧🇷 Brazil | CPF | ⚡ Partial |
| 🇨🇱 Chile | RUN | ⚡ Partial |

Want to add your country? See the [Contributing Guide](https://github.com/manuelariasfz/soulprint/blob/main/CONTRIBUTING.md).
