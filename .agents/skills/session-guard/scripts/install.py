#!/usr/bin/env python3
"""
session-guard: One-shot installer.
Applies all four protections automatically:
  1. Disable built-in heartbeat (config patch via gateway API)
  2. Set compaction mode to "default"
  3. Create isolated heartbeat cron (1h, cheap model)
  4. Create session wake monitor cron (5min, cheapest model)
  5. Create session size watcher cron (15min, cheapest model)
  6. Initialize stored session ID for wake detection

Usage:
  python3 install.py
  python3 install.py --dry-run                  # show what would happen, no changes
  python3 install.py --gateway http://localhost:18789
  python3 install.py --token <gateway-token>
  python3 install.py --heartbeat-model anthropic-proxy-4/glm-4.7
  python3 install.py --workspace /path/to/clawd
  python3 install.py --skip-crons               # config patch only, no crons
  python3 install.py --crit-mb 6                # custom size threshold

Gateway token is read from:
  1. --token flag
  2. OPENCLAW_TOKEN env var
  3. ~/.openclaw/openclaw.json (parsed automatically)
"""
import os
import sys
import json
import glob
import time
import argparse
import subprocess
import urllib.request
import urllib.error
from pathlib import Path
from datetime import datetime

DEFAULT_GATEWAY = "http://localhost:18789"
DEFAULT_CONFIG = os.path.expanduser("~/.openclaw/openclaw.json")
DEFAULT_STATE = os.path.expanduser("~/clawd/memory/heartbeat-state.json")
DEFAULT_SESSIONS_DIR = os.path.expanduser("~/.openclaw/agents/main/sessions")


def parse_args():
    p = argparse.ArgumentParser(description="session-guard installer")
    p.add_argument("--dry-run", action="store_true", help="Show actions, don't apply")
    p.add_argument("--gateway", default=DEFAULT_GATEWAY)
    p.add_argument("--token", default=None)
    p.add_argument("--workspace", default=None, help="Agent workspace path (default: auto-detect)")
    p.add_argument("--heartbeat-model", default="anthropic-proxy-4/glm-4.7",
                   help="Model for isolated heartbeat cron")
    p.add_argument("--monitor-model", default="nvidia-nim/qwen/qwen2.5-7b-instruct",
                   help="Model for wake monitor + size watcher crons")
    p.add_argument("--heartbeat-interval-ms", type=int, default=3600000,
                   help="Isolated heartbeat interval ms (default: 3600000 = 1h)")
    p.add_argument("--crit-mb", type=float, default=8.0,
                   help="Session size threshold for restart (default: 8MB)")
    p.add_argument("--skip-crons", action="store_true", help="Only patch config, skip cron setup")
    p.add_argument("--state-file", default=DEFAULT_STATE)
    p.add_argument("--sessions-dir", default=DEFAULT_SESSIONS_DIR)
    return p.parse_args()


def find_workspace(args):
    if args.workspace:
        return Path(args.workspace)
    candidates = [
        Path.home() / "clawd",
        Path(os.environ.get("OPENCLAW_WORKSPACE", "")),
        Path.cwd(),
    ]
    for c in candidates:
        if c and c.exists() and (c / "SOUL.md").exists():
            return c
    return None


def read_token_from_config(config_path):
    try:
        with open(config_path) as f:
            cfg = json.load(f)
        token = cfg.get("gateway", {}).get("auth", {}).get("token", "")
        return token if token else None
    except Exception:
        return None


