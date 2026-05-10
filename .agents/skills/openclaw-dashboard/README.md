# OpenClaw Dashboard (Public)

Mobile-first operations dashboard for OpenClaw, focused on sessions, costs, cron, watchdog, and day-to-day operations.

This public repository is sanitized and simplified for sharing.

## Install via ClawHub

```bash
clawhub install openclaw-dashboard
cd ~/.openclaw/workspace/skills/openclaw-dashboard
cp env.example .env
node api-server.js
```

Then open http://localhost:18791

## Quick Start (from source)

```bash
git clone https://github.com/JonathanJing/openclaw-dashboard.git
cd openclaw-dashboard
cp env.example .env
# edit .env with your own values
node api-server.js
```

Then open:

- `http://localhost:18791/`

## Required Configuration

Default install has no hard key requirement.

- `OPENCLAW_AUTH_TOKEN` is **optional but recommended** for protected/local-auth usage.
- `gateway.authToken` is treated as optional capability context in skill metadata.

Use `env.example` (ClawHub package) or `.env.example` (source checkout) for optional overrides.

## Compliance Defaults (Important)

This public package now ships with restricted defaults:
- Dashboard binds to localhost by default (`DASHBOARD_HOST=127.0.0.1`)
- No automatic loading of `~/.openclaw/keys.env` unless `OPENCLAW_LOAD_KEYS_ENV=1`
- Provider org audit endpoint disabled unless `OPENCLAW_ENABLE_PROVIDER_AUDIT=1`
- Config file view endpoint (`/ops/config`) disabled unless `OPENCLAW_ENABLE_CONFIG_ENDPOINT=1`
- Absolute-path attachment copy mode disabled unless `OPENCLAW_ALLOW_ATTACHMENT_FILEPATH_COPY=1`
- Even when enabled, attachment copy only allows repo-local paths by default
- Extra source paths require explicit flags: `OPENCLAW_ALLOW_ATTACHMENT_COPY_FROM_TMP=1`, `OPENCLAW_ALLOW_ATTACHMENT_COPY_FROM_WORKSPACE=1`, and/or `OPENCLAW_ALLOW_ATTACHMENT_COPY_FROM_OPENCLAW_HOME=1`
- User-scoped systemctl restart disabled unless `OPENCLAW_ENABLE_SYSTEMCTL_RESTART=1`
- Frontend no longer sends auth token in query parameters for API calls
- Cron/task text sent to hooks is sanitized and treated as untrusted payload
- Mutating operations are disabled unless `OPENCLAW_ENABLE_MUTATING_OPS=1` and request is from localhost
- `server-monitor.html` now uses integrated authenticated `/metrics` endpoint

These defaults reduce accidental secret ingestion and over-broad local file access.

## Core Files

- `api-server.js`: backend API and operations logic
- `agent-dashboard.html`: single-file frontend UI
- `SKILL.md`: repository-level agent instructions

## Security Notes

- No real tokens should be committed.
- Keep secrets in local environment files only.
- Rotate tokens immediately if exposure is suspected.

## VirusTotal Compliance

Run a pre-release hash and upload workflow before publishing:

```bash
shasum -a 256 api-server.js agent-dashboard.html SKILL.md README.md env.example > vt-hashes.txt
```

Then submit these hashes/files to VirusTotal and attach the report IDs to your release notes.  
If any file is flagged, block release and investigate before publishing.

## Publish to ClawHub

This repository is prepared as a ClawHub skill package with root-level `SKILL.md`.

```bash
clawhub publish . \
  --slug openclaw-dashboard \
  --name "OpenClaw Dashboard" \
  --version 1.0.9 \
  --changelog "Risk-surface reduction: localhost bind default, no token-in-query API usage, tighter attachment copy defaults, and integrated /metrics endpoint."
```

If your local version changes, update both:
- `SKILL.md` frontmatter `version`
- `clawhub publish --version`

## License

MIT
