---
name: claude-relay
description: Relay operator for Claude Code via tmux across multiple projects. Start/continue persistent Claude Code terminal sessions, send prompts, read output, and manage background sessions by project name or path.
metadata: {"openclaw":{"emoji":"🔄","requires":{"bins":["tmux","claude"]}}}
---

# Claude Relay

Operate Claude Code as a persistent terminal copilot through tmux.

## Use this skill for

- Starting a Claude Code session in a project directory
- Sending prompts to a running Claude session
- Reading Claude's output (tail)
- Managing multiple concurrent project sessions

## Script

Use `scripts/relay.sh` for all actions. Prefer script actions over ad-hoc shell so behavior stays deterministic.

## Project resolution rules

The script resolves project in this order:

1. Absolute path (if exists)
2. Alias from `projects.map` in the skill folder (`name=/abs/path`)
3. `$CLAUDE_RELAY_ROOT/<name>` exact match
4. Find under `$CLAUDE_RELAY_ROOT` (`maxdepth=2`) by folder name
5. If omitted, re-use last project

If multiple matches are found, ask user to disambiguate.

## Standard workflow

1. Start or reuse session for target project:
   - `scripts/relay.sh start <project-or-path>`
2. Send user instruction:
   - `scripts/relay.sh send <project-or-path> "<instruction>"`
3. Read output:
   - `scripts/relay.sh tail <project-or-path> [lines]`
4. Repeat send/tail loop.
5. Stop when asked:
   - `scripts/relay.sh stop <project-or-path>`

## Session naming

- Session name is deterministic: `cc_<project_basename_sanitized>`
- One project ↔ one tmux session

## Quick commands

```bash
scripts/relay.sh start myproject
scripts/relay.sh send myproject "fix the failing tests"
scripts/relay.sh tail myproject 80
scripts/relay.sh status
scripts/relay.sh stop myproject
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_RELAY_ROOT` | `$HOME/projects` | Root directory for project discovery |
| `CLAUDE_RELAY_MAP` | `<skill-dir>/projects.map` | Path to project alias map file |
| `CLAUDE_BIN` | `claude` (from PATH) | Path to Claude Code CLI binary |
| `RELAY_WAIT` | `6` | Seconds to wait after send before tailing output |

## Setup

1. Install this skill
2. Create a `projects.map` file in the skill directory (see `projects.map.example`)
3. Ensure `tmux` and `claude` are installed and in your PATH

## Notes

- This skill is transport-focused (relay/orchestration), not deep code reasoning.
- For heavy design/review, switch to a stronger model before synthesis.
