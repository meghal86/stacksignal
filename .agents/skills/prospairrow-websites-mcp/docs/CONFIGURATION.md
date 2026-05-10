# CONFIGURATION

Add/update this section in `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "mcporter": {
        "config": {
          "defaultServer": "websites-mcp",
          "servers": {
            "websites-mcp": {
              "url": "http://127.0.0.1:8799"
            }
          }
        }
      },
      "prospairrow-websites-mcp": {
        "apiKey": "<optional-dashboard-key>",
        "env": {
          "PROSPAIRROW_API_KEY": "<optional-env-fallback>"
        }
      }
    }
  }
}
```

Notes:
- `apiKey` from dashboard/config is preferred.
- Runtime process env `PROSPAIRROW_API_KEY` is fallback.
