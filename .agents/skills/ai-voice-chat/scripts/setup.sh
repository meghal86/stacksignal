#!/bin/bash
# Voice Loop Setup — installs dependencies and downloads models.
# Run from the voice-loop skill directory.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="${SKILL_DIR}/.venv"
KOKORO_DIR="${HOME}/.cache/kokoro-onnx"
KOKORO_MODEL_URL="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx"
KOKORO_VOICES_URL="https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin"

echo "============================================"
echo "🦞 Voice Loop Setup"
echo "============================================"
echo ""

# 1. Python venv
if [ ! -d "$VENV_DIR" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv "$VENV_DIR"
else
    echo "✅ Virtual environment exists"
fi

# 2. Python dependencies
echo "📦 Installing Python dependencies..."
"$VENV_DIR/bin/pip" install -q numpy sounddevice soundfile kokoro-onnx mlx-whisper

# 3. Kokoro models
mkdir -p "$KOKORO_DIR"
if [ ! -f "$KOKORO_DIR/kokoro-v1.0.onnx" ]; then
    echo "⬇️  Downloading Kokoro model (~82MB)..."
    curl -L -o "$KOKORO_DIR/kokoro-v1.0.onnx" "$KOKORO_MODEL_URL"
else
    echo "✅ Kokoro model exists"
fi

if [ ! -f "$KOKORO_DIR/voices-v1.0.bin" ]; then
    echo "⬇️  Downloading Kokoro voices (~54MB)..."
    curl -L -o "$KOKORO_DIR/voices-v1.0.bin" "$KOKORO_VOICES_URL"
else
    echo "✅ Kokoro voices exist"
fi

# 4. Ollama + local LLM (optional, for hybrid routing)
if command -v ollama &> /dev/null; then
    echo "✅ Ollama installed"
    if ollama list 2>/dev/null | grep -q "gemma3:1b"; then
        echo "✅ gemma3:1b model ready"
    else
        echo "⬇️  Pulling gemma3:1b for local voice responses (~815MB)..."
        ollama pull gemma3:1b
    fi
else
    echo "⚠️  Ollama not found. Install from https://ollama.ai for free local LLM routing."
    echo "   Without it, all queries route to cloud (still works, just costs API tokens)."
fi

# 5. OpenClaw check
if command -v openclaw &> /dev/null; then
    echo "✅ OpenClaw installed"
else
    echo "⚠️  OpenClaw not found. Install with: npm i -g openclaw"
fi

echo ""
echo "============================================"
echo "🔐 Token Setup (macOS Keychain)"
echo "============================================"
echo ""

# Check if tokens already exist in Keychain
if security find-generic-password -s "voice-loop-openclaw-token" -w &> /dev/null; then
    echo "✅ OpenClaw API token found in Keychain"
else
    echo "No OpenClaw API token in Keychain."
    echo "  Find your token with: openclaw gateway status"
    read -p "  Paste your token (or Enter to skip): " TOKEN
    if [ -n "$TOKEN" ]; then
        security add-generic-password -a "$USER" -s "voice-loop-openclaw-token" -w "$TOKEN" -U
        echo "  ✅ Token saved to Keychain"
    else
        echo "  ⏭  Skipped. Set later with:"
        echo "     security add-generic-password -a \"\$USER\" -s \"voice-loop-openclaw-token\" -w \"YOUR_TOKEN\" -U"
    fi
fi

if security find-generic-password -s "voice-loop-session-to" -w &> /dev/null; then
    echo "✅ Session target found in Keychain"
else
    echo "No session target in Keychain."
    read -p "  Enter your phone number or user ID (or Enter to skip): " TARGET
    if [ -n "$TARGET" ]; then
        security add-generic-password -a "$USER" -s "voice-loop-session-to" -w "$TARGET" -U
        echo "  ✅ Target saved to Keychain"
    else
        echo "  ⏭  Skipped. Set later with:"
        echo "     security add-generic-password -a \"\$USER\" -s \"voice-loop-session-to\" -w \"+1XXXXXXXXXX\" -U"
    fi
fi

echo ""
echo "============================================"
echo "✅ Setup complete!"
echo "============================================"
echo ""
echo "Connect your headphones and run:"
echo "  $VENV_DIR/bin/python $SCRIPT_DIR/voice_loop.py"
echo ""
echo "Or start the auto-connect watcher:"
echo "  $VENV_DIR/bin/python $SCRIPT_DIR/airpods_watcher.py"
