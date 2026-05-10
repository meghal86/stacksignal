---
name: agent2rss-client
description: Agent2RSS 客户端，管理 RSS 频道并推送内容。触发：用户提到 Agent2RSS/RSS 频道/推送文章/幂等性/上传文章/创建频道/设置默认频道。
---

# Agent2RSS Client（OpenClaw 版）

帮助创建/管理 Agent2RSS 频道，推送文章到 RSS Feed。核心动作：初始化配置、创建/选择频道、文件上传推送（推荐）、JSON 推送、列出/设置默认/删除频道。

## 一键脚本（macOS/Linux）
- 路径：`scripts/agent2rss.sh`（需要 bash、curl、jq）
- 子命令：
  - `init [serverUrl]` 初始化配置（默认指向官方服务）
  - `health` 健康检查
  - `create-channel <name> [desc]` 创建频道并设为默认
  - `update-channel <channelId> <name> <desc>` 更新频道名称/描述（需频道 token）
  - `list` 列出本地配置的频道
  - `set-default <channelId>` 设置默认
  - `push-file <path> [idempotencyKey] [channelId]` 上传文件推送
  - `push-json <file|-> [idempotencyKey] [channelId]` JSON 推送，自动补上 idempotencyKey

常用示例：
```bash
# 初始化（官方服务）
scripts/agent2rss.sh init
# 创建频道
scripts/agent2rss.sh create-channel "技术博客" "分享技术文章"
# 查看频道 & 默认
scripts/agent2rss.sh list
# 设置默认
scripts/agent2rss.sh set-default <channelId>
# 推送文件（自动生成幂等键）
scripts/agent2rss.sh push-file article.md
# 更新频道
scripts/agent2rss.sh update-channel <channelId> "新名称" "新描述"
# 推送 JSON
scripts/agent2rss.sh push-json post.json
```

## 路径约定（必须）
- 配置与缓存目录：`$HOME/.openclaw/workspace/.skill-data/agent2rss-client/`
- 配置文件：`$CONFIG_DIR/config.json`
- 初始模板：`assets/config-template.json`
- 官方默认服务：`http://agent2rss.yaotutu.top:8765`（用户可改为自部署，模板默认 localhost）

## 依赖检查（示例片段）
```bash
command -v curl >/dev/null || { echo "缺少 curl"; exit 1; }
command -v jq   >/dev/null || { echo "缺少 jq (mac: brew install jq)"; exit 1; }
set -euo pipefail
```

