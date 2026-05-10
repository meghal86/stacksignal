#!/usr/bin/env python3
"""
Voice Loop — hands-free conversation with OpenClaw.

Architecture:
  - Streams LLM response via OpenClaw's OpenAI-compatible HTTP API (SSE)
  - Speaks each sentence as it arrives via Kokoro TTS (no waiting for full response)
  - Auto-starts when AirPods connect, auto-stops on disconnect

Listens via mic → transcribes with Whisper → streams OpenClaw response →
speaks sentence-by-sentence with Kokoro TTS → repeats.

Usage:
    ~/voice-loop/.venv/bin/python ~/voice-loop/voice_loop.py
"""

import subprocess
import tempfile
import os
import json
import time
import signal
import re
import asyncio
import threading
import numpy as np
import sounddevice as sd
import soundfile as sf
import urllib.request

# ── Config ──────────────────────────────────────────────────────────────────
SAMPLE_RATE = 16000
CHANNELS = 1
WHISPER_MODEL_EN = "base.en"
WHISPER_MODEL_MULTI = "small"
SILENCE_THRESHOLD = 0.015
SILENCE_DURATION = 1.0           # was 1.2 — saves 200ms per utterance
MIN_SPEECH_DURATION = 0.5
PRE_SPEECH_BUFFER = 0.5
CHUNK_DURATION = 0.1

# STT engine: "mlx-whisper" (fast, Apple Silicon GPU) or "whisper-cli" (legacy)
STT_ENGINE = "mlx-whisper"
MLX_WHISPER_MODEL = "mlx-community/whisper-base.en-mlx"

# ── Hybrid LLM routing ─────────────────────────────────────────────────────
# Simple conversational turns → local gemma3:1b (free, ~200ms TTFB)
# Complex queries (tools, memory, reasoning) → cloud Sonnet via OpenClaw
LOCAL_LLM_ENABLED = True
LOCAL_LLM_URL = "http://localhost:11434/api/chat"
LOCAL_LLM_MODEL = "gemma3:1b"
LOCAL_LLM_SYSTEM = (
    "You are Quinn, a calm and witty voice assistant for Mike. "
    "Keep responses short and conversational (1-3 sentences). "
    "No markdown, no emoji, no lists. Talk like a human."
)
# Keywords/patterns that need cloud (tools, memory, personal context, complex tasks)
CLOUD_TRIGGERS = [
    "remind", "reminder", "calendar", "schedule", "meeting", "event",
    "email", "message", "text", "send", "call",
    "weather", "temperature", "forecast",
    "timer", "alarm", "set",
    "search", "look up", "find", "google",
    "code", "program", "debug", "fix", "build", "deploy",
    "file", "folder", "document", "save", "delete",
    "home", "lights", "thermostat", "garage", "lock",
    "play", "music", "song", "spotify",
    "buy", "order", "price", "cost",
    "melanie", "patrick",  # personal context needs memory
    "remember", "last time", "yesterday", "earlier",
    "what did", "when did", "where did",
    "project", "quantum", "vault", "defi", "portfolio",
    "hockey", "score", "game",  # needs web search
]

# Kokoro TTS (local, free)
KOKORO_VOICES = {
    "en": {"female": "af_heart", "male": "am_puck"},
    "es": {"female": "ef_dora", "male": "em_alex"},
}
KOKORO_SPEED = 1.15
KOKORO_MODEL_DIR = os.path.expanduser("~/.cache/kokoro-onnx")

# Language config
CURRENT_LANG = "en"
CURRENT_GENDER = "female"
WHISPER_LANGS = {"en": "en", "es": "es"}
KOKORO_LANGS = {"en": "en-us", "es": "es"}

# OpenClaw streaming API
OPENCLAW_API_URL = "http://127.0.0.1:18789/v1/chat/completions"
OPENCLAW_VOICE_SESSION = "agent:main:voice"  # Sonnet session for fast voice responses

# Read tokens from Keychain (never hardcode)
def _keychain_get(service: str, fallback_env: str = "") -> str:
    """Read a secret from macOS Keychain, fall back to env var."""
    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-a", os.environ.get("USER", ""), "-s", service, "-w"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except Exception:
        pass
    return os.environ.get(fallback_env, "")

