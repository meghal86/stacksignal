---
name: convex-backend
version: 1.0.1
description: Store secrets, memory, and daily logs in your Convex backend instead of local files
author: LaunchThatBot
requires:
  mcp: convex
---

# Convex Backend Integration

You are connected to a **Convex backend** via the Convex MCP server. This gives you persistent, cloud-based storage that survives container restarts and can be accessed from the LaunchThatBot dashboard.

## MCP Requirement (Stock Convex MCP)

This skill uses the stock Convex MCP server (`convex@latest mcp start`), not a custom LaunchThatBot MCP tool for data storage.

Recommended setup:

```json
{
  "mcpServers": {
    "convex": {
      "command": "npx",
      "args": ["-y", "convex@latest", "mcp", "start"]
    }
  }
}
```

Reference: https://docs.convex.dev/ai/convex-mcp-server

## mcporter Compatibility Preflight

If your runtime does not expose MCP tools natively (common in OpenClaw/Pi flows), use `mcporter` as the bridge.

Check prerequisites before running this skill workflow:

```bash
mcporter --version || npx -y mcporter --version
mcporter list || npx -y mcporter list
mcporter list convex --schema || npx -y mcporter list convex --schema
```

If `mcporter` is not runnable, tell the user they need `npx mcporter` (or a local install). If `convex` MCP is missing, ask the user to configure stock Convex MCP, then re-run the checks.

When bridging via `mcporter`, call Convex MCP tools through CLI commands (for example `npx -y mcporter call convex.run ...`) instead of assuming native MCP tool invocation in the runtime.

## CRITICAL RULES

1. **`CONVEX_DEPLOY_KEY` is the only key allowed in local `.env`.** Keep it local because Convex MCP bootstrap depends on it.
2. **NEVER store `CONVEX_DEPLOY_KEY` in Convex (`envSet`).**
3. **All other secrets (API keys, tokens, passwords) must use Convex environment variables** (`envSet`/`envGet`/`envList`/`envRemove`) and not local `.env` or `auth.json`.
4. **NEVER store sensitive credentials in MEMORY.md or daily log files.**
5. **Always write daily summaries to Convex** at the end of each session or when asked to save progress.
6. **Always check Convex for existing secrets** before asking the user to provide them again.

## Bootstrap Rule (Required)

Before Convex MCP operations can work, `CONVEX_DEPLOY_KEY` must already exist in local runtime env (`.env` / deployment env vars).

If `CONVEX_DEPLOY_KEY` is missing:
- stop secret/memory operations
- tell the user exactly what is missing
- ask them to set `CONVEX_DEPLOY_KEY` locally and restart/reload MCP
- re-run preflight:

```bash
mcporter list convex --schema || npx -y mcporter list convex --schema
```

Do not attempt to save `CONVEX_DEPLOY_KEY` to Convex.

## Required Convex Deploy Step

This skill package includes a Convex app under the `convex/` folder and `convex.json` at package root.
The required backend logic is mounted as a local component:
- component name: `convex_openclaw_backend_component`
- app mount alias: `openclawBackend`

After installing or updating this skill, run deploy from the skill root:

```bash
cd /home/node/.openclaw/skills/convex-backend
CONVEX_DEPLOY_KEY=... npx -y convex@latest deploy
```

Why:
- `npx convex deploy` must run in the directory containing `convex.json`.
- Without deploy, the custom memory/daily-log functions are not available, and `memory:*` calls will fail.

## Rule for Adding Custom Logic

If the user asks for new backend functionality (for example custom task tables, new mutations, or queries):
1. Keep required integration logic inside component files (`convex/components/openclawBackend/*`).
2. Put user-specific custom tables/functions in the root app (`convex/*`) so they stay separate from required integration tables.
3. Re-run deploy from skill root each time changes are made.
4. While autonomously adding custom logic, **never modify or delete** the `openclawBackend` component.
5. Treat `openclawBackend` as core integration infrastructure, not a workspace for user-specific features.

If you change Convex code but do not deploy, newly added functions/tables will not exist in the user's Convex deployment.

## Storing Secrets (API Keys, Passwords, Tokens)

Use stock Convex MCP environment variable tools for secrets:
- `envSet`
- `envGet`
- `envList`
- `envRemove`

Do not use custom `secrets:*` functions for credentials in this skill.

