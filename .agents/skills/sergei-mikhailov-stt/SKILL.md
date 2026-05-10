---
name: sergei-mikhailov-stt
description: Speech recognition from voice messages. Use when you need to convert a voice message to text.
metadata: {"openclaw": {"requires": {"bins": ["ffmpeg", "python3"], "env": ["YANDEX_API_KEY", "YANDEX_FOLDER_ID"]}, "primaryEnv": "YANDEX_API_KEY"}}
---

# Speech to Text Skill for OpenClaw

## Purpose

This skill recognizes speech from voice messages sent via any messenger connected to OpenClaw, using various STT providers, including Yandex SpeechKit.

## When to Activate

Use this skill when:
- The user sends a voice message via any messenger connected to OpenClaw
- You need to convert speech to text
- Audio file transcription is required
- A text version of a voice message is needed

## How It Works

### 1. Receive the audio file from OpenClaw
- OpenClaw provides a local path to the audio file
- Verify the file exists at the given path
- Validate the file format (OGG, WAV, MP3)
- Check file size (maximum 50 MB)

Example path from OpenClaw:
```
/home/user_folder/.openclaw/media/inbound/file_1---9a53bac2-0392-41e7-8300-1c08e8eec027.ogg
```

### 2. Audio processing
- Validate the audio file at the local path
- Convert to a supported format if needed using ffmpeg
- Verify audio quality

### 3. Speech recognition
- Use the default provider (Yandex SpeechKit)
- If recognition fails, try alternative providers
- Return the recognized text with confidence information

### 4. Result handling
- Format the recognized text
- Include the detected language
- Provide metadata if needed

## Installation

### 1. Install the skill

```bash
clawhub install sergei-mikhailov-stt
```

The skill will be placed at `~/.openclaw/workspace/skills/sergei-mikhailov-stt/`.

### 2. Install Python dependencies

Navigate to the installed skill folder and install dependencies into a virtual environment:

```bash
cd ~/.openclaw/workspace/skills/sergei-mikhailov-stt
```

On Debian/Ubuntu, first install the venv package if not already present:
```bash
sudo apt install python3-venv
```

Then create and activate the virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

> On modern Debian/Ubuntu systems (Python 3.12+), installing packages system-wide is restricted. Use the virtual environment as shown above.

## Configuration

### 1. Set API keys (recommended — via OpenClaw config)

Add credentials to `~/.openclaw/openclaw.json`:
```json
{
  "skills": {
    "entries": {
      "sergei-mikhailov-stt": {
        "env": {
          "YANDEX_API_KEY": "your_api_key_here",
          "YANDEX_FOLDER_ID": "your_folder_id_here"
        }
      }
    }
  }
}
```

### 2. Alternative — via `.env` file
Copy and edit the example file inside the skill folder:
```bash
cp assets/.env.example .env
```
```
YANDEX_API_KEY=your_api_key_here
YANDEX_FOLDER_ID=your_folder_id_here
STT_DEFAULT_PROVIDER=yandex
```

### 3. Restart OpenClaw to apply changes

```bash
openclaw gateway stop && openclaw gateway start
```

### 4. Provider configuration (optional)
In `config.json`, set parameters for each provider:
```json
{
  "default_provider": "yandex",
  "providers": {
    "yandex": {
      "api_key": "${YANDEX_API_KEY}",
      "folder_id": "${YANDEX_FOLDER_ID}",
      "lang": "ru-RU"
    }
  }
}
```

## Adding a New STT Provider

### 1. Create the provider class
```python
# scripts/providers/new_provider.py
from .base_provider import BaseSTTProvider

class NewProvider(BaseSTTProvider):
    name = "new_provider"

    def recognize(self, audio_file_path: str, language: str = 'ru-RU') -> str:
        # Recognition implementation
        pass

    def validate_config(self, config: dict) -> bool:
        # Configuration validation
        pass

    def get_supported_formats(self) -> list:
        return ['ogg', 'wav', 'mp3']
```

### 2. Register the provider
Add to `scripts/stt_processor.py` in the `_get_provider` method:
```python
if provider_name == 'new_provider':
    return NewProvider(provider_config)
```

### 3. Update configuration
Add the new provider section to `config.json`:
```json
{
  "providers": {
    "new_provider": {
      "api_key": "${NEW_PROVIDER_API_KEY}",
      "model": "latest"
    }
  }
}
```

## Usage Examples

### Basic scenario
```
User: [sends a voice message]
OpenClaw: Recognized text: "Hello, how are you?"
```

### With language specified
```
User: Transcribe this English voice message
OpenClaw: Recognized text (en-US): "Hello, how are you today?"
```

### With metadata
```
User: Analyze this voice message
OpenClaw: Recognized text: "Meeting tomorrow at 3 PM"
Language: ru-RU
Confidence: 95%
Provider: Yandex SpeechKit
```

## Error Handling

When the skill returns an error, explain it to the user in plain language and suggest a concrete next step. Do not show raw error messages or stack traces.

| Error | Say to the user | Next step |
|-------|----------------|-----------|
| `File too large` | "The voice message is too long — maximum is about 30 seconds for now." | Ask them to send a shorter message |
| `Unsupported format` | "This audio format is not supported." | Tell them supported formats: OGG, WAV, MP3, M4A, FLAC, AAC |
| `API key invalid / HTTP 401` | "There's a problem with the Yandex SpeechKit API key." | Ask owner to check `YANDEX_API_KEY` in openclaw.json |
| `Folder access denied / HTTP 403` | "Access to Yandex SpeechKit is denied." | Ask owner to verify the service account has `ai.speechkit.user` role |
| `Too many requests / HTTP 429` | "Yandex SpeechKit is rate-limiting us right now." | Try again in a few seconds |
| `FFmpeg not found` | "Audio conversion tool (FFmpeg) is not installed on the server." | Owner needs to run `brew install ffmpeg` or `apt install ffmpeg` |
| `API request timed out` | "Yandex SpeechKit did not respond in time." | Try again; if it repeats, the service may be down |
| `Missing YANDEX_API_KEY` | "The skill is not configured yet — API keys are missing." | Owner needs to add keys to `~/.openclaw/openclaw.json` |

### Troubleshooting (for the owner)
1. Verify API key configuration in `~/.openclaw/openclaw.json`
2. Ensure ffmpeg is installed: `ffmpeg -version`
3. Check Yandex Cloud service account has role `ai.speechkit.user`
4. Check gateway logs: `openclaw logs`

## Limitations

- Maximum file size: 50 MB
- Yandex SpeechKit v1 sync API limit: 1 MB per request
- Supported formats: OGG, WAV, MP3, M4A, FLAC, AAC
- Languages: Russian (ru-RU), English (en-US)
- Processing time: up to 5 minutes
- Maximum audio duration: 30 minutes

## Requirements

- Python 3.8+
- FFmpeg
- Configured API keys for STT providers

## Result Metadata

On successful recognition:
```json
{
  "text": "Recognized text",
  "language": "ru-RU",
  "confidence": 0.95,
  "provider": "yandex",
  "processing_time": 2.5
}
```
