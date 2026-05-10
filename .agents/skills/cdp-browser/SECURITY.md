# Security Considerations

## Implemented Protections

| Risk | Mitigation |
|------|------------|
| **Scroll selector injection** | `page.evaluate((sel) => ..., target)` passes selector as parameter—no string interpolation into JS |
| **Snapshot path traversal** | `tabId` sanitized to `[A-Za-z0-9_-]`; output path uses `path.join(__dirname, ...)` |
| **cdp.js command injection** | Payloads built with `JSON.stringify`; single quotes escaped for shell |
| **bin/new URL injection** | JSON built via `node -e "JSON.stringify(...)"` instead of string interpolation |
| **cdp.js gotoTab** | `tabId` sanitized before use in URL path |

## Intentional Behavior

- **eval** — Runs arbitrary JS in the page context. By design for automation; caller is trusted.
- **localhost:9222** — CDP binds local only; no remote exposure by default.

## Operational Notes

- CDP on port 9222 has full browser control; keep it local or behind auth.
- **tweet** posts to X using the logged-in session; the agent can post on behalf of the user.
- Screenshots may capture sensitive page content; store in a private location.
