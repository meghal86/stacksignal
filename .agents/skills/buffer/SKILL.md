---
name: buffer
description: "Buffer social media — schedule posts, manage profiles, view pending/sent updates, analytics. Social publishing CLI."
homepage: https://www.agxntsix.ai
license: MIT
compatibility: Python 3.10+ (stdlib only — no dependencies)
metadata: {"openclaw": {"emoji": "📢", "requires": {"env": ["BUFFER_ACCESS_TOKEN"]}, "primaryEnv": "BUFFER_ACCESS_TOKEN", "homepage": "https://www.agxntsix.ai"}}
---

# 📢 Buffer

Social media scheduling — create posts, manage queues, view analytics.

## Features

- **Profiles** — list connected social accounts
- **Create posts** — schedule to multiple profiles
- **Pending** — view scheduled queue
- **Sent** — view published posts with stats
- **Shuffle** — randomize queue order

## Requirements

| Variable | Required | Description |
|----------|----------|-------------|
| `BUFFER_ACCESS_TOKEN` | ✅ | API key/token for Buffer |

## Quick Start

```bash
python3 {baseDir}/scripts/buffer.py profiles
python3 {baseDir}/scripts/buffer.py create "Check out our new feature!" <profile-id>
python3 {baseDir}/scripts/buffer.py pending <profile-id>
python3 {baseDir}/scripts/buffer.py sent <profile-id>
python3 {baseDir}/scripts/buffer.py me
```

## Credits
Built by [M. Abidi](https://www.linkedin.com/in/mohammad-ali-abidi) | [agxntsix.ai](https://www.agxntsix.ai)
[YouTube](https://youtube.com/@aiwithabidi) | [GitHub](https://github.com/aiwithabidi)
Part of the **AgxntSix Skill Suite** for OpenClaw agents.

📅 **Need help setting up OpenClaw for your business?** [Book a free consultation](https://cal.com/agxntsix/abidi-openclaw)
