# TROUBLESHOOTING

## Skill installed but calls fail

- Verify server URL in `openclaw.json` points to the active runtime.
- Confirm listener exists on `127.0.0.1:8799`.

## PROSPAIRROW_API_KEY_NOT_SET

- Ensure API key is set in one of:
  1. request header
  2. `skills.entries.prospairrow-websites-mcp.apiKey`
  3. runtime env `PROSPAIRROW_API_KEY`

## CAPABILITY_DISABLED:WRITE

- Start runtime with write mode (`npm run mcp:writes`).

## Unknown taskId

- Verify task is registered in `site-registry.json` and runtime restarted.
