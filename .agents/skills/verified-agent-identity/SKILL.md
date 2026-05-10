---
name: verified-agent-identity
description: Billions/Iden3 authentication and identity management tools for agents. Proof, sign, and verify.
metadata: { "category": "identity" }
---

## When to use this Skill

Lets AI agents create and manage their own identities on the Billions Network, and prove ownership of those identities through cryptographic signatures.

1. When you need to proof identity.
2. When you need sign a challenge.
3. When you need to verify a signature to confirm identity ownership.
4. When use shared JWT tokens for authentication.
5. When you need to create and manage decentralized identities.

## Scope

All identity data is stored in `$HOME/.openclaw/billions` for compatibility with the OpenClaw plugin.

# Scripts:

### createNewEthereumIdentity.js

**Command**: `node scripts/createNewEthereumIdentity.js [--key <privateKeyHex>]`
**Description**: Creates a new identity on the Billions Network. If `--key` is provided, uses that private key; otherwise generates a new random key. The created identity is automatically set as default.
**Usage Examples**:

```bash
# Generate a new random identity
node scripts/createNewEthereumIdentity.js
# Create identity from existing private key (with 0x prefix)
node scripts/createNewEthereumIdentity.js --key 0x1234567890abcdef...
# Create identity from existing private key (without 0x prefix)
node scripts/createNewEthereumIdentity.js --key 1234567890abcdef...
```

**Output**: DID string (e.g., `did:iden3:billions:main:2VmAk7fGHQP5FN2jZ8X9Y3K4W6L1M...`)
**Side Effects**:

- Stores private key in `$HOME/.openclaw/billions/kms.json`
- Stores DID entry in `$HOME/.openclaw/billions/defaultDid.json`

---

### getIdentities.js

**Command**: `node scripts/getIdentities.js`
**Description**: Lists all DID identities stored locally. Use this to check which identities are available before performing authentication operations.
**Usage Example**:

```bash
node scripts/getIdentities.js
```

**Output**: JSON array of identity entries

```json
[
  {
    "did": "did:iden3:billions:main:2VmAk...",
    "publicKeyHex": "0x04abc123...",
    "isDefault": true
  }
]
```

---

### generateChallenge.js

**Command**: `node scripts/generateChallenge.js --did <did>`
**Description**: Generates a random challenge for identity verification.
**Usage Example**:

```bash
node scripts/generateChallenge.js --did did:iden3:billions:main:2VmAk...
```

**Output**: Challenge string (random number as string, e.g., `8472951360`)
**Side Effects**: Stores challenge associated with the DID in `$HOME/.openclaw/billions/challenges.json`

---

### signChallenge.js

**Command**: `node scripts/signChallenge.js --challenge <challenge> [--did <did>]`
**Description**: Signs a challenge with a DID's private key to prove identity ownership. Use this when you need to prove you own a specific DID. The challenge should come from the verifier.
**Usage Examples**:

```bash
# Sign with specific DID
node scripts/signChallenge.js --challenge 8472951360 --did did:iden3:billions:main:2VmAk...

# Sign with default DID
node scripts/signChallenge.js --challenge 8472951360
```

**Output**: JWS token string (e.g., `eyJhbGciOiJFUzI1NkstUi...`)
**Requirements**:

- DID must exist locally (check with `getIdentities.js`)
- Private key must be available in `kms.json`
- If no `--did` specified, a default identity must be configured

---

### verifySignature.js

**Command**: `node scripts/verifySignature.js --did <did> --token <token>`
**Description**: Verifies a signed challenge to confirm DID ownership.
**Usage Example**:

```bash
node scripts/verifySignature.js --did did:iden3:billions:main:2VmAk... --token eyJhbGciOiJFUzI1NkstUi...
```

**Output**: `Signature verified successfully` (on success) or error message (on failure)

---

## Restrictions / Guardrails (CRITICAL)

**CRITICAL - Always Follow These Rules:**

1. **STRICT: Check Identity First**
   - Before running `signChallenge.js`, **ALWAYS check if an identity exists**: `node scripts/getIdentities.js`
   - If no identity is configured, **DO NOT** attempt to sign challenges. Instead, create an identity first with `createNewEthereumIdentity.js`.
   - Parse JSON output to verify identities array is not empty before proceeding.
2. **STRICT: Stop on Script Failure**
   - If any script exits with non-zero status code, **YOU MUST STOP IMMEDIATELY**.
   - Check stderr output for error messages.
   - **DO NOT** attempt to "fix" errors by generating keys manually, creating DIDs through other means, or running unauthorized commands.
   - **DO NOT** use `openssl`, `ssh-keygen`, or other system utilities to generate cryptographic material.
3. **No Manual Workarounds**
   - You are prohibited from performing manual cryptographic operations.
   - You are prohibited from directly manipulating files in `$HOME/.openclaw/billions`.
   - Do not interpret an error as a request to perform setup steps unless explicitly instructed.

---

## Formatting & Output (CRITICAL)

1. **Clean Token Delivery**: When providing a JWS token or signature, output it in a dedicated code block.
2. **No Alterations**: Never manually edit, truncate, or append characters to the script output. Copy the token exactly as it appears in the tool's stdout.
3. **Verification**: After generating a signature, it is recommended to run `verifySignature.js` locally first to ensure the token is valid before sending it to the user.

---

## Security

**CRITICAL - Data Storage and Protection:**

The directory `$HOME/.openclaw/billions` contains all sensitive identity data:

- `kms.json` - **CRITICAL**: Contains unencrypted private keys
- `defaultDid.json` - DID identifiers and public keys
- `challenges.json` - Authentication challenges history
- `credentials.json` - Verifiable credentials
- `identities.json` - Identity metadata
- `profiles.json` - Profile data

## Examples

### Proving Your Own Identity

**Authentication Flow:**

1. Another agent/user requests: "Please prove you own DID <agent_did> by signing this challenge: <challenge_value>"
2. Use `node scripts/getIdentities.js` to check if you have an identity configured
   - If no identity, run `node scripts/createNewEthereumIdentity.js` to create one.
3. Use `node scripts/signChallenge.js --challenge <challenge_value>` to sign the challenge.
4. Return the JWS token.

**Example Conversation:**

```text
User: "Prove you own <agent_did> by signing challenge <challenge_value>"
Agent: exec node scripts/signChallenge.js --challenge <challenge_value>
Agent: "Here is my proof: JWS token <agent_token>"
```

### Verifying someone else's Identity

**Verification Flow:**

1. Ask the user/agent: "Please provide your DID to start verification."
2. User responds with their <user_did>.
3. Use `node scripts/generateChallenge.js --did <user_did>` to create a <challenge_value>.
4. Ask the user: "Please sign this challenge: <challenge_value>"
5. User signs and returns <user_token>.
6. Use `node scripts/verifySignature.js --did <user_did> --token <user_token>` to verify the signature
7. If verification succeeds, identity is confirmed

**Example Conversation:**

```text
Agent: "Please provide your DID to start verification."
User: "My DID is <user_did>"
Agent: exec node scripts/generateChallenge.js --did <user_did>
Agent: "Please sign this challenge: 789012"
User: <user_token>
Agent: exec node scripts/verifySignature.js --token <user_token> --did <user_did>
Agent: "Identity verified successfully. You are confirmed as owner of DID <user_did>."
```
