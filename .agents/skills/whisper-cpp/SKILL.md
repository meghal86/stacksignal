---
name: whisper-cpp
description: Install and use whisper.cpp (local, free/offline speech-to-text) with OpenClaw. Use when enabling inbound voice-note transcription without paid provider APIs, when configuring tools.media.audio to run a local CLI (whisper.cpp/whisper-cli), or when debugging PATH/model issues for local audio transcription.
---

# whisper-cpp (local STT for OpenClaw)

Goal: compile **whisper.cpp**, download models to `~/.cache/whisper`, create a stable CLI wrapper, then patch OpenClaw `tools.media.audio` to use it.

## 1) Build whisper.cpp

Build deps are usually already present (`git`, `cmake`, `build-essential`, `curl`). If not, install them.

You also need `ffmpeg` (for decoding Telegram voice notes / Opus → WAV).

```bash
set -e

PREFIX="$HOME/.local/share/whisper.cpp"
REPO="$PREFIX/repo"
BUILD="$REPO/build"

mkdir -p "$PREFIX"

if [ ! -d "$REPO/.git" ]; then
  git clone https://github.com/ggerganov/whisper.cpp "$REPO"
else
  git -C "$REPO" pull --ff-only
fi

cmake -S "$REPO" -B "$BUILD" -DCMAKE_BUILD_TYPE=Release
cmake --build "$BUILD" -j"$(nproc)"

# install the built CLI into ~/.local/bin so we can delete the build dir later
mkdir -p "$HOME/.local/bin"
if [ -x "$BUILD/bin/whisper-cli" ]; then
  install -m 755 "$BUILD/bin/whisper-cli" "$HOME/.local/bin/whisper-cli"
elif [ -x "$BUILD/whisper-cli" ]; then
  install -m 755 "$BUILD/whisper-cli" "$HOME/.local/bin/whisper-cli"
else
  echo "Could not find whisper-cli under: $BUILD" >&2
  exit 1
fi

"$HOME/.local/bin/whisper-cli" -h >/dev/null
```

## 2) Download models (base default, small for retry)

Models live in: `~/.cache/whisper/`

```bash
set -e
MODELS_DIR="$HOME/.cache/whisper"
mkdir -p "$MODELS_DIR"

bash "$HOME/.local/share/whisper.cpp/repo/models/download-ggml-model.sh" base  "$MODELS_DIR"
bash "$HOME/.local/share/whisper.cpp/repo/models/download-ggml-model.sh" small "$MODELS_DIR" || true
```

## 3) Create OpenClaw wrapper (stdout transcript)

Recent `whisper-cli` supports `-nt -np` to keep output clean. **Telegram voice notes are usually OGG/Opus**, so we decode to 16kHz mono WAV via `ffmpeg` first.

```bash
set -e

BIN_DIR="$HOME/.local/bin"
MODELS_DIR="$HOME/.cache/whisper"
WHISPER_CLI="$BIN_DIR/whisper-cli"

cat >"$BIN_DIR/openclaw-whisper-stt" <<EOF
#!/usr/bin/env bash
set -euo pipefail

MEDIA_PATH="\${1:?usage: openclaw-whisper-stt <audio-file>}"
MODEL_NAME="\${OPENCLAW_WHISPER_MODEL:-base}"

MODELS_DIR="$MODELS_DIR"
WHISPER_CLI="$WHISPER_CLI"

case "\$MODEL_NAME" in
  base|small) ;;
  *) echo "OPENCLAW_WHISPER_MODEL must be base|small (got: \$MODEL_NAME)" >&2; exit 2;;
 esac

MODEL_PATH="\$MODELS_DIR/ggml-\$MODEL_NAME.bin"
[ -f "\$MODEL_PATH" ] || { echo "Model not found: \$MODEL_PATH" >&2; exit 3; }

TMP_WAV=""
cleanup() { if [ -n "\$TMP_WAV" ] && [ -f "\$TMP_WAV" ]; then rm -f "\$TMP_WAV"; fi; }
trap cleanup EXIT

INPUT="\$MEDIA_PATH"
case "\${MEDIA_PATH,,}" in
  *.ogg|*.opus|*.m4a|*.mp3|*.flac|*.webm)
    TMP_WAV="\$(mktemp -t openclaw-whisper-XXXXXX.wav)"
    ffmpeg -hide_banner -loglevel error -y -i "\$MEDIA_PATH" -ar 16000 -ac 1 -c:a pcm_s16le "\$TMP_WAV"
    INPUT="\$TMP_WAV"
    ;;
  *.wav) ;;
esac

"\$WHISPER_CLI" -m "\$MODEL_PATH" -f "\$INPUT" -nt -np
EOF

chmod +x "$BIN_DIR/openclaw-whisper-stt"
"$BIN_DIR/openclaw-whisper-stt" --help >/dev/null 2>&1 || true
```

### Retry with small if base is bad

If the transcript quality is poor with the base model, retry the same audio with:

```bash
OPENCLAW_WHISPER_MODEL=small openclaw-whisper-stt /path/to/audio
```

(For OpenClaw inbound messages, set the env var on the service if you want small by default.)

## 4) Patch OpenClaw to use the wrapper

```bash
bash scripts/patch_openclaw_audio.sh
```

## 5) Cleanup unnecessary build files (optional)

After you’ve installed `~/.local/bin/whisper-cli` and downloaded models, you can remove the build dir (and even the repo) to save space:

```bash
rm -rf "$HOME/.local/share/whisper.cpp/repo/build"
# optional: remove full repo; you’ll need to re-clone to update/download via script again
# rm -rf "$HOME/.local/share/whisper.cpp/repo"
```

## Resources

- Config patcher: `scripts/patch_openclaw_audio.sh`
- Extra notes: `references/whispercpp-notes.md`