OPENCLAW_API_TOKEN = _keychain_get("voice-loop-openclaw-token", "VL_OPENCLAW_API_TOKEN")
OPENCLAW_SESSION_TO = _keychain_get("voice-loop-session-to", "VL_OPENCLAW_SESSION_TO") or "+18159938009"

# Also keep CLI for --deliver (iMessage propagation)
OPENCLAW_DELIVER = True

# ── Globals ─────────────────────────────────────────────────────────────────
running = True
kokoro = None
mlx_whisper_model = None  # loaded once, reused every transcription

def signal_handler(sig, frame):
    global running
    print("\n🛑 Shutting down...")
    running = False

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)


def init_kokoro():
    global kokoro
    from kokoro_onnx import Kokoro
    model_path = os.path.join(KOKORO_MODEL_DIR, "kokoro-v1.0.onnx")
    voices_path = os.path.join(KOKORO_MODEL_DIR, "voices-v1.0.bin")
    kokoro = Kokoro(model_path, voices_path)


def get_voice():
    return KOKORO_VOICES[CURRENT_LANG][CURRENT_GENDER]

def get_kokoro_lang():
    return KOKORO_LANGS[CURRENT_LANG]

def get_whisper_lang():
    return WHISPER_LANGS[CURRENT_LANG]

def get_whisper_model():
    return WHISPER_MODEL_EN if CURRENT_LANG == "en" else WHISPER_MODEL_MULTI

def rms(audio_chunk: np.ndarray) -> float:
    return float(np.sqrt(np.mean(audio_chunk ** 2)))


def check_language_switch(text: str) -> bool:
    global CURRENT_LANG
    lower = text.lower().strip()

    spanish_triggers = ["modo español", "modo espanol", "let's practice spanish",
                        "lets practice spanish", "switch to spanish", "en español",
                        "spanish mode", "habla en español", "hablemos español",
                        "hablemos en español", "practicamos español", "practicamos espanol",
                        "go spanish", "go to spanish", "talk in spanish",
                        "speak spanish", "speak in spanish"]
    english_triggers = ["back to english", "switch to english", "english mode",
                        "modo inglés", "modo ingles", "in english",
                        "go english", "go to english", "talk in english",
                        "speak english", "speak in english", "stop spanish"]

    for trigger in spanish_triggers:
        if trigger in lower:
            if CURRENT_LANG != "es":
                CURRENT_LANG = "es"
                print(f"🇪🇸 Switched to Spanish mode (voice: {get_voice()})", flush=True)
                try:
                    samples, sr = kokoro.create("¡Modo español activado! Hablemos en español.", voice=get_voice(), speed=KOKORO_SPEED, lang='es')
                    sd.play(samples, sr)
                    sd.wait()
                except:
                    pass
            return True

    for trigger in english_triggers:
        if trigger in lower:
            if CURRENT_LANG != "en":
                CURRENT_LANG = "en"
                print(f"🇺🇸 Switched to English mode (voice: {get_voice()})", flush=True)
                try:
                    samples, sr = kokoro.create("Switched back to English.", voice=get_voice(), speed=KOKORO_SPEED, lang='en-us')
                    sd.play(samples, sr)
                    sd.wait()
                except:
                    pass
            return True

    return False


