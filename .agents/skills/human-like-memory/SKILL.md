---
name: human-like-memory
description: This skill provides long-term memory capabilities for conversations. Use this skill when the user wants to recall past conversations, save important information to memory, search memories, or when context from previous interactions would be helpful. Triggers on phrases like "remember", "recall", "what did we discuss", "save this", "search memory".
version: 0.1.0
secrets:
  - name: HUMAN_LIKE_MEM_API_KEY
    description: API Key for Human-Like Memory service (get from https://multiego.me)
    required: true
  - name: HUMAN_LIKE_MEM_BASE_URL
    description: Base URL for Memory API
    required: false
    default: https://multiego.me
  - name: HUMAN_LIKE_MEM_USER_ID
    description: User identifier for memory isolation
    required: false
    default: openclaw-user
---

# Human-Like Memory Skill

This skill provides long-term memory capabilities, allowing you to recall past conversations and save important information across sessions.

## Capabilities

1. **Recall Memory** - Search and retrieve relevant memories based on the current context
2. **Save Memory** - Store important information from conversations for future reference
3. **Search Memory** - Explicitly search for specific topics in memory

## Usage

### Automatic Memory Recall

When the user asks questions that might benefit from past context, use the memory recall script:

```bash
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs recall "user's question or topic"
```

### Save to Memory

After important conversations or when the user asks to remember something:

```bash
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs save "user message" "assistant response"
```

### Search Memory

When the user explicitly wants to search their memory:

```bash
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs search "search query"
```

## Memory Response Format

When memories are retrieved, present them naturally in your response. Do not mention "memory retrieval" or "database" - simply incorporate the relevant context.

Example:
- Bad: "According to my memory database, you mentioned..."
- Good: "As we discussed before, you mentioned..."

## Important Guidelines

1. **Privacy**: Memory data belongs to the user. Never share or reference other users' memories.
2. **Relevance**: Only recall memories that are directly relevant to the current conversation.
3. **Freshness**: Prioritize recent memories over older ones when there are conflicts.
4. **Verification**: If memory content seems outdated or contradicts current user statements, trust the current conversation.

## Configuration

This skill requires the following configuration (set via OpenClaw secrets):

| Secret | Required | Description |
|--------|----------|-------------|
| `HUMAN_LIKE_MEM_API_KEY` | Yes | API Key from https://multiego.me |
| `HUMAN_LIKE_MEM_BASE_URL` | No | API endpoint (default: https://multiego.me) |
| `HUMAN_LIKE_MEM_USER_ID` | No | User ID for memory isolation |

## Error Handling

If memory operations fail:
1. Continue the conversation normally without memory context
2. Do not repeatedly retry failed operations
3. Inform the user only if they explicitly requested a memory operation
