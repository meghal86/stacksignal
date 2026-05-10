# prospairrow-websites-mcp

**Generate more revenue with high-quality leads.**

Give your AI agent direct access to Prospairrow's AI-powered prospecting platform. Move beyond basic information — enrich prospects with deep company insights, discover competitors, and generate content marketing so your sales team can build a pipeline that closes faster.

- Fuel your pipeline with enriched firmographics, tech stacks, and key contacts
- Hyper-target outreach by stopping bad-fit prospects before they waste your team's time
- Unlock competitor intelligence and personalized pitches that resonate with decision-makers

This skill runs a local `websites-mcp` JSON-RPC server that connects your agent to Prospairrow via API. The runtime source is bundled directly in this skill package — no external git clone required. `npm install --ignore-scripts` fetches npm dependencies at install time; Playwright downloads browser binaries on first use.

## Quick start

1. Install skill:

```bash
clawhub install prospairrow-websites-mcp
```

2. Create a free Prospairrow account and API key:

- Go to `https://app.prospairrow.com`
- Choose **Sign in with Google**
- In dashboard settings, generate an API key
- Keep the key private (do not commit to git)

3. Install runtime from the bundled source:

```bash
bash ./skills/prospairrow-websites-mcp/scripts/install-runtime.sh
```

4. Add MCP server config to OpenClaw (snippet in `docs/CONFIGURATION.md`).

5. Start server:

```bash
cd "$HOME/.openclaw/runtime/websites-mcp"
PROSPAIRROW_API_KEY="..." npm run mcp:writes
```

6. Smoke test API auth:

```bash
curl -sS http://127.0.0.1:8799 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROSPAIRROW_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"websites.list_sites","params":{}}'
```

## Config key clarification

Two config namespaces are intentionally used:

- `skills.entries.mcporter...` for MCP server endpoint/routing
- `skills.entries.prospairrow-websites-mcp...` for Prospairrow credentials

## Auth precedence

1. Request headers (`Authorization` / `X-API-Key`)
2. OpenClaw skill dashboard/config (`skills.entries.prospairrow-websites-mcp.apiKey` or env mapping)
3. Process environment fallback (`PROSPAIRROW_API_KEY`)

## Docs

- `docs/INSTALL.md`
- `docs/CONFIGURATION.md`
- `docs/OPERATIONS.md`
- `docs/TROUBLESHOOTING.md`
