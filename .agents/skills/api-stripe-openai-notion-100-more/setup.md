# Setup — API

First-time setup guide for API integrations.

## Initial Configuration

On first use, create the preferences directory:

```bash
mkdir -p ~/api
```

## Integration Preferences

Ask the user about their preferences:

1. **Code language** — "Do you prefer curl examples or a specific language (Python, JS, etc.)?"
2. **Naming convention** — "How do you name your API keys (e.g., STRIPE_PROD_API_KEY)?"

Save responses to `~/api/preferences.md`:

```markdown
# API Preferences

## Defaults
- Language: curl
- Naming: {SERVICE}_{ACCOUNT}_{TYPE}
```

## Credential Storage

This skill uses environment variables for credentials:

```bash
# Set for current session
export STRIPE_PROD_API_KEY="sk_live_xxx"
```

See `credentials.md` for the full naming convention and multi-account workflows.

## Quick Start

When user asks about an API:

1. Check if docs exist: `ls apis/{service}.md`
2. If yes: provide auth setup, endpoints, and examples
3. If no: help using official documentation

## Files Created

This skill creates and uses these files:

- `~/api/preferences.md` — User preferences (language, conventions)
- `~/api/accounts.md` — Registry of configured account names (not secrets)

All files are created with user awareness and contain only metadata, not credentials.
