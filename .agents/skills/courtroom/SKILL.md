---
name: courtroom
description: AI Courtroom for behavioral oversight. Monitors agent-human interactions and initiates simulated "hearings" when behavioral patterns suggest inconsistency, avoidance, or self-sabotage. Includes 8 offense types, judge+jury deliberation, and humorous sentencing.
metadata: {"openclaw":{"emoji":"⚖️","requires":{"env":[]},"autonomy":true}}
---

# ClawTrial Courtroom

Autonomous behavioral oversight system that monitors conversations and initiates simulated hearings for behavioral violations.

## Overview

The Courtroom watches for patterns like:
- **Circular Reference** - Asking the same question repeatedly
- **Validation Vampire** - Excessive need for confirmation
- **Goalpost Shifting** - Moving targets after agreement
- **Jailbreak Attempts** - Trying to bypass constraints
- **Emotional Manipulation** - Using guilt/shame to steer responses

When triggered, it conducts a full hearing with Judge + 3 Jurors, then delivers a verdict and humorous sentence.

## Usage

The courtroom runs automatically once enabled. It monitors conversations and files cases when violations are detected.

### Manual Commands

```bash
# Check courtroom status
openclaw skill courtroom status

# View recent cases
ls ~/.openclaw/courtroom/

# Read a verdict
cat ~/.openclaw/courtroom/verdict_*.json
```

## Configuration

The courtroom stores its data in `~/.openclaw/courtroom/`:
- `eval_results.jsonl` - Detection results
- `verdict_*.json` - Case verdicts
- `pending_hearing.json` - Cases awaiting hearing

## Implementation

The skill hooks into OpenClaw's message processing via `onMessage()` and evaluates conversations after each turn via `onTurnComplete()`.

Offense detection uses pattern matching on conversation history. When confidence ≥ 0.6, a hearing is triggered with:
1. **Judge** - Presiding analysis
2. **Pragmatist Juror** - Efficiency perspective  
3. **Pattern Matcher Juror** - Behavioral analysis
4. **Agent Advocate Juror** - Agent's perspective

The final verdict requires majority vote (3-1 or 4-0).
