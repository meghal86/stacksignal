---
name: skill-trust-auditor
description: "Audit a ClawHub skill for security risks BEFORE installation. Use when: (1) user is about to install a ClawHub skill, (2) user asks if a skill is safe, (3) reviewing skills for enterprise deployment. NOT for: auditing your own workspace files, general code review, or non-ClawHub scripts."
metadata:
  {
    "openclaw": {
      "emoji": "🛡️",
      "requires": { "anyBins": ["python3", "clawhub"] }
    }
  }
---

# Skill Trust Auditor

Audit any ClawHub skill for security risks before installation. Produces a Trust Score (0-100) and flags dangerous patterns. Created in response to the ClawHavoc incident (Feb 2026, 341 malicious skills).

## Setup (first run only)

```bash
bash scripts/setup.sh
```

## Audit a Skill

When user says "audit [skill-name]" or "is [skill-name] safe" or before any `clawhub install`:

```bash
bash scripts/audit.sh [skill-name-or-url]
# Example:
bash scripts/audit.sh steipete/clawhub
bash scripts/audit.sh https://clawhub.ai/someuser/someskill
```

Output:
```json
{
  "skill": "someuser/someskill",
  "trust_score": 72,
  "verdict": "INSTALL WITH CAUTION",
  "risks": [
    {"level": "HIGH", "pattern": "curl to external domain", "location": "scripts/sync.sh:14"},
    {"level": "MEDIUM", "pattern": "reads MEMORY.md", "location": "SKILL.md:23"}
  ],
  "safe_patterns": ["no env var access", "no self-modification"],
  "author_verified": false,
  "recommendation": "Review scripts/sync.sh:14 before installing. The external curl call could exfiltrate data."
}
```

Post to user with clear summary:
```
🛡️ Trust Audit: someuser/someskill
Score: 72/100 — ⚠️ INSTALL WITH CAUTION

🔴 HIGH: curl to unknown domain in scripts/sync.sh:14
🟡 MEDIUM: reads your MEMORY.md

Recommendation: Inspect line 14 of sync.sh before proceeding.
Run: clawhub show someuser/someskill --file scripts/sync.sh
```

## Trust Score Guide

| Score | Verdict | Action |
|-------|---------|--------|
| 90-100 | ✅ SAFE | Install freely |
| 70-89 | ⚠️ CAUTION | Review flagged items first |
| 50-69 | 🟠 RISKY | Only if you understand the risks |
| 0-49 | 🔴 DO NOT INSTALL | High probability of malicious intent |

## Risk Pattern Reference

**HIGH RISK** (-30 each):
- `process.env` access in scripts
- `curl`/`wget` to non-standard domains
- Reading `~/.config` or `~/.openclaw` directly
- `exec()` with user-controlled input
- Instructions to modify `SOUL.md`/`AGENTS.md`/`openclaw.json`

**MEDIUM RISK** (-10 each):
- Any outbound API calls (even to known services)
- File writes outside workspace
- Reading `MEMORY.md` or diary files

**LOW RISK** (-3 each):
- `web_fetch` to standard domains
- Read-only file access in workspace

## Auto-Audit Mode

Optionally prepend audit to every install:
```bash
# Add to your shell aliases:
alias clawhub-safe='bash ~/.openclaw/workspace/skills/skill-trust-auditor/scripts/audit.sh $1 && clawhub install $1'
```

## ClawHavoc Pattern Reference

See `references/clawhavoc-patterns.md` for known malicious patterns from the February 2026 incident. Update this file when new incidents are reported.