def record_utterance() -> np.ndarray | None:
    chunk_samples = int(SAMPLE_RATE * CHUNK_DURATION)
    pre_buffer_chunks = int(PRE_SPEECH_BUFFER / CHUNK_DURATION)
    silence_chunks_needed = int(SILENCE_DURATION / CHUNK_DURATION)

    pre_buffer = []
    speech_chunks = []
    is_speaking = False
    silence_count = 0

    print("🎤 Listening...", flush=True)

    with sd.InputStream(samplerate=SAMPLE_RATE, channels=CHANNELS, dtype='float32') as stream:
        while running:
            chunk, _ = stream.read(chunk_samples)
            chunk = chunk.flatten()
            level = rms(chunk)

            if not is_speaking:
                pre_buffer.append(chunk)
                if len(pre_buffer) > pre_buffer_chunks:
                    pre_buffer.pop(0)
                if level > SILENCE_THRESHOLD:
                    is_speaking = True
                    speech_chunks = list(pre_buffer) + [chunk]
                    silence_count = 0
                    print("🗣️  Speech detected...", flush=True)
            else:
                speech_chunks.append(chunk)
                if level < SILENCE_THRESHOLD:
                    silence_count += 1
                    if silence_count >= silence_chunks_needed:
                        break
                else:
                    silence_count = 0

    if not speech_chunks:
        return None

    audio = np.concatenate(speech_chunks)
    duration = len(audio) / SAMPLE_RATE

    if duration < MIN_SPEECH_DURATION:
        print(f"   (too short: {duration:.1f}s, skipping)", flush=True)
        return None

    print(f"   Captured {duration:.1f}s of audio", flush=True)
    return audio


def transcribe(audio: np.ndarray) -> str:
    """Transcribe audio using MLX-Whisper (in-process, GPU) or Whisper CLI (legacy)."""
    t0 = time.perf_counter()

    if STT_ENGINE == "mlx-whisper":
        return _transcribe_mlx(audio, t0)
    else:
        return _transcribe_cli(audio, t0)


def _transcribe_mlx(audio: np.ndarray, t0: float) -> str:
    """In-process MLX-Whisper — no subprocess, model stays loaded."""
    import mlx_whisper

    # Write temp file (mlx_whisper needs a path)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
        sf.write(tmp_path, audio, SAMPLE_RATE)

    try:
        result = mlx_whisper.transcribe(
            tmp_path,
            path_or_hf_repo=MLX_WHISPER_MODEL,
            language=get_whisper_lang(),
        )
        text = result.get("text", "").strip()
        elapsed = time.perf_counter() - t0
        print(f"📝 Transcribed in {elapsed:.0f}ms (MLX-Whisper)", flush=True)
        return text
    finally:
        os.unlink(tmp_path)


def _transcribe_cli(audio: np.ndarray, t0: float) -> str:
    """Legacy: shell out to whisper CLI."""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        tmp_path = f.name
        sf.write(tmp_path, audio, SAMPLE_RATE)

    try:
        result = subprocess.run(
            [
                "/opt/homebrew/bin/whisper", tmp_path,
                "--model", get_whisper_model(),
                "--language", get_whisper_lang(),
                "--output_format", "txt",
                "--output_dir", "/tmp",
            ],
            capture_output=True, text=True, timeout=30
        )

        base = os.path.basename(tmp_path).replace(".wav", ".txt")
        txt_path = os.path.join("/tmp", base)

        if os.path.exists(txt_path):
            with open(txt_path) as f:
                text = f.read().strip()
            os.unlink(txt_path)
            elapsed = time.perf_counter() - t0
            print(f"📝 Transcribed in {elapsed:.0f}ms (CLI)", flush=True)
            return text
        else:
            return result.stdout.strip()
    finally:
        os.unlink(tmp_path)


