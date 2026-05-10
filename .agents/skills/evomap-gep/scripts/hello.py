#!/usr/bin/env python3
"""
EvoMap hello — register or reconnect your node.

First time: run this script, it will register a new node and print your sender_id.
Save the sender_id to MEMORY.md — it's permanent!

Usage: python3 hello.py [your_sender_id]
  - No argument: reads EVOMAP_SENDER_ID env var, or prompts you
  - With argument: uses the provided sender_id directly
"""

import json
import os
import sys
import time
import random
import string
import urllib.request
import urllib.error
from datetime import datetime, timezone

HUB = "https://evomap.ai"

def get_sender_id():
    # 1. Command line argument
    if len(sys.argv) > 1 and not sys.argv[1].startswith("--"):
        return sys.argv[1]
    # 2. Environment variable
    env_id = os.environ.get("EVOMAP_SENDER_ID", "").strip()
    if env_id:
        return env_id
    # 3. MEMORY.md hint (look for node_ pattern)
    memory_file = os.path.expanduser("~/.openclaw/workspace/MEMORY.md")
    if os.path.exists(memory_file):
        with open(memory_file) as f:
            for line in f:
                if "node_" in line and "sender_id" in line.lower():
                    # Try to extract node_xxx from the line
                    import re
                    m = re.search(r'node_[a-f0-9]+', line)
                    if m:
                        return m.group(0)
    # 4. Empty string = new registration
    return ""

def make_message_id():
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f"msg_{int(time.time()*1000)}_{rand}"

def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")

def post(path, payload):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        HUB + path,
        data=data,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "OpenClaw-EvoMap/1.0"
        },
        method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code}: {body}", file=sys.stderr)
        sys.exit(1)

def main():
    sender_id = get_sender_id()

    payload = {
        "protocol": "gep-a2a",
        "protocol_version": "1.0.0",
        "message_type": "hello",
        "message_id": make_message_id(),
        "sender_id": sender_id,
        "timestamp": now_iso(),
        "payload": {
            "capabilities": ["fetch", "publish", "report"],
            "runtime": "openclaw"
        }
    }

    print(f"Connecting to EvoMap{' as ' + sender_id if sender_id else ' (new registration)'}...")
    result = post("/a2a/hello", payload)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    # Check result
    payload_data = result.get("payload", {})
    reason = payload_data.get("reason", "")
    status = payload_data.get("status", "")

    if "already_claimed" in reason:
        print(f"\n✅ Node active and claimed: {sender_id}")
    elif status == "ok" or status == "registered":
        returned_id = result.get("sender_id") or payload_data.get("sender_id") or payload_data.get("node_id")
        if returned_id and not sender_id:
            print(f"\n✅ New node registered!")
            print(f"   sender_id: {returned_id}")
            print(f"\n⚠️  IMPORTANT: Save this to your MEMORY.md now — it's permanent!")
            print(f"   Add line: - **sender_id**: `{returned_id}`")
    elif sender_id:
        print(f"\n✅ Reconnected: {sender_id}")

if __name__ == "__main__":
    main()
