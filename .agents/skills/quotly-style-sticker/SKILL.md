---
name: quotly-style-sticker
description: Generate QuotLy-style stickers from OpenClaw context and return MEDIA for auto-send. Use for single or multi-message quote cards (multiple forwarded messages merged into one sticker).
---

# QuotLy Style Sticker

## Human Guide

OpenClaw usage:

1. Enable `quotly-style-sticker` in OpenClaw.
2. Forward one or multiple Telegram messages to OpenClaw.
3. Trigger with a prompt such as `Use $quotly-style-sticker to generate a quote sticker`.
4. OpenClaw sends back the generated sticker automatically.

Local usage:

- `python scripts/openclaw_quote_autoreply.py --input <openclaw-input.json>`
- `echo '<json>' | python scripts/openclaw_quote_autoreply.py --input -`
- `python scripts/openclaw_quote_autoreply.py --input scripts/input.sample.json`

Output contract:

- `Quote sticker generated.`
- `MEDIA:<absolute-path-to-webp>`

Each request writes a unique temp file path.
If `messages` has multiple entries, all entries are rendered into one sticker.

## Skills Config (Human)

Configure env vars in `openclaw.json` via `skills.entries.<skill>.env`:

```json
{
  "skills": {
    "entries": {
      "quotly-style-sticker": {
        "env": {
          "QUOTLY_DISABLE_TELEGRAM_AVATAR_LOOKUP": "true",
          "QUOTLY_DISABLE_REMOTE_AVATAR_URL": "true",
          "QUOTLY_AVATAR_ALLOW_HOSTS": "cdn.telegram.org,images.example.com",
          "QUOTLY_MAX_AVATAR_BYTES": "1048576",
          "TG_BOT_TOKEN": "<optional for Telegram avatar lookup>"
        }
      }
    }
  }
}
```

Sandbox note:

- `skills.entries.<skill>.env` applies to host runs.
- For sandboxed runs, provide env vars in sandbox docker env config.

## Agent Contract

Entry command:

- `python scripts/openclaw_quote_autoreply.py --input <json-file-or->`

### Input Model

```json
{
  "messages": [
    {
      "message": {
        "text": "...",
        "forward": {
          "sender": { "id": 1, "name": "User A" },
          "text": "Forward text A"
        }
      }
    },
    {
      "message": {
        "text": "...",
        "forward": {
          "sender": { "id": 2, "name": "User B" },
          "text": "Forward text B"
        }
      }
    }
  ],
  "context": { "event": { "channel": "telegram", "rawPayload": {} } }
}
```

Single-message fallback is supported when `messages` is absent:

- `context.message`
- or root-level message-like fields (`text`, `sender`, `forward`, ...)

Override fields:

- Global fallback: `quote_text`, `original_text`, `source_id`, `source_name`, `source_status_emoji`, `source_status_emoji_id`, `source_avatar_url`
- Per-message override: same keys inside each message item

Resolution rules:

1. Source identity: per-item `source_*` > global `source_*` > `message.forward.*` > `rawPayload` > `message.sender`.
2. Quote text: per-item `quote_text` > global `quote_text` > message text > forwarded text > per-item/global `original_text`.
3. Name fields sent to renderer: `first_name`/`last_name`; status uses `emoji_status` when status id is available.

### Output Model

- Must print one `MEDIA:` line with absolute path to generated `.webp`.
- Non-fatal avatar issues should continue without avatar.

## Avatar -> Renderer Path (Security)

How avatar is passed to lyo:

1. If message already has avatar URL, script sanitizes it and may pass sanitized HTTPS URL.
2. If avatar is missing and Telegram lookup is enabled, script calls Telegram API, downloads avatar bytes, and sends `data:image/...;base64,...` inline data URL. Telegram lookup is disabled by default.
3. Script never sends `https://api.telegram.org/file/bot<token>/...` to renderer.

Avatar safety rules before sending to renderer:

- Reject non-HTTPS remote URLs.
- Reject URLs with embedded credentials.
- Reject internal/private/loopback hosts.
- Reject URLs with sensitive query keys (`token`, `sig`, `auth`, `x-amz`, `x-goog`, etc).
- Enforce max avatar size for inline data URLs (`QUOTLY_MAX_AVATAR_BYTES`).

## Runtime & Network

Required env vars:

- none

Optional env vars:

- `TG_BOT_TOKEN` or `TELEGRAM_BOT_TOKEN` (Telegram avatar lookup only)
- `QUOTLY_DISABLE_TELEGRAM_AVATAR_LOOKUP` (default `true`)
- `QUOTLY_DISABLE_REMOTE_AVATAR_URL` (default `true`)
- `QUOTLY_AVATAR_ALLOW_HOSTS` (default empty)
- `QUOTLY_MAX_AVATAR_BYTES` (default `1048576`)

External endpoint:

- default renderer: `https://bot.lyo.su/quote/generate`
- fallback renderer URL: `https://bot.lyo.su/quote/generate.webp`
- override: `--api <your-endpoint>`