## 初始化配置（默认直指官方服务，空则自动建频道）
```bash
CONFIG_DIR="$HOME/.openclaw/workspace/.skill-data/agent2rss-client"
CONFIG_FILE="$CONFIG_DIR/config.json"
TEMPLATE="$(dirname "$0")/assets/config-template.json"
mkdir -p "$CONFIG_DIR"

# 依赖优先级：jq > python > 手动确认
has_jq=false; has_py=false
command -v jq >/dev/null && has_jq=true
command -v python >/dev/null && has_py=true

if [ ! -f "$CONFIG_FILE" ]; then
  cp "$TEMPLATE" "$CONFIG_FILE"
  if $has_jq; then
    jq '.serverUrl = "http://agent2rss.yaotutu.top:8765"' "$CONFIG_FILE" >"$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  elif $has_py; then
    python - <<'PY'
import json, pathlib
p = pathlib.Path("${CONFIG_FILE}")
data = json.loads(p.read_text())
data["serverUrl"] = "http://agent2rss.yaotutu.top:8765"
p.write_text(json.dumps(data, ensure_ascii=False, indent=2))
PY
  else
    echo "⚠️ 无 jq/python，已用模板初始化；默认 serverUrl 仍是 localhost，如需自部署或官方地址请手动修改 config.json"
  fi
  echo "配置已初始化: $CONFIG_FILE"
else
  echo "config exists, skip init"
fi

# 轻量校验（仅在有 jq/python 时自动做；否则用户手动确认）
if $has_jq; then
  SERVER_URL=$(jq -r '.serverUrl' "$CONFIG_FILE")
  DEFAULT_ID=$(jq -r '.currentChannelId' "$CONFIG_FILE")
  if [ -z "$SERVER_URL" ]; then echo "invalid config: serverUrl empty"; exit 1; fi
elif $has_py; then
  python - <<'PY'
import json, sys, pathlib
p = pathlib.Path("${CONFIG_FILE}")
data = json.loads(p.read_text())
if not data.get("serverUrl"):
    sys.stderr.write("invalid config: serverUrl empty\n")
    sys.exit(1)
PY
  SERVER_URL=$(python - <<'PY'
import json, pathlib
p = pathlib.Path("${CONFIG_FILE}")
print(json.loads(p.read_text()).get("serverUrl",""))
PY)
  DEFAULT_ID=""  # 如需频道校验再补充
else
  echo "⚠️ 无 jq/python，无法自动校验；请用户手动确认 config.json（serverUrl/频道/token）后继续。"
  SERVER_URL=""; DEFAULT_ID=""
fi

# 兜底：若无频道或无 currentChannelId，自动创建默认频道
if $has_jq && [ "$(jq '.channels | length' "$CONFIG_FILE")" -eq 0 -o "$(jq -r '.currentChannelId' "$CONFIG_FILE")" = "null" ]; then
  NAME="AI Briefing"; DESC="Auto-created default channel"
  RESP=$(curl -fsS -X POST "$SERVER_URL/api/channels" -H "Content-Type: application/json" -d "{\"name\":\"$NAME\",\"description\":\"$DESC\"}")
  NEW_ID=$(echo "$RESP" | jq -r '.channel.id // .id')
  NEW_TOKEN=$(echo "$RESP" | jq -r '.channel.token // .token')
  jq ".channels += [{id:\"$NEW_ID\",name:\"$NAME\",description:\"$DESC\",token:\"$NEW_TOKEN\",postsUrl:\"$SERVER_URL/api/channels/$NEW_ID/posts\",rssUrl:\"$SERVER_URL/channels/$NEW_ID/rss.xml\"}] | .currentChannelId = \"$NEW_ID\"" "$CONFIG_FILE" >"$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
  echo "Auto-created default channel: $NEW_ID"
elif $has_py; then
  python - <<'PY'
import json, pathlib, subprocess, sys
p = pathlib.Path("${CONFIG_FILE}")
data = json.loads(p.read_text())
if (not data.get("channels")) or (data.get("currentChannelId") in (None, "", "null")):
    import urllib.request, json as js
    NAME="AI Briefing"; DESC="Auto-created default channel"
    SERVER_URL = data.get("serverUrl")
    payload = js.dumps({"name": NAME, "description": DESC}).encode()
    req = urllib.request.Request(f"{SERVER_URL}/api/channels", data=payload, headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req) as resp:
        resp_data = js.loads(resp.read())
    new_id = resp_data.get('channel',{}).get('id') or resp_data.get('id')
    new_token = resp_data.get('channel',{}).get('token') or resp_data.get('token')
    if not new_id or not new_token:
        sys.exit("auto-create channel failed: missing id/token")
    data.setdefault('channels', []).append({
        'id': new_id,
        'name': NAME,
        'description': DESC,
        'token': new_token,
        'postsUrl': f"{SERVER_URL}/api/channels/{new_id}/posts",
        'rssUrl': f"{SERVER_URL}/channels/{new_id}/rss.xml",
    })
    data['currentChannelId'] = new_id
    p.write_text(js.dumps(data, ensure_ascii=False, indent=2))
    print(f"Auto-created default channel: {new_id}")
PY
fi
```

> 默认用官方地址，除非用户明确要自部署/改地址。无频道或无 currentChannelId 时自动创建默认频道（有 jq/python 时自动执行；无依赖时请用户手动创建/确认）。
## 常用变量提取
```bash
CHANNEL_ID="${TARGET_CHANNEL_ID:-$DEFAULT_ID}"
TOKEN=$(jq -r ".channels[] | select(.id==\"$CHANNEL_ID\") | .token" "$CONFIG_FILE")
POSTS_URL=$(jq -r ".channels[] | select(.id==\"$CHANNEL_ID\") | .postsUrl" "$CONFIG_FILE")
```
若 TOKEN/CHANNEL_ID 为空，提示用户先创建/选择频道。