def clean_text_for_tts(text: str) -> str:
    """Clean markdown/emoji from text for TTS."""
    clean = re.sub(r'[*_`#\[\]]', '', text)
    clean = re.sub(r'\n+', '. ', clean)
    clean = re.sub(r'https?://\S+', 'link', clean)
    clean = re.sub(r'[😀-🙏🌀-🗿🚀-🛿🤀-🧿🩀-🫿]+', '', clean)
    return clean.strip()


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences for streaming TTS."""
    # Split on sentence-ending punctuation followed by space or end
    parts = re.split(r'(?<=[.!?¡¿])\s+', text)
    # Filter empty strings
    return [p.strip() for p in parts if p.strip()]


def generate_tts(text: str):
    """Generate TTS audio without playing (for pre-generation)."""
    if not text:
        return None
    voice = get_voice()
    lang = get_kokoro_lang()
    try:
        samples, sr = kokoro.create(text, voice=voice, speed=KOKORO_SPEED, lang=lang)
        return (samples, sr)
    except Exception as e:
        print(f"   ⚠️  Kokoro error on sentence: {e}", flush=True)
        return None


def speak_sentence(text: str):
    """Speak a single sentence synchronously."""
    result = generate_tts(text)
    if result:
        samples, sr = result
        sd.play(samples, sr)
        sd.wait()


def speak_audio(samples, sr):
    """Play pre-generated audio."""
    sd.play(samples, sr)
    sd.wait()


def needs_cloud(text: str) -> bool:
    """Decide if a query needs cloud LLM (tools, memory, complex) or can go local."""
    if not LOCAL_LLM_ENABLED:
        return True
    lower = text.lower()
    # Long or complex queries likely need cloud
    if len(lower.split()) > 25:
        return True
    for trigger in CLOUD_TRIGGERS:
        if trigger in lower:
            return True
    return False


def stream_local_and_speak(text: str) -> str:
    """Stream from local Ollama model and speak sentences as they arrive."""
    print(f"💬 Local LLM ({LOCAL_LLM_MODEL})...", flush=True)
    t0 = time.time()

    payload = json.dumps({
        "model": LOCAL_LLM_MODEL,
        "messages": [
            {"role": "system", "content": LOCAL_LLM_SYSTEM},
            {"role": "user", "content": text},
        ],
        "stream": True,
    }).encode()

    req = urllib.request.Request(
        LOCAL_LLM_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    full_response = ""
    sentence_buffer = ""
    sentences_spoken = 0
    first_speech_time = None

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            for raw_line in resp:
                chunk = json.loads(raw_line.decode())
                content = chunk.get("message", {}).get("content", "")

                if content:
                    full_response += content
                    sentence_buffer += content

                    sentences = split_into_sentences(sentence_buffer)
                    if len(sentences) > 1:
                        for s in sentences[:-1]:
                            clean = clean_text_for_tts(s)
                            if clean:
                                if first_speech_time is None:
                                    first_speech_time = time.time()
                                    ttfb = first_speech_time - t0
                                    print(f"   ⚡ First speech at {ttfb:.1f}s (local)", flush=True)
                                label = f'"{clean[:60]}..."' if len(clean) > 60 else f'"{clean}"'
                                print(f"   🔊 {label}", flush=True)
                                speak_sentence(clean)
                                sentences_spoken += 1
                        sentence_buffer = sentences[-1]

                if chunk.get("done"):
                    break

        # Speak remaining buffer
        if sentence_buffer.strip():
            clean = clean_text_for_tts(sentence_buffer)
            if clean:
                if first_speech_time is None:
                    first_speech_time = time.time()
                    ttfb = first_speech_time - t0
                    print(f"   ⚡ First speech at {ttfb:.1f}s (local)", flush=True)
                print(f'   🔊 "{clean[:60]}"', flush=True)
                speak_sentence(clean)
                sentences_spoken += 1

        elapsed = time.time() - t0
        print(f"   Total: {elapsed:.1f}s, {sentences_spoken} sentences (local, free)", flush=True)

    except Exception as e:
        print(f"   ⚠️  Local LLM error: {e}, falling back to cloud...", flush=True)
        return stream_and_speak(text)

    return full_response


def stream_and_speak(text: str) -> str:
    """Stream LLM response via SSE and speak sentences as they arrive.
    
    Returns the full response text for iMessage delivery.
    """
    print(f"💬 Streaming from OpenClaw (cloud)...", flush=True)
    t0 = time.time()

    lang_context = ""
    if CURRENT_LANG == "es":
        lang_context = " [Spanish mode — respond in Spanish, correct my grammar gently]"

    message = f"[Voice from Mike via AirPods]{lang_context} {text}"

    payload = json.dumps({
        "model": "openclaw:main",
        "messages": [{"role": "user", "content": message}],
        "stream": True,
        "user": f"voice-loop-{OPENCLAW_SESSION_TO}",
    }).encode()

    req = urllib.request.Request(
        OPENCLAW_API_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {OPENCLAW_API_TOKEN}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
            "x-openclaw-session-key": OPENCLAW_VOICE_SESSION,
        }
    )

    full_response = ""
    sentence_buffer = ""
    sentences_spoken = 0
    first_speech_time = None
    pending_tts = None  # (text, audio_result) pre-generated but not yet played

    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()

                if not line or not line.startswith("data: "):
                    continue

                data_str = line[6:]  # strip "data: "

                if data_str == "[DONE]":
                    break

                try:
                    chunk = json.loads(data_str)
                    delta = chunk.get("choices", [{}])[0].get("delta", {})
                    content = delta.get("content", "")

                    if content:
                        full_response += content
                        sentence_buffer += content

                        # Check if we have a complete sentence to speak
                        sentences = split_into_sentences(sentence_buffer)
                        if len(sentences) > 1:
                            # Speak all complete sentences, keep the last (incomplete) one
                            for s in sentences[:-1]:
                                clean = clean_text_for_tts(s)
                                if clean:
                                    if first_speech_time is None:
                                        first_speech_time = time.time()
                                        ttfb = first_speech_time - t0
                                        print(f"   ⚡ First speech at {ttfb:.1f}s", flush=True)
                                    label = f"\"{clean[:60]}...\"" if len(clean) > 60 else f"\"{clean}\""
                                    print(f"   🔊 {label}", flush=True)
                                    # Use pre-generated audio if available, otherwise generate+play
                                    if pending_tts and pending_tts[0] == clean:
                                        _, audio_result = pending_tts
                                        pending_tts = None
                                        if audio_result:
                                            speak_audio(*audio_result)
                                    else:
                                        pending_tts = None
                                        speak_sentence(clean)
                                    sentences_spoken += 1
                            sentence_buffer = sentences[-1]

                except json.JSONDecodeError:
                    continue

        # Speak any remaining text in the buffer
        if sentence_buffer.strip():
            clean = clean_text_for_tts(sentence_buffer)
            if clean:
                if first_speech_time is None:
                    first_speech_time = time.time()
                    ttfb = first_speech_time - t0
                    print(f"   ⚡ First speech at {ttfb:.1f}s", flush=True)
                print(f"   🔊 \"{clean[:60]}...\"" if len(clean) > 60 else f"   🔊 \"{clean}\"", flush=True)
                speak_sentence(clean)
                sentences_spoken += 1

        elapsed = time.time() - t0
        print(f"   Total: {elapsed:.1f}s, {sentences_spoken} sentences spoken", flush=True)

    except Exception as e:
        print(f"   ⚠️  Streaming error: {e}", flush=True)
        print(f"   Falling back to CLI...", flush=True)
        # Fallback to non-streaming CLI
        full_response = send_to_openclaw_cli(text)
        if full_response:
            clean = clean_text_for_tts(full_response)
            if clean:
                speak_sentence(clean[:2000])

    return full_response


def send_to_openclaw_cli(text: str) -> str:
    """Fallback: send via CLI (non-streaming)."""
    lang_context = ""
    if CURRENT_LANG == "es":
        lang_context = " [Spanish mode — respond in Spanish, correct my grammar gently]"

    try:
        result = subprocess.run(
            [
                "openclaw", "agent",
                "--session-id", OPENCLAW_VOICE_SESSION,
                "--message", f"[Voice from Mike via AirPods]{lang_context} {text}",
                "--channel", "bluebubbles",
                "--deliver",
                "--json",
                "--timeout", "60",
                "--thinking", "off",
            ],
            capture_output=True, text=True, timeout=70
        )

        if result.returncode != 0:
            return ""

        data = json.loads(result.stdout)
        payloads = data.get("result", {}).get("payloads", [])
        if payloads:
            reply = payloads[0].get("text", "")
            if reply and reply not in ("NO_REPLY", "HEARTBEAT_OK"):
                return reply
        return ""
    except:
        return ""


def deliver_to_imessage(user_text: str, response_text: str):
    """Send both sides of the conversation to iMessage in background."""
    if not OPENCLAW_DELIVER or not response_text:
        return
    # Fire and forget — don't block the voice loop
    try:
        subprocess.Popen(
            [
                "openclaw", "agent",
                "--to", OPENCLAW_SESSION_TO,
                "--message", f"[Voice from Mike via AirPods] {user_text}",
                "--channel", "bluebubbles",
                "--deliver",
                "--json",
                "--timeout", "60",
                "--thinking", "off",
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except:
        pass


def main():
    print("=" * 60)
    print("🦞 Voice Loop — Talk to Quinn")
    print("=" * 60)
    print(f"  STT:   {STT_ENGINE} ({MLX_WHISPER_MODEL if STT_ENGINE == 'mlx-whisper' else 'base.en'})")
    print(f"  Brain: Hybrid — {LOCAL_LLM_MODEL} (local/free) + Sonnet (cloud/complex)")
    print(f"  TTS:   Kokoro sentence-by-sentence ({get_voice()})")
    print(f"  Lang:  English (say 'switch to Spanish' to toggle)")
    print("  Press Ctrl+C to stop\n")

    print("Loading Kokoro model...", flush=True)
    try:
        init_kokoro()
        print("✅ Kokoro loaded", flush=True)
    except Exception as e:
        print(f"⚠️  Failed to load Kokoro: {e}")
        return

    # Pre-warm MLX-Whisper model (loads weights into GPU memory once)
    if STT_ENGINE == "mlx-whisper":
        print("Loading MLX-Whisper model...", flush=True)
        import mlx_whisper
        # Transcribe silence to force model load
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            warm_path = f.name
            sf.write(warm_path, np.zeros(SAMPLE_RATE, dtype=np.float32), SAMPLE_RATE)
        try:
            mlx_whisper.transcribe(warm_path, path_or_hf_repo=MLX_WHISPER_MODEL)
            print("✅ MLX-Whisper loaded\n", flush=True)
        finally:
            os.unlink(warm_path)

    # Pre-warm local LLM (keep model loaded in Ollama memory)
    if LOCAL_LLM_ENABLED:
        print(f"Warming up local LLM ({LOCAL_LLM_MODEL})...", flush=True)
        try:
            warm_payload = json.dumps({
                "model": LOCAL_LLM_MODEL,
                "messages": [{"role": "user", "content": "hi"}],
                "stream": False,
            }).encode()
            warm_req = urllib.request.Request(
                LOCAL_LLM_URL, data=warm_payload,
                headers={"Content-Type": "application/json"},
            )
            urllib.request.urlopen(warm_req, timeout=30)
            print(f"✅ Local LLM warm\n", flush=True)
        except Exception as e:
            print(f"⚠️  Local LLM unavailable ({e}), will use cloud only", flush=True)
            LOCAL_LLM_ENABLED = False

    try:
        default_in = sd.query_devices(kind='input')
        print(f"🎙️  Input: {default_in['name']}")
        print(f"🔈 Output: {sd.query_devices(kind='output')['name']}\n")
    except Exception as e:
        print(f"⚠️  Audio device issue: {e}")
        return

    while running:
        try:
            audio = record_utterance()
            if audio is None:
                continue

            text = transcribe(audio)
            if not text:
                print("   (empty transcription, skipping)", flush=True)
                continue

            hallucinations = {"you", "thank you.", "thanks for watching!", "",
                              "okay", "all right", "yeah", "sure", "cool",
                              "so", "just", "all", "bye", "gracias"}
            words = text.lower().strip().rstrip('.').split()
            if text.lower().strip().rstrip('.') in hallucinations or len(words) < 3:
                print(f"   (filtered: '{text}')", flush=True)
                continue

            print(f"   You: \"{text}\"", flush=True)

            # Check for language switch commands
            if check_language_switch(text):
                continue  # Don't send switch commands to the LLM

            # Route to local or cloud LLM
            if needs_cloud(text):
                response = stream_and_speak(text)
            else:
                response = stream_local_and_speak(text)

        except Exception as e:
            print(f"⚠️  Error: {e}", flush=True)
            time.sleep(1)

    print("👋 Voice loop ended.")


if __name__ == "__main__":
    main()
