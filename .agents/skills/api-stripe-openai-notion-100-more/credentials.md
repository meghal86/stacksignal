# Credentials System

Multi-account credential management using environment variables.

## Naming Convention

```
{SERVICE}_{ACCOUNT}_{TYPE}
```

**Examples:**
- `STRIPE_PROD_API_KEY` — Production Stripe
- `STRIPE_TEST_API_KEY` — Test Stripe  
- `OPENAI_PERSONAL_API_KEY` — Personal OpenAI
- `GITHUB_WORK_TOKEN` — Work GitHub PAT

## Credential Types

| Type | Suffix | Example |
|------|--------|---------|
| API Key | `_API_KEY` | `STRIPE_PROD_API_KEY` |
| Access Token | `_TOKEN` | `GITHUB_WORK_TOKEN` |
| Secret Key | `_SECRET` | `AWS_PROD_SECRET` |
| Client ID | `_CLIENT_ID` | `GOOGLE_APP_CLIENT_ID` |
| Client Secret | `_CLIENT_SECRET` | `GOOGLE_APP_CLIENT_SECRET` |

## Setting Environment Variables

Set for current terminal session:

```bash
export STRIPE_PROD_API_KEY="sk_live_xxx"
export STRIPE_TEST_API_KEY="sk_test_xxx"
```

For persistent configuration, use your preferred method:
- Shell profile configuration
- Secret manager (1Password CLI, Vault, etc.)
- CI/CD secret injection

## Usage

```bash
# Direct use
curl https://api.stripe.com/v1/charges \
  -H "Authorization: Bearer $STRIPE_PROD_API_KEY"

# In scripts
API_KEY="${STRIPE_PROD_API_KEY}"
curl https://api.stripe.com/v1/charges -H "Authorization: Bearer $API_KEY"
```

## Multi-Account Workflow

When user has multiple accounts, ask which to use:

```
Available Stripe accounts:
- prod (STRIPE_PROD_API_KEY)
- test (STRIPE_TEST_API_KEY)
- client_acme (STRIPE_CLIENT_ACME_API_KEY)

Which account should I use?
```

## Account Registry

Track configured accounts in `~/api/accounts.md`:

```markdown
# API Accounts

## Stripe
| Account | Env Var | Purpose |
|---------|---------|---------|
| prod | STRIPE_PROD_API_KEY | Main business |
| test | STRIPE_TEST_API_KEY | Development |

## OpenAI
| Account | Env Var | Purpose |
|---------|---------|---------|
| personal | OPENAI_PERSONAL_API_KEY | Side projects |
| company | OPENAI_COMPANY_API_KEY | Production |
```

## OAuth Token Refresh

For OAuth APIs, set client credentials and refresh as needed:

```bash
export GOOGLE_APP_CLIENT_ID="xxx.apps.googleusercontent.com"
export GOOGLE_APP_CLIENT_SECRET="GOCSPX-xxx"
export GOOGLE_APP_REFRESH_TOKEN="1//xxx"
```

Refresh when expired:

```bash
NEW_TOKEN=$(curl -s -X POST https://oauth2.googleapis.com/token \
  -d "client_id=$GOOGLE_APP_CLIENT_ID" \
  -d "client_secret=$GOOGLE_APP_CLIENT_SECRET" \
  -d "refresh_token=$GOOGLE_APP_REFRESH_TOKEN" \
  -d "grant_type=refresh_token" | jq -r '.access_token')
```

## Security Guidelines

1. **Never commit credentials** — Keep out of source control
2. **Use descriptive names** — `PROD`, `TEST`, `CLIENT_NAME` clarify purpose
3. **Rotate regularly** — Update values periodically
4. **Scope minimally** — Request only permissions needed
5. **Separate environments** — Never mix test/prod credentials
