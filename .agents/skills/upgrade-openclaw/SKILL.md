---
name: upgrade-openclaw
description: |
  Upgrade OpenClaw and discover new features, hooks, and config improvements. 
  Use when: user explicitly says "upgrade openclaw", "update openclaw", "check for openclaw updates", 
  or asks to "see what's new in openclaw". Runs the update, audits current setup, and proposes 
  optimizations for user approval.
metadata:
  author: decentraliser
  version: "1.0.0"
  clawdbot:
    emoji: 🚀
---

# Upgrade OpenClaw

**Stay on the edge. Update, audit, discover, propose. Latest features, always.**

## Trigger

This skill activates when the user says:
- "upgrade openclaw"
- "update openclaw"
- "check for openclaw updates"
- "what's new in openclaw"

## Settings

On first run, prompt user for preferred sub-agent model and save to `settings.json`:

```json
{
  "subagentModel": "anthropic/claude-opus-4-5"
}
```

## Procedure

### 1. Check Settings

Look for `settings.json` in this skill's directory. If `subagentModel` not set, ask:

> "Which model for upgrade sub-agents? (e.g., `claude-opus-4-5`, `claude-sonnet-4`, `gpt-4o`)"

Save choice to `settings.json`.

### 2. Run Update

```bash
openclaw update
```

### 3. Discover What's New

```bash
openclaw --version
curl -s https://docs.openclaw.ai/llms.txt | head -100
```

Check:
- Config templates: `github.com/openclaw/openclaw/tree/main/docs/reference/templates`
- Changelog: GitHub releases

### 4. Audit Current Setup

```bash
openclaw hooks list
openclaw doctor --non-interactive
```

Look for:
- New hooks not enabled
- Doctor recommendations not applied
- Unused config options
- Relevant new ClawHub skills

### 5. Present Findings

```markdown
## 🔍 Post-Upgrade Report

### New Features
- [Feature]: Description

### Recommended Config Changes
| Setting | Current | Recommended | Why |
|---------|---------|-------------|-----|

### New Hooks Available
- hook-name: Description

### New Skills Worth Installing
- skill-name: Description

### Doctor Recommendations
- [Items from openclaw doctor]

---
**Apply these improvements?** (yes/no/select)
```

### 6. Apply with Approval

**Never apply without explicit user approval.**

Spawn sub-agent (using model from `settings.json`) to:
- Config changes via `gateway config.patch`
- Hook enablement via `openclaw hooks enable <hook>`
- Skill install via `clawdhub install <skill>`
