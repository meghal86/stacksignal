---
name: clawd-zero-trust
version: "1.2.0"
author: stanistolberg
homepage: https://github.com/stanistolberg/clawd-zero-trust
description: "Zero Trust security hardening for OpenClaw deployments. Use when asked to audit, harden, or apply Zero Trust architecture to an OpenClaw instance — including NHI identity scoping, Principle of Least Privilege (PLP), Plan-First protocol, DNS-based egress filtering, plugin allowlisting, and SSH/network lockdown. Also triggers on security audit requests, vulnerability analysis, SecureClaw installation, firewall hardening, and post-deployment security reviews."
---

# clawd-zero-trust (v1.2.0)

Zero Trust hardening framework for OpenClaw. Built by Blocksoft.

## Core Principles

1. **NHI (Non-Human Identity):** Sub-agents run as isolated sessions with scoped credentials. Never share 'main' identity for high-risk ops.
2. **PLP (Principle of Least Privilege):** Restrict default model toolset. Use `tools.byProvider` to limit small/untrusted models to `coding` profile.
3. **Plan-First:** Declare intent (what + why + expected outcome) before any write, exec, or network call.
4. **Egress Control:** Whitelist outbound traffic to authorized AI providers only. Preserve Tailscale + Telegram API.
5. **Assumption of Breach:** Design as if the attacker is already in. Verify every plugin, model, and extension.

## Canonical Egress Script Path

Single source of truth:

`/home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh`

Compatibility symlink:

`/home/claw/.openclaw/workspace/scripts/egress_filter.sh -> .../skills/clawd-zero-trust/scripts/egress-filter.sh`

## Workflow: Audit → Harden → Egress → Verify

### 1) Audit
```bash
bash scripts/audit.sh
```

### 2) Harden
```bash
# Preview (default)
bash scripts/harden.sh

# Apply
bash scripts/harden.sh --apply
```

### 3) Egress Policy (dry-run default)
```bash
# Dry-run preview (default)
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh --dry-run

# Transactional apply: auto-rollback if Telegram/GitHub/Anthropic/OpenAI checks fail
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh --apply

# Canary mode: temporary apply + 120s periodic verification, then commit/rollback
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh --canary

# Verify endpoints only
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh --verify

# Emergency rollback
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/egress-filter.sh --reset
```

### 4) Dynamic Whitelisting (MAX USER-FRIENDLY API)
To open a new port or add a service securely (e.g. for custom email, video extraction, new AI agents), **DO NOT edit the bash script or hardcoded arrays**. Always use the dynamic configuration helper command:
```bash
bash /home/claw/.openclaw/workspace/skills/clawd-zero-trust/scripts/whitelist.sh <domain> <port>
```
*(Example: `bash whitelist.sh youtu.be 443`). This automatically injects the domain cleanly into the `config/providers.txt` engine, triggers a transactional configuration flush, and instantly applies the changes to UFW.*

### 5) Release Gate (v1.2.0)
```bash
bash scripts/release-gate.sh
```
Gate checks (must all pass):
- `quick_validate.py` on skill structure
- `shellcheck` on all shell scripts (fails with install hint if missing)
- `package_skill.py` packaging to `skills/dist/clawd-zero-trust.skill`
- `--verify` endpoint checks

## Versioned Firewall Profile State

State file:

`/home/claw/.openclaw/workspace/skills/clawd-zero-trust/.state/egress-profile.json`

Tracked fields:
- `profileVersion`
- `scriptHash`
- `lastAppliedAt`
- `lastResult`

On apply/canary, hash mismatch is refused unless `--force` is provided. The `whitelist.sh` helper intrinsically handles hash mismatches seamlessly.

## References
- `references/zero-trust-principles.md` — Detailed ZT framework for AI agents
- `references/false-positives.md` — Verified safe patterns that trigger audit warnings
