# clawd-zero-trust v1.2.0

Zero Trust security hardening for OpenClaw AI agent deployments. Built by [Blocksoft](https://blocksoft.tech).

## Why this exists

AI agents run 24/7 with access to shell, network, and secrets. One compromised plugin or prompt injection and your agent becomes an exfiltration vector. Default OpenClaw ships wide open — all outbound ports, no plugin restrictions, no tool scoping.

This skill locks it down. Every outbound connection is whitelisted by DNS-resolved IP. Every plugin is explicitly allowed. Every model gets only the tools it needs. If something breaks the rules, traffic gets dropped — not logged and forgotten.

Built for operators who treat their AI agent like production infrastructure, not a toy.

## What it does

- **Egress filtering:** DNS-based UFW rules — only allow outbound to verified AI provider IPs (Anthropic, OpenAI, Google, Telegram, Tailscale, GitHub)
- **Port 22 lockdown:** SSH egress restricted to GitHub CIDRs only (for deploy key git push)
- **Port 80 conditional:** Only allows HTTP egress if Tailscale DERP fallback actually needs it
- **GitHub CIDR drift detection:** Warns when hardcoded CIDRs diverge from `api.github.com/meta`
- **Hardening config externalized:** `hardening.json` survives OpenClaw updates (no more jq-patching openclaw.json)
- **Plugin allowlisting:** Restricts loaded plugins to verified first-party set
- **PLP (Principle of Least Privilege):** Limits tool access for untrusted/cheap models
- **Transactional apply:** Auto-rollback if connectivity checks fail post-apply
- **Canary mode:** Temporary apply with 120s verification window before commit

## Quick start

```bash
# Audit current state
bash scripts/audit.sh

# Preview hardening changes (dry-run)
bash scripts/harden.sh

# Preview egress rules (dry-run)
bash scripts/egress-filter.sh --dry-run

# Apply hardening
bash scripts/harden.sh --apply

# Apply egress (with auto-rollback on failure)
bash scripts/egress-filter.sh --apply

# Emergency rollback
bash scripts/egress-filter.sh --reset
```

## Changelog

### v1.1.7 (2026-02-22)
- **Fix 2:** Conditional port 80/tcp — runtime check via `tailscale netcheck`, skip if DERP doesn't need it
- **Fix 3:** Port 22/tcp restricted to 4 GitHub SSH CIDRs with `api.github.com/meta` drift detection
- **Fix 5:** Hardening config externalized to `hardening.json` — shallow-merge into openclaw.json post-deploy
- Multi-model security audit: Opus 4.6 + GPT 5.3 + Sonnet 4.6 (3-model consensus required)
- Purged leaked credentials from git history

### v1.1.6 (2026-02-21)
- Release gate script (shellcheck + validate + package + verify)
- Scanner false-positive remediation (no eval, documented agentsandbox.co)

### v1.1.5 and earlier
- Transactional apply with auto-rollback
- Canary mode (120s verification)
- Versioned firewall profile state
- flush_zt_rules to prevent UFW rule accumulation
- Bug fixes from dual-model audits (GPT 5.3 + Sonnet 4.6)

## Architecture

```
scripts/
  egress-filter.sh   # Core egress policy (UFW rules)
  harden.sh          # OpenClaw config hardening
  audit.sh           # Security audit checker
  release-gate.sh    # Pre-release validation
hardening.json       # Externalized hardening overrides
references/
  zero-trust-principles.md
  false-positives.md
.state/
  egress-profile.json  # Versioned firewall state
```

## License

MIT
