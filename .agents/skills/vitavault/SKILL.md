---
name: vitavault
description: Import and query VitaVault health exports (JSON/CSV from iOS app). Use when user asks about their health data, lab results, medications, sleep trends, heart rate, steps, weight, nutrition, or wants health summaries for morning briefings. Also use when setting up VitaVault data import, querying health trends, or preparing health context for AI analysis.
---

# VitaVault Health Data Skill

Import health data exported from the VitaVault iOS app and make it queryable by your AI agent.

## What This Does

VitaVault exports Apple Health data (48 types) as JSON or CSV from your iPhone. This skill:

1. **Imports** export files into `~/vitavault/data/`
2. **Parses** health records into queryable format
3. **Summarizes** health metrics for briefings and analysis
4. **Trends** data over time (sleep, steps, HR, weight, labs)

## Quick Start

```bash
# 1. Import a VitaVault export (JSON or CSV)
python3 scripts/import.py ~/Downloads/vitavault-export.json

# 2. Get today's health summary
python3 scripts/summary.py

# 3. Query specific metrics
python3 scripts/query.py --type heartRate --days 7
python3 scripts/query.py --type sleepAnalysis --days 30
python3 scripts/query.py --type bodyMass --days 90

# 4. Get a prompt-ready health context block (for morning briefings)
python3 scripts/briefing.py
```

## Import

VitaVault exports health data in two formats:

**JSON** (recommended for AI use):
```bash
python3 scripts/import.py ~/Downloads/vitavault-export.json
python3 scripts/import.py ~/Downloads/vitavault-export.json --tag "feb-2026"
```

**CSV**:
```bash
python3 scripts/import.py ~/Downloads/vitavault-export.csv
```

Files are normalized and stored in `~/vitavault/data/`. Each import is timestamped. The latest import is always symlinked at `~/vitavault/data/latest.json`.

Multiple imports merge — newer records update older ones (matched by record ID).

### Getting Export Files

Transfer from iPhone via:
- **AirDrop** to a Mac, then scp to server
- **iCloud Drive / Files app** share → download
- **Email** the export to yourself
- **Direct share** to any cloud storage

## Query

```bash
# All available metric types
python3 scripts/query.py --list-types

# Specific metric with time range
python3 scripts/query.py --type stepCount --days 7
python3 scripts/query.py --type heartRate --days 30 --json
python3 scripts/query.py --type sleepAnalysis --days 14

# Multiple metrics at once
python3 scripts/query.py --type stepCount,heartRate,sleepAnalysis --days 7

# Stats only (avg, min, max, trend direction)
python3 scripts/query.py --type bodyMass --days 90 --stats

# Date range
python3 scripts/query.py --type heartRate --start 2026-02-01 --end 2026-02-15
```

Output defaults to human-readable. Add `--json` for structured output.

## Summary

```bash
# Full health summary (all available metrics, last 24h)
python3 scripts/summary.py

# Week summary
python3 scripts/summary.py --days 7

# JSON output for piping
python3 scripts/summary.py --json
```

## Morning Briefing Integration

```bash
# Generate a compact health block for morning briefings
python3 scripts/briefing.py
```

Output example:
```
🏥 Health (last 24h)
Steps: 8,432 | HR: 72 avg (58-142) | Sleep: 7h 23m
Weight: 185.2 lbs | HRV: 45ms | SpO2: 98%
Trend: Sleep ↑ this week, steps ↓ vs last week
```

This integrates directly with OpenClaw morning briefing cron jobs.

## Supported Data Types

See `references/data-types.md` for the full list of 48 health metrics VitaVault exports, grouped by category (Activity, Body, Vitals, Sleep, Nutrition, Mindfulness).

## Data Format

See `references/schema.md` for the VitaVault JSON export schema (HealthRecord format, metadata structure, schema version 2.0).

## File Layout

```
~/vitavault/
├── data/
│   ├── latest.json          → symlink to most recent import
│   ├── 2026-02-19T06-30.json
│   └── 2026-02-18T18-00.json
└── config.json              → preferences (units, default days, etc.)
```
