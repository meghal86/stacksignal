---
name: printpal-3d
description: Generate 3D models for 3D printing from images or text prompts using PrintPal API. Use when the user wants to create 3D printable models, convert images to STL/GLB/OBJ files, or generate 3D assets from text descriptions. Supports text-to-image via WaveSpeed when WAVESPEED_API_KEY is configured. Works with file paths, URLs, or images pasted directly into chat.
---

# PrintPal 3D Model Generator

Generate 3D models from images or text prompts for 3D printing.

## Quick Start

**From an image path or URL:**
```bash
python3 {baseDir}/scripts/generate_3d.py --image /path/to/image.png
```

**From text prompt:**
```bash
python3 {baseDir}/scripts/generate_3d.py --prompt "a cute robot toy"
```

## Workflow

1. **Get the image:**
   - If user provides a file path → use it directly
   - If user provides a URL → download it
   - If user pastes an image → use it directly (it will be available as a file path or URL in context)
   - If user provides text → generate image via WaveSpeed first

2. **Generate 3D model:**
   - Use PrintPal API with `super` quality (768 cubed)
   - Default output format: STL
   - Save to `printpal-output/` directory in workspace

3. **Provide downloads:**
   - Start file server if needed
   - Return clickable URLs

## Default Settings

| Setting | Default | Options |
|---------|---------|---------|
| Quality | super | default, high, ultra, super, super_texture, superplus, superplus_texture |
| Format | stl | stl, glb, obj, ply, fbx |

## Scripts

### generate_3d.py

Main script for generating 3D models.

```bash
python3 scripts/generate_3d.py [OPTIONS]

Options:
  -i, --image PATH      Input image file path or URL
  -p, --prompt TEXT     Text prompt (uses WaveSpeed to generate image first)
  -q, --quality TEXT    Quality level (default: super)
  -f, --format TEXT     Output format (default: stl)
  -o, --output-dir DIR  Output directory
  --json                Output results as JSON
```

### serve_files.py

Start HTTP server for file downloads.

```bash
python3 scripts/serve_files.py [OPTIONS]

Options:
  -d, --directory DIR   Directory to serve (default: printpal-output/)
  -p, --port PORT       Port number (default: 8765)
```

## Quality Levels

| Quality | Resolution | Credits | Est. Time |
|---------|-----------|---------|-----------|
| default | 256³ | 4 | 20 sec |
| high | 384³ | 6 | 30 sec |
| ultra | 512³ | 8 | 60 sec |
| **super** | 768³ | 20 | 3 min |
| superplus | 1024³ | 30 | 4 min |

## Output Formats

| Format | Best For |
|--------|----------|
| **STL** | 3D printing (default) |
| GLB | Web/games |
| OBJ | Universal compatibility |
| PLY | Point clouds |
| FBX | Autodesk software |

## API Keys

Required environment variables (configure in `~/.openclaw/openclaw.json` under `env`):

- `PRINTPAL_API_KEY` - Get from https://printpal.io/api-keys
- `WAVESPEED_API_KEY` - Get from https://wavespeed.ai/accesskey (optional, for text-to-image)

## Output Directory

Files are saved to `printpal-output/` in the workspace.

## Error Handling

| Error | Solution |
|-------|----------|
| WAVESPEED_API_KEY not set | Provide image directly or configure API key |
| PRINTPAL_API_KEY not set | Configure in OpenClaw settings |
| Insufficient credits | Purchase at printpal.io/buy-credits |
| Package not installed | Run `pip install printpal wavespeed` |

## Reference

For detailed API documentation, see [api-reference.md](references/api-reference.md).
