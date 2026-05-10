#!/usr/bin/env python3
"""
session-guard: Active session size enforcer.
Monitors the main session file size and triggers a gateway restart when
it exceeds the threshold AND the session has been idle long enough.

Usage (run as isolated cron agent task):
  python3 size_watcher.py
  python3 size_watcher.py --warn-mb 3 --crit-mb 6 --idle-minutes 5
  python3 size_watcher.py --dry-run    # check only, no restart

Environment / config:
  --warn-mb       Log warning above this size (default: 5MB)
  --crit-mb       Trigger restart above this size (default: 8MB)
  --idle-minutes  Only restart if session idle >= this many minutes (default: 5)
  --sessions-dir  Path to sessions dir (default: ~/.openclaw/agents/main/sessions)
  --log-file      Append actions to this file (default: ~/clawd/memory/session-guard.log)
  --dry-run       Report what would happen, don't restart

Outputs one of:
  OK <size>MB — under threshold
  WARN <size>MB — above warn threshold, not yet critical
  RESTARTED <size>MB — restart triggered
  SKIPPED_ACTIVE <size>MB — over threshold but session recently active (idle < --idle-minutes)
  ERROR <message>
"""
import os
import sys
import glob
import argparse
import subprocess
import json
import time
from datetime import datetime
from pathlib import Path

DEFAULT_SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/main/sessions")
DEFAULT_LOG = os.path.expanduser("~/clawd/memory/session-guard.log")


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--warn-mb", type=float, default=5.0)
    p.add_argument("--crit-mb", type=float, default=8.0)
    p.add_argument("--idle-minutes", type=float, default=5.0)
    p.add_argument("--sessions-dir", default=DEFAULT_SESSIONS_DIR)
    p.add_argument("--log-file", default=DEFAULT_LOG)
    p.add_argument("--dry-run", action="store_true")
    return p.parse_args()


def find_active_session(sessions_dir):
    """Return (path, size_mb, idle_minutes) for the largest active session."""
    pattern = os.path.join(sessions_dir, "*.jsonl")
    files = glob.glob(pattern)
    active = [f for f in files if ".reset." not in f and ".deleted." not in f]
    if not active:
        return None, 0, 0

    # Most recently modified active session = current main session
    active.sort(key=os.path.getmtime, reverse=True)
    path = active[0]
    size_mb = os.path.getsize(path) / (1024 * 1024)
    idle_seconds = time.time() - os.path.getmtime(path)
    idle_minutes = idle_seconds / 60
    return path, size_mb, idle_minutes


def trigger_restart(dry_run=False):
    """Trigger openclaw gateway restart. Returns (success, message)."""
    if dry_run:
        return True, "DRY_RUN: would run 'openclaw gateway restart'"
    try:
        result = subprocess.run(
            ["openclaw", "gateway", "restart"],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode == 0:
            return True, result.stdout.strip() or "Gateway restart initiated"
        else:
            return False, f"Restart failed (exit {result.returncode}): {result.stderr.strip()[:200]}"
    except FileNotFoundError:
        return False, "openclaw CLI not found in PATH"
    except subprocess.TimeoutExpired:
        return False, "Restart command timed out after 30s"
    except Exception as e:
        return False, f"Restart error: {e}"


def log(log_file, level, message):
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] [{level}] {message}"
    print(line)
    try:
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        with open(log_file, "a") as f:
            f.write(line + "\n")
    except Exception:
        pass  # logging failure shouldn't break the watcher


def main():
    args = parse_args()

    path, size_mb, idle_minutes = find_active_session(args.sessions_dir)

    if path is None:
        log(args.log_file, "ERROR", "No active session found")
        print(f"ERROR no active session in {args.sessions_dir}")
        sys.exit(1)

    session_name = os.path.basename(path)

    # Under warn threshold — all good
    if size_mb < args.warn_mb:
        print(f"OK {size_mb:.1f}MB (threshold: {args.warn_mb}MB) — {session_name[:36]}")
        sys.exit(0)

    # Between warn and crit — log warning only
    if size_mb < args.crit_mb:
        msg = f"WARN {size_mb:.1f}MB (warn: {args.warn_mb}MB, crit: {args.crit_mb}MB) — {session_name[:36]}"
        log(args.log_file, "WARN", msg)
        print(msg)
        sys.exit(0)

    # Over crit threshold — check idle before restarting
    if idle_minutes < args.idle_minutes:
        msg = (f"SKIPPED_ACTIVE {size_mb:.1f}MB — session active "
               f"{idle_minutes:.1f}min ago (need {args.idle_minutes}min idle) — {session_name[:36]}")
        log(args.log_file, "WARN", msg)
        print(msg)
        sys.exit(0)

    # Over crit + idle long enough → restart
    pre_msg = (f"CRITICAL {size_mb:.1f}MB (>{args.crit_mb}MB), "
               f"idle {idle_minutes:.1f}min — triggering restart — {session_name[:36]}")
    log(args.log_file, "CRIT", pre_msg)
    print(pre_msg)

    success, restart_msg = trigger_restart(dry_run=args.dry_run)

    if success:
        out = f"RESTARTED {size_mb:.1f}MB — {restart_msg}"
        log(args.log_file, "INFO", out)
        print(out)
        sys.exit(0)
    else:
        out = f"RESTART_FAILED — {restart_msg}"
        log(args.log_file, "ERROR", out)
        print(out)
        sys.exit(2)


if __name__ == "__main__":
    main()
