---
name: AudioMind
version: 2.0.0
author: "@wells1137"
emoji: "🧠"
tags:
  - audio
  - tts
  - music
  - sfx
  - voice-clone
  - elevenlabs
  - fal
description: >
  The ultimate AI audio generation skill. Intelligently routes requests to 18+ models from ElevenLabs and fal.ai for TTS, music, SFX, and voice cloning. Zero-config, just ask.
---

## Description

**AudioMind** is a comprehensive, zero-configuration audio generation skill that acts as a smart dispatcher for all your audio needs. It intelligently routes your natural language requests to a vast library of over 18 specialized audio models from leading providers like **ElevenLabs** and **fal.ai**.

Simply install this skill, and your agent instantly gains the ability to perform:

- **Text-to-Speech (TTS)**: Using 9 different models for various languages, styles, and latencies.
- **Music Generation**: Creating royalty-free instrumental tracks in multiple genres.
- **Sound Effect (SFX) Generation**: Producing a wide range of sound effects from text descriptions.
- **Voice Cloning**: Cloning a voice from an audio sample to generate new speech.

This skill is powered by a backend proxy service that securely manages API keys and usage, providing a seamless, plug-and-play experience for the end-user.

## How It Works

1.  **Installation**: The user installs the `audiomind` skill.
2.  **Request**: The user makes a natural language request for audio (e.g., "*Create a sound effect of a passing train*").
3.  **Smart Routing**: AudioMind analyzes the request and consults its internal model registry to select the best model for the job.
4.  **Proxy Call**: The skill sends a structured request to the AudioMind Proxy Service.
5.  **API Execution**: The proxy service calls the appropriate underlying API (ElevenLabs or fal.ai) with the correct parameters.
6.  **Result**: The generated audio is returned to the user.

## Usage

This skill is designed to be used with natural language. The `smartRoute` logic will automatically determine the best model. However, you can also specify a model directly.

**Smart Routing (Recommended)**

```
# TTS
"Narrate this: Hello, world!"

# Music
"Compose a 30-second upbeat lo-fi hip hop track."

# SFX
"I need the sound of a thunderstorm."

# Voice Clone
"Clone the voice from this audio file and say: Welcome to the future."
```

**Direct Model Selection (Advanced)**

```json
{
  "action": "tts",
  "text": "This is a test.",
  "model": "minimax-tts-hd"
}
```

## Model Registry (v2.0.0)

AudioMind v2.0 intelligently routes requests to the following models:

| Type          | Model ID                    | Provider   | Description                                           |
| :------------ | :-------------------------- | :--------- | :---------------------------------------------------- |
| **TTS**       | `elevenlabs-tts-v3`         | ElevenLabs | Most expressive, multilingual                         |
|               | `elevenlabs-tts-v2`         | ElevenLabs | Stable, 29 languages                                  |
|               | `elevenlabs-tts-turbo`      | ElevenLabs | Ultra-low latency, 32 languages                       |
|               | `minimax-tts-hd`            | fal.ai     | High quality, multilingual                            |
|               | `minimax-tts-2.6-hd`        | fal.ai     | MiniMax Speech-2.6 HD                                 |
|               | `minimax-tts-2.8-hd`        | fal.ai     | Latest MiniMax TTS                                    |
|               | `minimax-tts-2.8-turbo`     | fal.ai     | Fast, low latency                                     |
|               | `chatterbox-tts`            | fal.ai     | Emotion-aware TTS                                     |
|               | `playai-dialog`             | fal.ai     | Multi-speaker dialogue generation                     |
| **Voice Clone** | `dia-voice-clone`           | fal.ai     | Clone any voice from an audio sample                  |
| **Music**     | `elevenlabs-music`          | ElevenLabs | Composition-plan based music                          |
|               | `beatoven-music`            | fal.ai     | Royalty-free instrumental, 10+ genres                 |
|               | `cassetteai-music`          | fal.ai     | Fast music generation                                 |
| **SFX**       | `elevenlabs-sfx`            | ElevenLabs | Text-to-sound-effects                                 |
|               | `beatoven-sfx`              | fal.ai     | Professional sound effects                            |
|               | `mirelo-video-to-audio`     | fal.ai     | Generate synced audio for video                       |
|               | `mirelo-video-to-video`     | fal.ai     | Add sound track to video                              |

## Commercial Use

This skill includes a free tier of **100 generations**. For unlimited use, please upgrade to AudioMind Pro by visiting our Gumroad page (link will be provided when the free limit is reached).

To activate Pro, set the `AUDIOMIND_PRO_KEY` environment variable with the key you receive after purchase.
