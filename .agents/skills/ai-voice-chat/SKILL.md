---
name: ai-voice-chat
description: Hands-free AI voice conversations via AirPods or any Bluetooth headset. MLX-Whisper STT (Apple Silicon GPU, ~130ms) + hybrid LLM routing (local gemma3 for simple chat, cloud for complex) + Kokoro-ONNX TTS with sentence streaming. Auto-starts on headset connect, supports mid-conversation language switching. Simple conversations run fully local and free (~2.4s total latency). Complex queries route to cloud (~5s). Zero cost for voice processing — only cloud LLM API tokens for complex queries.
os:
  - darwin
requires:
  bins:
    - python3
    - security
  env:
    - VL_OPENCLAW_API_TOKEN
    - VL_OPENCLAW_SESSION_TO
---

# Voice Loop

Hands-free voice conversation: speak → MLX-Whisper transcribes (local GPU) → hybrid LLM routes to local or cloud → Kokoro speaks sentence-by-sentence (local).

## Architecture

```
Microphone → MLX-Whisper STT (local GPU, ~130ms) → Router → Kokoro TTS (local, <1s) → Speakers
                                                      ↓
                                          Simple query? → gemma3:1b (local, ~200ms TTFB, free)
                                          Complex query? → OpenClaw API (cloud, ~3s TTFB)
```

Streaming TTS speaks each sentence as it arrives from either LLM.

### Hybrid LLM Routing

Simple conversational queries ("how are you?", "tell me a joke", "what's 2+2?") route to a local gemma3:1b model via Ollama — **200ms TTFB, completely free**.

Complex queries that need tools, memory, web search, personal context, or smart home control route to cloud (Sonnet/Opus via OpenClaw) — **~3s TTFB, costs API tokens**.

The router checks for keywords (calendar, weather, email, code, names, etc.) and query length. If in doubt, it routes to cloud. If the local model fails, it auto-falls back to cloud.

### Latency Comparison

| Route | Silence | STT | LLM | TTS | Total |
|-------|---------|-----|-----|-----|-------|
| **Local (simple chat)** | 1.0s | 0.13s | 0.3s | 1.0s | **~2.4s** |
| **Cloud (complex)** | 1.0s | 0.13s | 3.0s | 1.0s | **~5.1s** |

## Setup

Run the setup script to install dependencies and download models:

```bash
bash scripts/setup.sh
```

This creates a `.venv`, installs Python packages (`numpy`, `sounddevice`, `soundfile`, `kokoro-onnx`, `mlx-whisper`), and downloads Kokoro models (~136MB total).

### Prerequisites

- macOS on Apple Silicon (M1–M4)
- Python 3.11+
- Ollama with gemma3:1b pulled (for local LLM): `ollama pull gemma3:1b`
- OpenClaw running: `openclaw gateway status`

### Token Storage (Recommended: macOS Keychain)

Store your OpenClaw API token securely in macOS Keychain instead of plaintext:

```bash
security add-generic-password -a "$USER" -s "voice-loop-openclaw-token" -w "YOUR_TOKEN_HERE" -U
```

The voice loop reads from Keychain automatically. To also set the session target:

```bash
security add-generic-password -a "$USER" -s "voice-loop-session-to" -w "+1XXXXXXXXXX" -U
```

Alternatively, set environment variables (`VL_OPENCLAW_API_TOKEN`, `VL_OPENCLAW_SESSION_TO`) — these take precedence over Keychain if both exist.

## Running

### Manual start

```bash
.venv/bin/python scripts/voice_loop.py
```

### Auto-start on headset connect

```bash
.venv/bin/python scripts/airpods_watcher.py
```

The watcher polls audio devices every 5s. When a device matching `VL_HEADSET_NAME` appears as input, it starts the voice loop. On disconnect, it stops. On crash, it restarts.

### Auto-start on boot (launchd)

Create `~/Library/LaunchAgents/com.voice-loop.watcher.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.voice-loop.watcher</string>
    <key>ProgramArguments</key>
    <array>
        <string>VENV_PYTHON_PATH</string>
        <string>WATCHER_SCRIPT_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/voice-loop-watcher.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/voice-loop-watcher.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
```

Replace `VENV_PYTHON_PATH` and `WATCHER_SCRIPT_PATH`. No tokens in the plist — they're read from Keychain at runtime. Then:

```bash
launchctl load ~/Library/LaunchAgents/com.voice-loop.watcher.plist
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `STT_ENGINE` | `mlx-whisper` | STT engine: `mlx-whisper` (GPU, fast) or `whisper-cli` (legacy) |
| `MLX_WHISPER_MODEL` | `mlx-community/whisper-base.en-mlx` | HuggingFace model for MLX-Whisper |
| `LOCAL_LLM_ENABLED` | `True` | Enable hybrid local/cloud routing |
| `LOCAL_LLM_MODEL` | `gemma3:1b` | Ollama model for simple queries |
| `SILENCE_THRESHOLD` | `0.015` | RMS level for silence detection |
| `SILENCE_DURATION` | `1.0` | Seconds of silence before processing |
| `KOKORO_SPEED` | `1.15` | TTS playback speed |

Edit these directly in `voice_loop.py` or set corresponding `VL_*` env vars.

## Language Switching

Say any of these mid-conversation:

- **Spanish:** "switch to Spanish", "Spanish mode", "habla en español"
- **Back to English:** "back to English", "English mode"

On switch: Whisper model changes, Kokoro voice and language change, LLM prompt includes language context.

## Voice Options

**English:** af_heart ⭐ (female), am_puck ⭐ (male)
**Spanish:** ef_dora ⭐ (female), em_alex (male)

Override default gender: set `CURRENT_GENDER = "male"` in voice_loop.py.

## Tuning

- **Even faster STT:** Try `mlx-community/distil-whisper-small.en` for slightly faster transcription
- **Disable local LLM:** Set `LOCAL_LLM_ENABLED = False` to route everything to cloud
- **Different local model:** `qwen3:4b` for better quality (slower), `gemma3:1b` for speed
- **Snappier response:** `SILENCE_DURATION = 0.8` (may cut off mid-pause)
- **Noise issues:** Raise `SILENCE_THRESHOLD` (try `0.02` or `0.03`)

## Troubleshooting

**"Audio device issue"** — Headphones not connected or not set as default.

**Empty transcriptions / hallucinations** — Whisper generating phantom text from background noise. Raise `SILENCE_THRESHOLD`.

**"Streaming error"** — OpenClaw not running or token invalid. Check `openclaw gateway status`.

**"Local LLM unavailable"** — Ollama not running or model not pulled. Run `ollama pull gemma3:1b`.

**Kokoro model not found** — Run `bash scripts/setup.sh` to download models.

## Cost

$0 for simple conversations (STT + local LLM + TTS all run locally). Cloud LLM API tokens only for complex queries.

## Security

- **Tokens**: Stored in macOS Keychain, read at runtime.
- **API endpoint locked to localhost**: Refuses non-local API endpoints.
- **Audio**: All capture and TTS happen locally. Only text transcription sent to LLM.

## Credits

- [MLX-Whisper](https://github.com/ml-explore/mlx-examples) — Apple Silicon GPU speech-to-text
- [Kokoro-ONNX](https://github.com/thewh1teagle/kokoro-onnx) — local neural TTS
- [Ollama](https://ollama.ai) — local LLM inference
- [OpenClaw](https://github.com/openclaw/openclaw) — AI agent framework
