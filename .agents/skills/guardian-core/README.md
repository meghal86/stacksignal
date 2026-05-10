# 🛡️ Guardian Core

Core local Guardian package with bundled signatures and dashboard.

- Realtime + batch scanning
- Local SQLite logging
- Local dashboard
- No webhook/API networking paths
- No cron automation setup scripts

## Install
```bash
clawhub install guardian-core
cd ~/.openclaw/skills/guardian-core && ./install.sh
```

## Verify
```bash
python3 scripts/admin.py status
python3 scripts/admin.py threats
python3 scripts/admin.py report
```

## Dashboard
```bash
cd dashboard && python3 -m http.server 8091
# http://localhost:8091/guardian.html
```
