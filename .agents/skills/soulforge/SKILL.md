---
name: soulforge
description: "Dispatch multi-step coding workflows to Claude Code CLI or Codex CLI from YAML definitions via a persistent background daemon. Use when: (1) implementing a feature end-to-end, (2) running bugfix workflows with human checkpoints, (3) delegating coding tasks in the background, (4) managing custom workflows (list/show/create). Requires @ghostwater/soulforge."
repository: "https://github.com/ghostwater-ai/soulforge"
metadata:
  {
    "openclaw":
      {
        "emoji": "🔥",
        "requires":
          {
            "bins": ["soulforge", "gh"],
            "env": ["GITHUB_TOKEN or gh auth login"],
            "optional_bins": ["claude", "codex"],
          },
        "install":
          [
            {
              "id": "npm",
              "kind": "npm",
              "package": "@ghostwater/soulforge",
              "global": true,
              "bins": ["soulforge"],
              "label": "Install Soulforge CLI (npm)",
            },
          ],
      },
  }
---

# Soulforge

Daemon-based workflow engine for coding workflows with optional human checkpoints.

## Key Updates (current behavior)

- `--workdir` is required for `soulforge run`.
- Built-in workflows: `feature-dev`, `bugfix`.
- Custom workflow management is available via:
  - `soulforge workflow list`
  - `soulforge workflow show <name>`
  - `soulforge workflow create <name> [--from <template>] [--force]`
- Workflow resolution supports built-ins + custom workflows + path fallback.
- Structured-output steps use schema-driven completion (`soulforge complete`) with runner-injected completion instructions.
- Legacy `expects` text gating is deprecated/removed from runtime behavior.
- Bugfix PR step prompt is idempotent (reuse existing PR if present before create).

## Quick Start

```bash
npm install -g @ghostwater/soulforge
soulforge daemon start
```

## Run a Workflow

```bash
soulforge run feature-dev "Implement issue #123" --workdir /path/to/repo
```

Common options:

```bash
--executor codex-cli|claude-code
--model <model-name>
--callback-url <url>
--callback-exec '<shell command>'
--no-callback
```

## Checkpoints

```bash
soulforge status
soulforge approve <run-id>
soulforge reject <run-id> --reason "..."
```

## Custom Workflows

```bash
soulforge workflow list
soulforge workflow show feature-dev
soulforge workflow create my-workflow --from feature-dev
```

Custom workflows live in `~/.soulforge/workflows/`.

## Structured Completion Contract

For structured steps, Soulforge injects completion instructions that require:

```bash
soulforge complete --run-id <id> --step-id <id> --data '<json>'
```

`<json>` must satisfy the step `output_schema`.

## Monitoring & Lifecycle

```bash
soulforge status [query]
soulforge runs
soulforge events --run <id>
soulforge logs 100

soulforge cancel <run-id>
soulforge resume <run-id>

soulforge daemon start
soulforge daemon stop
soulforge daemon status
```

## Security / External Effects

- Coding executors may send repository content to model providers.
- `gh` is used for PR operations.
- Callback endpoints receive run/step metadata you configure.

Only run on repos/endpoints you trust.

## References

- Workflow format: [references/workflow-format.md](references/workflow-format.md)
