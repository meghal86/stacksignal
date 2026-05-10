---
name: gemini-image-generator
description: >
  通过 Gemini 模型实现文生图、图片编辑与多图合成，支持 OpenAI 兼容和 Google 原生两种 API 格式，可自定义端点和密钥。
metadata:
  openclaw:
    emoji: "🎨"
    category: creative
    homepage: "https://github.com/wangyan/gemini-image-generator"
    requires:
      bins:
        - python3
        - uv
      env:
        - GEMINI_BASE_URL
    primaryEnv: GEMINI_API_KEY
    tags:
      - nano-banana-pro
      - image-generation
      - gemini3-pro-image
      - text-to-image
      - image-editing
      - openai-compatible
---

# Gemini Image Generator

通过 Gemini 模型实现文生图、图片编辑与多图合成，支持 OpenAI 兼容和 Google 原生两种 API 格式，可自定义端点和密钥。

## 快速开始

### 1. 安装技能

**方式 A：通过 ClawHub 安装（推荐）**

```bash
clawhub install gemini-image-generator
```

默认安装到 OpenClaw 工作区的 `{workspace}/skills/` 目录下。如需安装到全局目录 `~/.openclaw/skills/`，可指定 `--workdir`：

```bash
clawhub install gemini-image-generator --workdir ~/.openclaw
```

**方式 B：手动安装**

将技能目录复制到以下任一位置：

- `~/.openclaw/skills/gemini-image-generator/` — 全局可用
- `{workspace}/skills/gemini-image-generator/` — 仅当前工作区可用
- 自定义目录 — 需在 `openclaw.json` 中配置 `skills.load.extraDirs`（见下方说明）

```jsonc
{
  "skills": {
    "load": {
      "extraDirs": ["/path/to/your/skills"]  // 数组，可配多个目录
    }
  }
}
```

### 2. 安装依赖

- `python3`（>=3.10）
- `uv`（Python 包管理器）

```bash
# macOS
brew install python3 uv

# Linux (Debian/Ubuntu)
sudo apt install python3
curl -LsSf https://astral.sh/uv/install.sh | sh
```

> 国内用户安装 `uv` 可能会遇到网络问题，请自行[下载安装](https://github.com/astral-sh/uv/releases)。

### 3. 配置

编辑 `~/.openclaw/openclaw.json`，在 `skills.entries` 中添加：

```jsonc
{
  "skills": {
    "entries": {
      "gemini-image-generator": {
        "enabled": true,
        "apiKey": "your-api-key",                  // 必填：Gemini API 密钥
        "env": {
          "GEMINI_BASE_URL": "https://your-provider.com/v1", // 必填：API 端点
          "GEMINI_MODEL": "gemini-3-pro-preview",             // 可选：模型名称
          "GEMINI_API_FORMAT": "openai",           // 可选：openai（默认）或 google
          "GEMINI_TIMEOUT": "300",                 // 可选：超时秒数
          "GEMINI_OUTPUT_DIR": "images"            // 可选：输出目录，
        }
      }
    }
  }
}
```

### 4. 验证安装

```bash
openclaw skills info gemini-image-generator
```

看到 `gemini-image-generator` 状态为 `✓ ready` 即安装成功。如果显示 `✗ missing`，请检查 `python3`、`uv` 是否在 PATH 中，以及 `GEMINI_API_KEY` 和 `GEMINI_BASE_URL` 是否已配置。

## 使用方法

### 生成图片

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "图片描述" --filename "output.png"
```

### 编辑图片（单图）

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "编辑指令" --filename "edited.png" -i "/path/input.png" --resolution 2K
```

### 合成多张图片（最多 14 张）

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "合成指令" --filename "composed.png" -i img1.png -i img2.png -i img3.png
```

### 指定自定义端点

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "描述" --filename "output.png" \
  --base-url "https://example.com/v1" --api-key "sk-xxx" --model "gemini-3-pro-preview"
```

### 使用 Google 原生格式

```bash
uv run {baseDir}/scripts/generate_image.py --prompt "描述" --filename "output.png" --api-format google
```

## 配置参考

优先级：命令行参数 > 环境变量（由 `skills.entries.gemini-image-generator.env` 注入）

| 参数 | 环境变量 | 说明 |
|------|---------|------|
| `--api-key` / `-k` | `apiKey`（通过 primaryEnv 注入） | API 密钥（必填） |
| `--base-url` / `-b` | `GEMINI_BASE_URL` | API 端点 URL（必填） |
| `--model` / `-m` | `GEMINI_MODEL` | 模型名称（默认 `gemini-3-pro-preview`） |
| `--api-format` / `-F` | `GEMINI_API_FORMAT` | `openai`（默认）或 `google` |
| `--timeout` / `-t` | `GEMINI_TIMEOUT` | 超时秒数（默认 300） |
| `--resolution` / `-r` | `GEMINI_RESOLUTION` | `1K`（默认）、`2K`、`4K` |
| `--output-dir` / `-o` | `GEMINI_OUTPUT_DIR` | 输出目录（默认 `images`） |

其他可选参数：

- `--input-image` / `-i`：输入图片路径（可重复，最多 14 张）
- `--quality`：`standard`（默认）或 `hd`
- `--style`：`natural`（默认）或 `vivid`
- `--verbose` / `-v`：输出详细调试信息

## 注意事项

- 文件名使用时间戳格式：`yyyy-mm-dd-hh-mm-ss-name.png`
- 脚本输出 `MEDIA:` 行供 OpenClaw 自动附件到聊天
- 不要回读图片内容，只报告保存路径
- 编辑模式下未指定分辨率时，自动根据输入图片尺寸推断
- 内置 429 限流和超时自动重试（最多 3 次）
- API 响应格式详见 [references/api-formats.md](references/api-formats.md)
