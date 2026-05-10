# Security Notes (Guardian Core)

Guardian Core is local-only by design.

## Data access
- Reads workspace files for scanning and config discovery.
- Writes local SQLite DB (`guardian.db`) for detections/history.
- No webhook sender in this package.
- No HTTP API server in this package.
- No cron setup helper in this package.
- No remote definitions updater in this package.

## Declared runtime inputs
- Env: `GUARDIAN_WORKSPACE`, `GUARDIAN_CONFIG`

## Permissions
- `read_workspace`
- `write_workspace`
