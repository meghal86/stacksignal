---
name: cdp-browser
description: CDP browser control at localhost:9222. Use when you need to inspect tabs, take screenshots, navigate, scroll, post to X, or run JS in a persistent browser session (e.g. logged into X, Gmail).
---

# cdp-browser

CLI for Chrome/Chromium at localhost:9222. Inspect tabs, take screenshots, navigate, scroll, post to X, or run JS in a persistent browser session.

**Prerequisites:** Chromium running with `--remote-debugging-port=9222`. Docker Compose or a local Chrome with remote debugging enabled.

## Commands

Run from the skill dir (`bin/` scripts):

| Command | Description |
|---------|-------------|
| `status` | List all tabs (JSON from CDP) |
| `tabs` | Same as status |
| `new <url>` | Open new tab |
| `goto <tabId> <url>` | Navigate tab to URL |
| `snapshot <tabId>` | Full-page screenshot (PNG) |
| `close-popup <tabId>` | Dismiss dialogs/modals |
| `scroll <tabId> <px\|sel> [down\|up]` | Scroll by pixels or selector |
| `tweet <tabId> "text"` | Post tweet (tab must be on X) |
| `eval <tabId> "js"` | Run JS in tab, return result |

## Scripts

- **cdp.js** — curl/fetch wrapper for CDP HTTP API (`/json`, `/json/list`, `/json/new`)
- **pw.js** — Playwright connect to browser, runs snapshot/goto/scroll/tweet/eval

## Security

See [SECURITY.md](SECURITY.md) for mitigations and operational notes.

**Source:** https://github.com/gostlightai/cdp-browser
