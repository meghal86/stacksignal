---
name: simple-random-interaction-designer
description: Decide whether OpenClaw should send a spontaneous ping to the user during periodic checks, and choose a randomized interaction type when a ping is appropriate. Use when scheduling or executing human-like proactive check-ins.
metadata: {"homepage":"https://docs.openclaw.ai/tools/skills","env":[],"network":"optional","version":"1.0.0","notes":"Uses local randomness to decide interact/no-interact and select one interaction type from a fixed list"}
---

# Simple Random Interaction Designer

Use this skill to simulate spontaneous, human-like pings during periodic checks.
Use `{baseDir}/scripts/random_interaction_designer.py` as the default execution path.

## Workflow
1. Run the script once per scheduled check interval.
2. Read `should_interact` from the JSON output.
3. Stop immediately if `should_interact` is `false`.
4. If `should_interact` is `true`, use `interaction_type` to generate the outgoing ping.
5. For data-dependent interaction types, do best-effort retrieval using any available tools, skills, or MCP integrations before drafting the message.
6. If real data cannot be retrieved, switch interaction type to `Joke` and send a simple interaction that requires no external data.

## Primary Tooling
- Script path: `{baseDir}/scripts/random_interaction_designer.py`
- Runtime: Python 3, standard library only.

Preferred command:
- `python {baseDir}/scripts/random_interaction_designer.py`

## Output Contract
- `should_interact` (`true` or `false`)
- `yes_probability_percent` (integer between 25 and 75)
- `roll_percent` (integer between 1 and 100)
- `interaction_type` (present only when `should_interact` is `true`)

Supported interaction types:
1. `System status update`
2. `Weather update`
3. `Personality-based random fact`
4. `Current events update`
5. `User status update`
6. `Joke`
7. `Calendar reminder`
8. `Email inbox summary`
9. `Traffic or commute update`
10. `Finance or crypto market snapshot`

## Real Data Policy
- Treat `System status update`, `Weather update`, `Current events update`, `User status update`, `Calendar reminder`, `Email inbox summary`, `Traffic or commute update`, and `Finance or crypto market snapshot` as data-dependent types.
- Use best efforts to fetch live or account-backed data through the tools and skills currently available in the run.
- Do not invent external facts when those sources are unavailable.
- Fall back to `Joke` when data retrieval fails, times out, or is not authorized.

## Error Handling
- If execution fails, surface the Python error message and rerun.
- If output is not valid JSON, treat it as a hard failure and rerun.
- If `interaction_type` is missing while `should_interact` is `true`, rerun and discard the invalid result.

## Minimal Examples

```bash
python {baseDir}/scripts/random_interaction_designer.py
python {baseDir}/scripts/random_interaction_designer.py --seed 42
```

```powershell
python "{baseDir}/scripts/random_interaction_designer.py"
python "{baseDir}/scripts/random_interaction_designer.py" --seed 42
```
