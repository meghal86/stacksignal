---
name: douyin-download
description: 抖音无水印视频下载和文案提取工具
homepage: https://github.com/yzfly/douyin-mcp-server
metadata:
  openclaw:
    emoji: 🎵
    requires:
      bins: [ffmpeg]
---

# douyin-download Skill

抖音无水印视频下载和文案提取工具的 Node.js 版本。

## 功能

- 🎬 获取无水印视频下载链接
- 📥 下载抖音视频
- 🎙️ 从视频中提取语音文案（需要 API Key）

## 环境变量

- `SILI_FLOW_API_KEY` - 硅基流动 API 密钥（用于语音转文字）

获取 API Key: https://cloud.siliconflow.cn/

## 使用方法

### 获取视频信息

```bash
node /root/.openclaw/workspace/skills/douyin-download/douyin.js info "抖音分享链接"
node /root/.openclaw/workspace/skills/douyin-download/douyin.js info "7597329042169220398"
```

### 下载视频

```bash
node /root/.openclaw/workspace/skills/douyin-download/douyin.js download "抖音链接" -o /tmp/douyin-download
```

### 提取文案

```bash
export SILI_FLOW_API_KEY="your-api-key"
node /root/.openclaw/workspace/skills/douyin-download/douyin.js extract "抖音链接" -o /tmp/douyin-download
```

## 在 OpenClaw 中调用

通过 exec 工具调用：

```
node /root/.openclaw/workspace/skills/douyin-download/douyin.js info <抖音链接|modal_id>
```
