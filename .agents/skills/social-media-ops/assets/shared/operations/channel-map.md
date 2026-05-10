# Channel Map

_Platform channel routing for this instance. Updated by instance-setup and brand-manager skills._

## Current Setup

- **Platform:** _(set during instance-setup)_
- **Mode:** _(set during instance-setup)_
- **Chat ID:** _(auto-detected during setup)_

## System Channels

| Channel | Thread ID | Purpose |
|---------|-----------|---------|
| General | _(none)_ | Cross-brand chat, catch-all |
| Operations | _(auto-created during setup)_ | Schedules, reminders, system notifications |

## Brand Channels

_Brand channels are managed by brand-manager. Topics are auto-created by `scripts/telegram-topics.js`._

| Brand ID | Display Name | Thread ID |
|----------|-------------|-----------|

## Routing Rules

- **Brand content** → brand's channel/topic
- **Brand research** → brand's channel/topic
- **Cross-brand** → General
- **Scheduling / cron notifications** → Operations
- **Ambiguous messages** → General

## Mode Reference

| Mode | Description | Brand Isolation | Topic Creation |
|------|-------------|----------------|----------------|
| DM+Topics | Private chat with forum mode (recommended) | Per-brand topic in DM | Auto via `telegram-topics.js` |
| Group+Topics | Supergroup with forum mode | Per-brand topic in group | Auto via `telegram-topics.js` |
| DM-simple | Private chat, no topics | Context-based | N/A |
| Group-simple | Group chat, no topics | Context-based | N/A |

## Address Format

_Format: `chatId:threadId` (e.g., `-100XXXXXXXXXX:3`)_

### DM+Topics Example

```
Platform: Telegram
Mode: DM+Topics
Chat ID: 247461878

| Channel    | Thread ID | Address          |
|------------|-----------|------------------|
| General    | (none)    | 247461878        |
| Operations | 7         | 247461878:7      |
| skincare   | 3         | 247461878:3      |
| salon      | 4         | 247461878:4      |
```

### Group+Topics Example

```
Platform: Telegram
Mode: Group+Topics
Chat ID: -1003738115155

| Channel    | Thread ID | Address              |
|------------|-----------|----------------------|
| General    | (none)    | -1003738115155       |
| Operations | 7         | -1003738115155:7     |
| skincare   | 3         | -1003738115155:3     |
| salon      | 4         | -1003738115155:4     |
```