def gateway_request(method, path, body, gateway_url, token, dry_run):
    """Make a request to the OpenClaw gateway REST API."""
    url = f"{gateway_url}{path}"
    if dry_run:
        print(f"    [DRY-RUN] {method} {url}")
        if body:
            print(f"    body: {json.dumps(body, indent=2)[:300]}")
        return {"ok": True, "dry_run": True}

    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(
        url, data=data, method=method,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body_text = e.read().decode()[:300]
        raise RuntimeError(f"HTTP {e.code}: {body_text}")
    except Exception as e:
        raise RuntimeError(str(e))


def get_existing_crons(gateway_url, token, dry_run):
    if dry_run:
        return []
    result = gateway_request("GET", "/api/cron/jobs", None, gateway_url, token, False)
    return result.get("result", {}).get("jobs", [])


def cron_exists(jobs, name):
    return any(j.get("name") == name for j in jobs)


def find_active_session_id(sessions_dir):
    pattern = os.path.join(sessions_dir, "*.jsonl")
    files = glob.glob(pattern)
    active = [f for f in files if ".reset." not in f and ".deleted." not in f]
    if not active:
        return None
    active.sort(key=os.path.getmtime, reverse=True)
    return os.path.basename(active[0]).replace(".jsonl", "")


def init_session_id(state_file, sessions_dir, dry_run):
    session_id = find_active_session_id(sessions_dir)
    if not session_id:
        print("  ⚠️  No active session found — skipping session ID init")
        return

    if dry_run:
        print(f"  [DRY-RUN] Would store lastSessionId: {session_id}")
        return

    os.makedirs(os.path.dirname(state_file), exist_ok=True)
    try:
        with open(state_file) as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        data = {}

    data["lastSessionId"] = session_id
    with open(state_file, "w") as f:
        json.dump(data, f, indent=2)
    print(f"  ✓ lastSessionId initialized: {session_id[:8]}...")


def main():
    args = parse_args()

    # Resolve token
    token = (args.token
             or os.environ.get("OPENCLAW_TOKEN")
             or read_token_from_config(DEFAULT_CONFIG)
             or "")

    # Resolve workspace
    workspace = find_workspace(args)
    workspace_str = str(workspace) if workspace else "~/clawd"

    dry = args.dry_run
    gw = args.gateway

    print(f"{'[DRY RUN] ' if dry else ''}session-guard installer")
    print(f"  Gateway: {gw}")
    print(f"  Workspace: {workspace_str}")
    print()

    # ── Step 1: Config patch ───────────────────────────────────────────────
    print("1/5  Patching config: disable heartbeat + set compaction=default")
    try:
        result = gateway_request("POST", "/api/config/patch", {
            "raw": json.dumps({
                "agents": {
                    "defaults": {
                        "heartbeat": {"every": "0m"},
                        "compaction": {"mode": "default"}
                    }
                }
            }),
            "note": "session-guard: disable main-session heartbeat, enable default compaction"
        }, gw, token, dry)
        if result.get("ok") or result.get("dry_run"):
            print("  ✓ Config patched (heartbeat=0m, compaction=default)")
        else:
            print(f"  ⚠️  Config patch returned: {result}")
    except Exception as e:
        print(f"  ❌ Config patch failed: {e}")
        print("     Apply manually via gateway tool:")
        print('     gateway(action="config.patch", raw=\'{"agents":{"defaults":{"heartbeat":{"every":"0m"},"compaction":{"mode":"default"}}}}\', note="...")')
    print()

    if args.skip_crons:
        print("--skip-crons set, skipping cron setup.")
        return

    # Get existing crons to avoid duplicates
    try:
        existing_crons = get_existing_crons(gw, token, dry)
    except Exception as e:
        existing_crons = []
        print(f"  ⚠️  Could not fetch existing crons: {e}")

    # ── Step 2: Isolated heartbeat cron ───────────────────────────────────
    print("2/5  Creating isolated heartbeat cron (1h, reads HEARTBEAT.md)")
    name2 = "Isolated Heartbeat"
    if cron_exists(existing_crons, name2):
        print(f"  ℹ️  '{name2}' already exists — skipping")
    else:
        try:
            result = gateway_request("POST", "/api/cron/jobs", {
                "name": name2,
                "schedule": {"kind": "every", "everyMs": args.heartbeat_interval_ms},
                "payload": {
                    "kind": "agentTurn",
                    "model": args.heartbeat_model,
                    "message": (
                        "Read HEARTBEAT.md if it exists and follow its instructions strictly. "
                        "Send any urgent alerts via the message tool to Telegram. "
                        "Do NOT reply HEARTBEAT_OK — isolated sessions must use message tool. "
                        "If nothing needs attention, reply: DONE"
                    ),
                    "timeoutSeconds": 120
                },
                "sessionTarget": "isolated"
            }, gw, token, dry)
            if result.get("ok") or result.get("dry_run"):
                print(f"  ✓ '{name2}' created (model: {args.heartbeat_model})")
            else:
                print(f"  ⚠️  {result}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    print()

    # ── Step 3: Session wake monitor ──────────────────────────────────────
    print("3/5  Creating session wake monitor cron (5min, detects resets)")
    name3 = "Session Wake Monitor"
    if cron_exists(existing_crons, name3):
        print(f"  ℹ️  '{name3}' already exists — skipping")
    else:
        try:
            result = gateway_request("POST", "/api/cron/jobs", {
                "name": name3,
                "schedule": {"kind": "every", "everyMs": 300000},
                "payload": {
                    "kind": "agentTurn",
                    "model": args.monitor_model,
                    "message": (
                        f"Check if main OpenClaw session has reset:\n"
                        f"1. Run: bash {workspace_str}/skills/session-guard/scripts/check_session.sh\n"
                        f"   Output: CURRENT_ID|STORED_ID. Exit 0=same session, 1=new session, 2=error.\n"
                        f"2. If exit 1 (new session):\n"
                        f"   a. python3 {workspace_str}/skills/session-guard/scripts/hydrate.py > /tmp/sg_hydration.txt\n"
                        f"   b. python3 {workspace_str}/skills/session-guard/scripts/update_session_id.py <CURRENT_ID>\n"
                        f"   c. Read /tmp/sg_hydration.txt and send a brief summary to Telegram via message tool.\n"
                        f"      Include: active projects, recent events, any pending tasks.\n"
                        f"      Start with: '🔄 Session reset detected — context reloaded. Here's what I remember:'\n"
                        f"3. If exit 0: reply DONE."
                    ),
                    "timeoutSeconds": 90
                },
                "sessionTarget": "isolated"
            }, gw, token, dry)
            if result.get("ok") or result.get("dry_run"):
                print(f"  ✓ '{name3}' created (model: {args.monitor_model})")
            else:
                print(f"  ⚠️  {result}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    print()

    # ── Step 4: Session size watcher ──────────────────────────────────────
    print("4/5  Creating session size watcher cron (15min, auto-restart if bloated)")
    name4 = "Session Size Watcher"
    if cron_exists(existing_crons, name4):
        print(f"  ℹ️  '{name4}' already exists — skipping")
    else:
        try:
            result = gateway_request("POST", "/api/cron/jobs", {
                "name": name4,
                "schedule": {"kind": "every", "everyMs": 900000},
                "payload": {
                    "kind": "agentTurn",
                    "model": args.monitor_model,
                    "message": (
                        f"Run the session size watcher:\n"
                        f"1. python3 {workspace_str}/skills/session-guard/scripts/size_watcher.py "
                        f"--crit-mb {args.crit_mb} --idle-minutes 5\n"
                        f"2. If output starts with RESTARTED: send Telegram alert via message tool:\n"
                        f"   '🔄 Session size limit hit — gateway restarted. Hydration will follow shortly.'\n"
                        f"3. If output starts with RESTART_FAILED: send Telegram alert:\n"
                        f"   '⚠️ Session bloat critical but restart failed. Check session-guard.log.'\n"
                        f"4. If OK/WARN/SKIPPED: reply DONE."
                    ),
                    "timeoutSeconds": 60
                },
                "sessionTarget": "isolated"
            }, gw, token, dry)
            if result.get("ok") or result.get("dry_run"):
                print(f"  ✓ '{name4}' created (crit: {args.crit_mb}MB)")
            else:
                print(f"  ⚠️  {result}")
        except Exception as e:
            print(f"  ❌ Failed: {e}")
    print()

    # ── Step 5: Init session ID ────────────────────────────────────────────
    print("5/5  Initializing stored session ID for wake detection")
    init_session_id(args.state_file, args.sessions_dir, dry)
    print()

    print("✅ session-guard installation complete!")
    if dry:
        print("   (dry-run: no changes were applied)")
    else:
        print("   All protections active. Run audit.py anytime to verify health.")


if __name__ == "__main__":
    main()
