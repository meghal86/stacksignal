---
title: Use resolveModel for Provider-Agnostic Models
impact: HIGH
impactDescription: hardcoded model names break when switching providers
tags: architecture, model, resolution, provider-agnostic
---

## Use resolveModel for Provider-Agnostic Models

Use `resolveModel` to abstract model selection from specific provider implementations. This allows swapping between OpenAI, Anthropic, or other providers without changing agent code.

**Incorrect (hardcoded provider-specific model):**

```typescript
const agent = new BuiltInAgent({
  name: "writer",
  model: "gpt-4o",
})
```

**Correct (provider-agnostic model resolution):**

```typescript
import { resolveModel } from "@copilotkit/runtime"

const agent = new BuiltInAgent({
  name: "writer",
  model: resolveModel({
    default: "gpt-4o",
    mapping: {
      fast: "gpt-4o-mini",
      powerful: "gpt-4o",
      anthropic: "claude-sonnet-4-20250514",
    },
  }),
})
```

Reference: [Model Configuration](https://docs.copilotkit.ai/reference/runtime/models)
