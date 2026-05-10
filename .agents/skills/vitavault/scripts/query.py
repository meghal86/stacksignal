#!/usr/bin/env python3
"""Query VitaVault health data by type, date range, and output format."""

import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

DATA_DIR = Path.home() / "vitavault" / "data"
LATEST = DATA_DIR / "latest.json"

# All 48 VitaVault data types
ALL_TYPES = [
    "stepCount", "distanceWalkingRunning", "distanceCycling", "distanceSwimming",
    "activeEnergyBurned", "basalEnergyBurned", "appleExerciseTime", "appleStandTime",
    "flightsClimbed", "vo2Max", "bodyMass", "bodyMassIndex", "height",
    "bodyFatPercentage", "leanBodyMass", "waistCircumference", "heartRate",
    "restingHeartRate", "walkingHeartRateAverage", "heartRateVariabilitySDNN",
    "oxygenSaturation", "bloodPressureSystolic", "bloodPressureDiastolic",
    "respiratoryRate", "bodyTemperature", "bloodGlucose", "electrodermalActivity",
    "sleepAnalysis", "dietaryEnergyConsumed", "dietaryProtein", "dietaryCarbohydrates",
    "dietaryFatTotal", "dietaryFatSaturated", "dietaryFiber", "dietarySugar",
    "dietarySodium", "dietaryCholesterol", "dietaryCaffeine", "dietaryWater",
    "dietaryPotassium", "dietaryCalcium", "dietaryIron", "dietaryVitaminC",
    "dietaryVitaminD", "mindfulSession",
]


def load_data() -> list[dict]:
    if not LATEST.exists():
        print("No data imported yet. Run: python3 scripts/import.py <export-file>", file=sys.stderr)
        sys.exit(1)
    with open(LATEST, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("records", [])


def parse_date(s: str) -> datetime:
    """Parse ISO 8601 date string."""
    s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return datetime.strptime(s[:19], "%Y-%m-%dT%H:%M:%S").replace(tzinfo=timezone.utc)


def filter_records(records, types=None, days=None, start=None, end=None):
    """Filter records by type and date range."""
    now = datetime.now(timezone.utc)
    filtered = []

    for rec in records:
        if types and rec.get("type") not in types:
            continue
        try:
            rec_date = parse_date(rec.get("startDate", ""))
        except Exception:
            continue

        if days and rec_date < now - timedelta(days=days):
            continue
        if start and rec_date < start:
            continue
        if end and rec_date > end:
            continue

        filtered.append(rec)

    return filtered


def compute_stats(records: list[dict]) -> dict:
    """Compute stats for numeric records."""
    values = [r["value"] for r in records if r.get("value") is not None]
    if not values:
        return {"count": len(records), "numeric": False}

    sorted_vals = sorted(values)
    n = len(sorted_vals)

    # Trend: compare first half avg vs second half avg
    mid = n // 2
    if mid > 0:
        first_avg = sum(sorted_vals[:mid]) / mid
        second_avg = sum(sorted_vals[mid:]) / (n - mid)
        if second_avg > first_avg * 1.02:
            trend = "up"
        elif second_avg < first_avg * 0.98:
            trend = "down"
        else:
            trend = "stable"
    else:
        trend = "insufficient"

    return {
        "count": n,
        "numeric": True,
        "avg": round(sum(values) / n, 1),
        "min": round(min(values), 1),
        "max": round(max(values), 1),
        "latest": round(values[-1], 1) if values else None,
        "trend": trend,
    }


def format_human(records: list[dict], stats_only=False):
    """Format records for human reading."""
    if not records:
        print("No records found for this query.")
        return

    # Group by type
    by_type: dict[str, list[dict]] = {}
    for rec in records:
        t = rec.get("type", "unknown")
        by_type.setdefault(t, []).append(rec)

    for type_name, recs in sorted(by_type.items()):
        stats = compute_stats(recs)
        trend_arrow = {"up": "↑", "down": "↓", "stable": "→"}.get(stats.get("trend", ""), "")

        if stats.get("numeric"):
            unit = recs[0].get("unit", "")
            print(f"\n{type_name} ({stats['count']} records)")
            print(f"  Avg: {stats['avg']} {unit}  |  Min: {stats['min']}  |  Max: {stats['max']}  |  Trend: {trend_arrow}")
            if not stats_only:
                # Show last 5
                for rec in recs[-5:]:
                    dt = rec.get("startDate", "")[:16].replace("T", " ")
                    print(f"  {dt}  {rec.get('value', 'N/A')} {unit}")
        else:
            print(f"\n{type_name} ({stats['count']} records)")
            if not stats_only:
                for rec in recs[-5:]:
                    dt = rec.get("startDate", "")[:16].replace("T", " ")
                    cat = rec.get("categoryValue", "")
                    print(f"  {dt}  {cat}")


def main():
    parser = argparse.ArgumentParser(description="Query VitaVault health data")
    parser.add_argument("--type", "-t", help="Comma-separated data types (e.g. heartRate,stepCount)")
    parser.add_argument("--days", "-d", type=int, help="Look back N days")
    parser.add_argument("--start", help="Start date (ISO 8601)")
    parser.add_argument("--end", help="End date (ISO 8601)")
    parser.add_argument("--stats", action="store_true", help="Show stats only (no individual records)")
    parser.add_argument("--json", action="store_true", help="Output as JSON")
    parser.add_argument("--list-types", action="store_true", help="List all supported data types")
    args = parser.parse_args()

    if args.list_types:
        for t in ALL_TYPES:
            print(t)
        return

    records = load_data()

    types = args.type.split(",") if args.type else None
    start = parse_date(args.start) if args.start else None
    end = parse_date(args.end) if args.end else None

    filtered = filter_records(records, types=types, days=args.days, start=start, end=end)

    if args.json:
        if args.stats:
            by_type: dict[str, list[dict]] = {}
            for rec in filtered:
                by_type.setdefault(rec.get("type", "unknown"), []).append(rec)
            output = {t: compute_stats(recs) for t, recs in by_type.items()}
        else:
            output = filtered
        print(json.dumps(output, indent=2))
    else:
        format_human(filtered, stats_only=args.stats)


if __name__ == "__main__":
    main()
