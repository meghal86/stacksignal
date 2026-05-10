#!/usr/bin/env python3
"""
AirPods Watcher — auto-starts voice loop when AirPods connect.

Polls audio devices every 5 seconds. When "Michael's AirPods" appears
as an input device, starts the voice loop. When they disconnect, stops it.

Usage:
    ~/voice-loop/.venv/bin/python ~/voice-loop/airpods_watcher.py

Runs as a background daemon. Add to launchd for auto-start on boot.
"""

import subprocess
import time
import signal
import sys
import os

AIRPODS_NAME = "Michael's AirPods"
POLL_INTERVAL = 5  # seconds
VOICE_LOOP_SCRIPT = os.path.expanduser("~/voice-loop/voice_loop.py")
VENV_PYTHON = os.path.expanduser("~/voice-loop/.venv/bin/python")

running = True
voice_loop_proc = None


def signal_handler(sig, frame):
    global running
    print("\n🛑 Watcher shutting down...")
    running = False
    stop_voice_loop()

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def airpods_connected() -> bool:
    """Check if AirPods are available as an input device."""
    try:
        result = subprocess.run(
            [VENV_PYTHON, "-c", """
import sounddevice as sd
devices = sd.query_devices()
for d in devices:
    if d['max_input_channels'] > 0 and 'AirPods' in d['name']:
        print('FOUND')
        break
"""],
            capture_output=True, text=True, timeout=5
        )
        return "FOUND" in result.stdout
    except Exception:
        return False


def start_voice_loop():
    global voice_loop_proc
    if voice_loop_proc and voice_loop_proc.poll() is None:
        return  # already running

    print("🎧 AirPods detected — starting voice loop...", flush=True)
    voice_loop_proc = subprocess.Popen(
        [VENV_PYTHON, VOICE_LOOP_SCRIPT],
        cwd=os.path.dirname(VOICE_LOOP_SCRIPT),
    )
    print(f"   Voice loop started (pid {voice_loop_proc.pid})", flush=True)


def stop_voice_loop():
    global voice_loop_proc
    if voice_loop_proc and voice_loop_proc.poll() is None:
        print("🔇 AirPods disconnected — stopping voice loop...", flush=True)
        voice_loop_proc.terminate()
        try:
            voice_loop_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            voice_loop_proc.kill()
        print("   Voice loop stopped.", flush=True)
    voice_loop_proc = None


def main():
    print("=" * 50)
    print("👂 AirPods Watcher")
    print("=" * 50)
    print(f"Watching for: {AIRPODS_NAME}")
    print(f"Poll interval: {POLL_INTERVAL}s")
    print("Press Ctrl+C to stop\n")

    was_connected = False

    while running:
        connected = airpods_connected()

        if connected and not was_connected:
            start_voice_loop()
            was_connected = True
        elif not connected and was_connected:
            stop_voice_loop()
            was_connected = False

        # Also check if voice loop crashed while AirPods still connected
        if was_connected and voice_loop_proc and voice_loop_proc.poll() is not None:
            print("⚠️  Voice loop crashed, restarting...", flush=True)
            start_voice_loop()

        time.sleep(POLL_INTERVAL)

    stop_voice_loop()
    print("👋 Watcher ended.")


if __name__ == "__main__":
    main()
