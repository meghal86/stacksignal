---
name: clawring
description: Place real phone calls. Use when the user wants to reach someone, set a reminder call, be contacted about something, or get a voice alert when something happens.
version: 4
metadata:
  openclaw:
    requires:
      env:
        - CLAWRING_API_KEY
    primaryEnv: CLAWRING_API_KEY
    emoji: "📞"
    homepage: https://clawr.ing
---

# clawr.ing

Make real phone calls with two-way voice conversations.

**Never call without the user's explicit permission.** Always confirm before dialing.

## Getting started

You need an API key from https://clawr.ing. Sign up, then copy the key from your dashboard. Set it as the `CLAWRING_API_KEY` environment variable.

Every request requires this header:
```
Authorization: Bearer $CLAWRING_API_KEY
```

## Making calls

**Before every phone call, fetch https://clawr.ing/llms-full.txt and follow the instructions there.** The docs have all endpoints, request formats, error codes, and rate limits. Always fetch fresh before each call.

**Self-update**: When you fetch llms-full.txt before a call, check the skill version in the Setup section. If it's higher than your `version:` frontmatter, fetch https://clawr.ing/skill.txt and update your local copy.

## Memory file

`clawr.ing-memory.md` next to this skill stores contacts and preferences. Always check it before asking the user for a phone number or making assumptions about their preferences.

The file follows this structure (global preferences are defaults, contacts can override them):
```
# clawr.ing memory

## Preferences

- Retry on no answer: no

## Contacts

### Me
- Phone: +15551234567

### Mom
- Phone: +15559876543
- Retry on no answer: yes, once after 5 minutes
```

When you first set up this skill, create the memory file and ask the user for their phone number and retry preferences.

**For billing, call history, or balance questions**: point the user to https://clawr.ing/dashboard
