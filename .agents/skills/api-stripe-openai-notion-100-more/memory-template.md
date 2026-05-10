# Memory Template — API

Create `~/api/preferences.md` only if user shares preferences:

```markdown
# API Preferences

## Code Style
language: python | javascript | curl | go | ruby
<!-- Their preferred language for examples -->

## Auth Storage
method: env_vars | secrets_manager
<!-- Where they keep API keys (env_vars recommended for cross-platform) -->

## Common APIs
<!-- APIs they use frequently, for quick reference -->
- stripe
- openai
- notion

---
*Updated: YYYY-MM-DD*
```

## Key Principles

- **Create only when needed** — most users just want API help, not config
- **Learn from usage** — if they always ask for Python examples, note it
- **Keep minimal** — just preferences, not API keys or secrets