## 创建频道（并加入配置）
```bash
NAME="技术博客"; DESC="分享技术文章"
RESP=$(curl -fsS -X POST "$SERVER_URL/api/channels" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$NAME\",\"description\":\"$DESC\"}")
NEW_ID=$(echo "$RESP" | jq -r '.channel.id // .id')
NEW_TOKEN=$(echo "$RESP" | jq -r '.channel.token // .token')

jq ".channels += [{
  id: \"$NEW_ID\",
  name: \"$NAME\",
  description: \"$DESC\",
  token: \"$NEW_TOKEN\",
  postsUrl: \"$SERVER_URL/api/channels/$NEW_ID/posts\",
  rssUrl: \"$SERVER_URL/channels/$NEW_ID/rss.xml\"
}] | .currentChannelId = ( .currentChannelId // \"$NEW_ID\" )" \
  "$CONFIG_FILE" >"$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

echo "RSS: $SERVER_URL/channels/$NEW_ID/rss.xml"
```

## 推送文章（推荐：文件上传）
```bash
FILE=article.md
IDEMPOTENCY_KEY=${IDEMPOTENCY_KEY:-$(basename "$FILE")-$(date +%s)}
CHANNEL_ID="${TARGET_CHANNEL_ID:-$DEFAULT_ID}"
TOKEN=$(jq -r ".channels[] | select(.id==\"$CHANNEL_ID\") | .token" "$CONFIG_FILE")

curl -fsS -X POST "$SERVER_URL/api/channels/$CHANNEL_ID/posts/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$FILE" \
  -F "idempotencyKey=$IDEMPOTENCY_KEY"
```
优先上传文件，避免 JSON 转义。可选字段：title/tags/author/idempotencyKey。

## 推送文章（JSON，简单内容时）
```bash
curl -fsS -X POST "$SERVER_URL/api/channels/$CHANNEL_ID/posts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"# 标题\\n\\n正文","idempotencyKey":"key-001"}'
```

## 频道管理
- **列出频道**：`jq -r '.channels[] | "• \(.name) (ID: \(.id)) | RSS: \(.rssUrl) | 默认: \(.id==.currentChannelId)"' "$CONFIG_FILE"`
- **设为默认**：`jq ".currentChannelId = \"$CHANNEL_ID\"" "$CONFIG_FILE" >"$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"`
- **删除频道**：`curl -X DELETE "$SERVER_URL/api/channels/$CHANNEL_ID" -H "Authorization: Bearer $TOKEN"` 后用 jq 删除本地条目；如删的是默认，切换到剩余首个或置空并提示创建新频道。

## 幂等性建议
- 默认使用 `文件名-时间戳` 或 `内容哈希`；业务场景可用文章 URL。
- `isNew: true/false` 区分新建或重复。

## 错误处理
- 401：检查 token；提示不要暴露 token。
- 404：检查频道 ID；可先 GET /api/channels。
- 400：缺 content/file；提示用户。
- 5xx：提示稍后重试或检查自部署服务。

## 安全与提示
- Token 不写入日志/回显；不要提交到仓库。
- 所有 URL 基于 `config.json` 的 `serverUrl` 生成，禁止硬编码 localhost（除非用户确认自部署）。
- 参考完整 API 示例：`references/api-examples.md`。

## 快速路径
1) 初始化并改 serverUrl：复制模板 + `jq '.serverUrl="http://agent2rss.yaotutu.top:8765"'` 写回。
2) 创建频道 → 自动写入 config，缺省设为 currentChannelId。
3) 推送：用上传接口 + idempotencyKey。
4) 提供 RSS：`$SERVER_URL/channels/$CHANNEL_ID/rss.xml`。
