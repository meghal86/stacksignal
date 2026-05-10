---
name: clawned
description: Security agent that inventories installed OpenClaw skills, analyzes them for threats, and syncs results to your Clawned dashboard.
metadata: {"openclaw": {"emoji": "🛡️", "requires": {"bins": ["python3"]}, "homepage": "https://clawned.dev"}}
---

# Clawned — Security Agent for OpenClaw

Automatically discovers all installed skills, analyzes them for security threats, and syncs results to your Clawned dashboard.

## Setup

Configure your API key in `openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "clawned": {
        "enabled": true,
        "env": {
          "CLAWNED_API_KEY": "cg_your_api_key_here",
          "CLAWNED_SERVER": "https://api.clawned.dev"
        }
      }
    }
  }
}
```

## Commands

### Sync all installed skills to dashboard
```bash
python3 {baseDir}/scripts/agent.py sync
```

### Scan a single skill locally
```bash
python3 {baseDir}/scripts/agent.py scan --path <skill-directory>
```

### List all discovered skills
```bash
python3 {baseDir}/scripts/agent.py inventory
```

### Check agent status
```bash
python3 {baseDir}/scripts/agent.py status
```

## Automatic Sync

Schedule every 6 hours via OpenClaw cron:

```json
{
  "jobs": [{
    "schedule": "0 */6 * * *",
    "command": "Run clawned sync to check all installed skills",
    "description": "Security scan every 6 hours"
  }]
}
```
