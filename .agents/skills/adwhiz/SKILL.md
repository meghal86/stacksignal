---
name: adwhiz
description: >
  Manage Google Ads campaigns from your AI coding tool. 44 MCP tools for
  auditing, creating, and optimizing Google Ads accounts using natural language.
metadata:
  openclaw:
    primaryEnv: "ADWHIZ_API_KEY"
    requires:
      env:
        - "ADWHIZ_API_KEY"
    homepage: "https://adwhiz.ai"
    source: "https://github.com/iamzifei/adwhiz"
    license: "MIT"
---

# AdWhiz — Google Ads MCP Server

AdWhiz is a hosted MCP server that connects your AI coding tool to the
Google Ads API through a secure, authenticated proxy. It exposes **44 tools**
across 5 categories so you can audit, create, and manage Google Ads campaigns
using plain English.

All API calls are authenticated via your personal `ADWHIZ_API_KEY` and routed
through the AdWhiz server at `mcp.adwhiz.ai`. No Google credentials or OAuth
tokens are stored by the skill — authentication is handled entirely server-side
after you link your Google Ads account at https://adwhiz.ai/connect.

## Security & Permissions Model

- **OAuth 2.0**: User authenticates with Google via AdWhiz's web UI. Refresh
  tokens are encrypted at rest (AES-256-GCM) and never exposed to the agent.
- **API key scoping**: Each `ADWHIZ_API_KEY` is bound to a single Google Ads
  account. Cross-account access is not possible.
- **Write safety**: All write tools create entities in **PAUSED** status by
  default. The agent must explicitly request activation.
- **Mutation logging**: Every mutation is recorded in the `get_operation_log`
  tool for full auditability.
- **Read-only by default**: 17 of 44 tools are strictly read-only and cannot
  modify your account.
- **Confirmation required**: Write tools require user confirmation before
  executing via the agent's standard permission flow.
- **No arbitrary code execution**: The MCP server is a hosted HTTP service.
  No code is downloaded or executed on the user's machine beyond the thin
  MCP client wrapper.

## Tool Categories

### Account (2 tools) — Read-only
| Tool | Description |
|------|-------------|
| `list_accounts` | List all accessible Google Ads accounts |
| `get_account_info` | Get account details (currency, timezone, optimization score) |

### Read (14 tools) — Read-only
| Tool | Description |
|------|-------------|
| `list_campaigns` | List campaigns with status, type, budget, bidding strategy |
| `get_campaign_performance` | Campaign metrics: cost, clicks, conversions, CTR, CPA, ROAS |
| `list_ad_groups` | List ad groups with bids, filtered by campaign |
| `list_ads` | List ads with headlines, descriptions, final URLs |
| `list_keywords` | Keywords with match types, bids, quality scores |
| `get_search_terms` | Search terms report (actual queries triggering ads) |
| `list_negative_keywords` | Negative keywords at campaign, ad group, or account level |
| `list_assets` | Sitelinks, callouts, structured snippets |
| `list_conversion_actions` | Conversion actions with status, type, category |
| `list_budgets` | Campaign budgets with associated campaigns |
| `list_bidding_strategies` | Portfolio bidding strategies |
| `list_audience_segments` | Audience targeting criteria |
| `list_user_lists` | Remarketing/audience lists for targeting |
| `get_operation_log` | Recent mutations performed via AdWhiz |

### Write (25 tools) — Requires user confirmation
| Tool | Description |
|------|-------------|
| `create_campaign` | Create Search, Display, PMax, or Video campaign (starts PAUSED) |
| `update_campaign` | Update campaign name |
| `set_campaign_status` | Pause, enable, or remove a campaign |
| `create_ad_group` | Create an ad group in a campaign |
| `update_ad_group` | Update ad group name or CPC bid |
| `set_ad_group_status` | Pause, enable, or remove an ad group |
| `create_responsive_search_ad` | Create RSA with headlines + descriptions (starts PAUSED) |
| `set_ad_status` | Pause, enable, or remove an ad |
| `add_keywords` | Add keywords with match types and bids |
| `update_keyword_bid` | Change a keyword's CPC bid |
| `set_keyword_status` | Pause, enable, or remove a keyword |
| `add_negative_keyword` | Add negative keyword at campaign or ad group level |
| `remove_negative_keyword` | Remove a negative keyword |
| `create_shared_negative_list` | Create a shared negative keyword list |
| `add_to_shared_list` | Add keywords to a shared negative list |
| `attach_shared_list` | Attach shared list to a campaign |
| `create_sitelink` | Create a sitelink asset |
| `create_callout` | Create a callout asset |
| `link_asset_to_campaign` | Link asset to a campaign |
| `create_conversion_action` | Create a conversion tracking action |
| `update_conversion_action` | Update conversion action name or status |
| `create_budget` | Create a campaign budget |
| `update_budget` | Update budget amount or name |
| `create_bidding_strategy` | Create a portfolio bidding strategy |
| `add_audience_to_campaign` | Add audience targeting to a campaign |

### Audit (2 tools) — Read-only analysis
| Tool | Description |
|------|-------------|
| `run_mini_audit` | Quick 3-metric audit: wasted spend, best/worst CPA, projected savings |
| `run_full_audit` | Comprehensive audit: campaigns, keywords, search terms, issues, recommendations |

### Query (1 tool) — Read-only, bounded
| Tool | Description |
|------|-------------|
| `run_gaql_query` | Execute a read-only GAQL query against your account (max 1,000 rows, SELECT only) |

## MCP Server Configuration

AdWhiz uses **HTTP transport** to connect to the hosted MCP server. No npm
packages are downloaded or executed at runtime.

```json
{
  "mcpServers": {
    "adwhiz": {
      "transport": "http",
      "url": "https://mcp.adwhiz.ai/mcp",
      "headers": {
        "Authorization": "Bearer ${ADWHIZ_API_KEY}"
      }
    }
  }
}
```

## Quick Install

```bash
clawhub install adwhiz
```

This adds the MCP server configuration above to your settings. You will be
prompted to provide your `ADWHIZ_API_KEY`.

## Getting Your API Key

1. Sign up at https://adwhiz.ai
2. Connect your Google Ads account via OAuth
3. Copy your API key from the dashboard settings page

## Example Prompts

- "Audit my Google Ads account and show the top 5 waste areas"
- "Pause all campaigns with CPA above $150"
- "Add these negative keywords to my Search campaigns: [list]"
- "Create a new Search campaign targeting lawyers in New York with $100/day budget"
- "Show me search terms wasting money and suggest negatives"
- "What is my account's average Quality Score this month?"

## Data Handling

- AdWhiz only accesses the Google Ads account you explicitly linked
- No campaign data is stored beyond the duration of each API request
- Mutation logs are retained for 30 days for auditability
- You can revoke access at any time from https://adwhiz.ai/connect

## Documentation

Full documentation: https://adwhiz.ai/docs
