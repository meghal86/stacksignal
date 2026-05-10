---
name: wiseocr
description: "Convert PDF files to Markdown using WiseOCR API (powered by WiseDiag). Supports table recognition, multi-column layouts, and medical document OCR. Usage: Upload a PDF file and say Use WiseOCR to process this."
registry:
  homepage: https://github.com/wisediag/wiseocr-skill
  author: WiseDiag
  credentials:
    required: true
    env_vars:
      - WISEDIAG_API_KEY
---

# WiseOCR Skill (powered by WiseDiag)

Convert PDF files into Markdown format. The script handles API authentication, file upload, OCR processing, and saves the result automatically.

## ⚠️ IMPORTANT: How to Use This Skill

**You MUST use the provided script to process files. Do NOT call any API or HTTP endpoint directly.**

The script `scripts/wiseocr.py` handles everything:
- API authentication (reads `WISEDIAG_API_KEY` from environment)
- PDF upload and OCR processing
- Saves the Markdown result to `WiseOCR/{filename}.md`

## 🔑 API Key Setup (Required)

**Get your API key:**
👉 https://console.wisediag.com/apiKeyManage

```bash
export WISEDIAG_API_KEY=your_api_key
```

## Installation

```bash
pip install -r requirements.txt
```

## Usage

**To process a PDF file, run:**

```bash
cd scripts
python wiseocr.py -i /path/to/input.pdf -n original_filename
```

**IMPORTANT:** Always pass `-n` with the original filename (without extension) so the output file is named correctly. If the uploaded file has been renamed (e.g. to `ocr_input.pdf`), `-n` ensures the output uses the user's original filename.

The script will automatically save the result to `WiseOCR/{name}.md`.

**Example:**

```bash
python wiseocr.py -i /tmp/ocr_input.pdf -n 体检报告
# Output saved to: WiseOCR/体检报告.md
```

**With custom output directory:**

```bash
python wiseocr.py -i /path/to/input.pdf -n 体检报告 -o /custom/output/dir
```

## Arguments

| Flag | Description |
|------|-------------|
| `-i, --input` | Input PDF file path (required) |
| `-n, --name` | Original filename without extension for output (recommended) |
| `-o, --output` | Output directory (default: ./WiseOCR) |
| `--dpi` | PDF rendering DPI, 72-600 (default: 200) |

## Output

After the script runs, the Markdown file is saved automatically:

- Default: `WiseOCR/{name}.md`
- The file is named using the `-n` parameter (e.g. `-n 报告` → `报告.md`), or falls back to the input filename
- No additional saving is needed — the file is already on disk

## License

MIT