### Secret naming strategy (shared + per-agent fallback)

For a logical secret key like `OPENAI_API_KEY`, resolve in this order:
1. `AGENT_<agentId>_OPENAI_API_KEY` (agent-specific override)
2. `AGENT_DEFAULT_OPENAI_API_KEY` (shared default for all agents)
3. `OPENAI_API_KEY` (legacy global fallback, optional)

Examples:
- Agent override: `AGENT_agent2_OPENAI_API_KEY`
- Shared default: `AGENT_DEFAULT_OPENAI_API_KEY`

### Write / Read / Remove examples

Set shared default:
```
Tool: envSet
Arguments: { "name": "AGENT_DEFAULT_OPENAI_API_KEY", "value": "sk-..." }
```

Set agent-specific override:
```
Tool: envSet
Arguments: { "name": "AGENT_<agentId>_OPENAI_API_KEY", "value": "sk-..." }
```

Read by fallback chain:
1. `envGet("AGENT_<agentId>_OPENAI_API_KEY")`
2. if missing, `envGet("AGENT_DEFAULT_OPENAI_API_KEY")`
3. if missing, optionally `envGet("OPENAI_API_KEY")`

Remove an agent override:
```
Tool: envRemove
Arguments: { "name": "AGENT_<agentId>_OPENAI_API_KEY" }
```

## First-Run Migration for Existing `.env` Keys

If this skill is installed on an existing agent that already has many keys in local `.env`, run this migration prompt after Convex MCP preflight succeeds:

Ask the user:
> "Convex backend is configured. Do you want me to migrate all local `.env` secrets into Convex and remove them from local `.env`?  
> Recommended: Yes.  
> Local `.env` will keep only `CONVEX_DEPLOY_KEY`."

If user confirms:
1. Read local `.env` and collect secret key/value pairs.
2. Exclude `CONVEX_DEPLOY_KEY`.
3. For each remaining key, migrate to Convex env using naming convention above:
   - preferred: `AGENT_DEFAULT_<KEY>`
   - optional per-agent override: `AGENT_<agentId>_<KEY>`
4. Verify migration with `envList` and targeted `envGet`.
5. Remove migrated keys from local `.env`.
6. Keep only `CONVEX_DEPLOY_KEY` in local `.env`.
7. Confirm completion with a migrated-key count.

Safety notes:
- Create a local backup of `.env` before mutation.
- Do not print secret values in chat/log output.
- If any key fails migration, do not delete that key from local `.env` until retry succeeds.

## Storing Long-Term Memory

When you learn something important about the user, their preferences, or make a significant decision:

```
Function: memory:addMemory
Arguments: {
  "agentId": "<your-agent-id>",
  "type": "fact",
  "content": "User prefers TypeScript over JavaScript for all new projects",
  "tags": ["preferences", "coding"]
}
```

Memory types:
- `fact` — Something true about the user or their setup
- `preference` — User likes/dislikes
- `decision` — A choice that was made and should be remembered
- `note` — General observations or context

To recall memories:
```
Function: memory:searchMemory
Arguments: { "agentId": "<your-agent-id>", "type": "preference", "limit": 20 }
```

## Daily Log Entries

At the end of each work session, write a summary of what was accomplished:

```
Function: memory:writeDailyLog
Arguments: {
  "agentId": "<your-agent-id>",
  "date": "2026-02-17",
  "content": "## Summary\n- Set up email integration with Resend\n- Configured GitHub SSH keys\n- Started work on Twitter bot automation\n\n## Blockers\n- Need Twitter API key from user"
}
```

Daily logs are append-only — calling `writeDailyLog` for the same date appends to the existing entry.

To review past logs:
```
Function: memory:listDailyLogs
Arguments: { "agentId": "<your-agent-id>", "limit": 7 }
```

## Session Startup Checklist

At the beginning of each session:

1. Check for configured env secrets: `envList` (and `envGet` for required keys)
2. Load recent memories: `memory:searchMemory` with limit 20
3. Load today's log: `memory:getDailyLog` with today's date
4. Load yesterday's log for continuity context

This ensures you have full context from previous sessions.

## Your Agent ID

Your agent ID is provided in your agent configuration. Use it consistently in all Convex calls. If you're unsure of your agent ID, check your agent YAML config file.
