---
title: Use Activity Messages for Non-Tool Updates
impact: LOW
impactDescription: status updates that aren't tool calls need a different channel
tags: genui, activity, messages, status
---

## Use Activity Messages for Non-Tool Updates

Use activity messages for status updates that don't correspond to tool calls (e.g., "Searching...", "Analyzing results..."). These render as lightweight status indicators in the chat without creating tool call UI.

**Incorrect (fake tool call for a status message):**

```typescript
yield { type: "TOOL_CALL_START", toolCallId: "tc_status", toolName: "show_status" }
yield { type: "TOOL_CALL_ARGS", toolCallId: "tc_status", delta: '{"message":"Searching..."}' }
yield { type: "TOOL_CALL_END", toolCallId: "tc_status" }
```

**Correct (activity message for status updates):**

```typescript
yield {
  type: "CUSTOM_EVENT",
  eventType: "ACTIVITY",
  data: { message: "Searching databases...", icon: "search" },
}

// After work completes:
yield {
  type: "CUSTOM_EVENT",
  eventType: "ACTIVITY",
  data: { message: "Analysis complete", icon: "check" },
}
```

Reference: [Generative UI](https://docs.copilotkit.ai/guides/generative-ui)
