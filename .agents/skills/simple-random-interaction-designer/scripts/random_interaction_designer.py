#!/usr/bin/env python3
"""Random interaction decision helper for OpenClaw periodic pings."""

from __future__ import annotations

import argparse
import json
import random
import sys
from typing import Dict, Optional

INTERACTION_TYPES = [
    "System status update",
    "Weather update",
    "Personality-based random fact",
    "Current events update",
    "User status update",
    "Joke",
    "Calendar reminder",
    "Email inbox summary",
    "Traffic or commute update",
    "Finance market snapshot",
]


def build_decision(rng: random.Random) -> Dict[str, object]:
    yes_probability_percent = rng.randint(25, 75)
    roll_percent = rng.randint(1, 100)
    should_interact = roll_percent <= yes_probability_percent

    decision: Dict[str, object] = {
        "should_interact": should_interact,
        "yes_probability_percent": yes_probability_percent,
        "roll_percent": roll_percent,
    }

    if should_interact:
        decision["interaction_type"] = rng.choice(INTERACTION_TYPES)

    return decision


def parse_args(argv: Optional[list[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Decide whether OpenClaw should send a spontaneous interaction."
    )
    parser.add_argument(
        "--seed",
        type=int,
        help="Optional deterministic random seed for repeatable results.",
    )
    return parser.parse_args(argv)


def main(argv: Optional[list[str]] = None) -> int:
    args = parse_args(argv)
    rng = random.Random(args.seed)
    decision = build_decision(rng)
    json.dump(decision, sys.stdout, ensure_ascii=True)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
