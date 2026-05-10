---
name: joplin-api
description: Manage Joplin notes, notebooks, and tags via Joplin Data API. Use when the user needs to create, read, update, delete, search, or organize Joplin notes programmatically. Supports custom host/port for local, Docker, or remote Joplin deployments.
allowed-tools: Bash(joplin-api:*)
homepage: https://joplinapp.org/help/api/references/rest_api/
metadata:
  openclaw:
    requires:
      bins: [python3]
    install:
      - id: deps
        kind: pip
        package: requests python-dotenv
        label: Install Python dependencies
    env:
      - name: JOPLIN_HOST
        required: false
        default: localhost
        description: Joplin Data API host
      - name: JOPLIN_PORT
        required: false
        default: "41184"
        description: Joplin Data API port
      - name: JOPLIN_TOKEN
        required: true
        description: API Token from Joplin Web Clipper settings
---

# Joplin API Skill

通过 Joplin Data API 管理笔记、笔记本和标签。支持自定义主机地址和端口，适用于本地、Docker 或远程部署的 Joplin。

## 🔐 环境变量

**必需配置**: `JOPLIN_TOKEN` (API Token)

**可选配置**: `JOPLIN_HOST` (默认：localhost), `JOPLIN_PORT` (默认：41184)

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `JOPLIN_HOST` | 可选 | `localhost` | Joplin 主机地址（IP 或域名） |
| `JOPLIN_PORT` | 可选 | `41184` | Joplin Data API 端口 |
| `JOPLIN_TOKEN` | **必需** | - | 从 Joplin Web Clipper 获取的 API Token |

### 配置方法

**方法 1: 使用配置模板**

```bash
cd /root/.openclaw/workspace/skills/joplin-api
cp CONFIG.example .env
# 编辑 .env 填入你的 API Token
```

**方法 2: 手动创建 .env 文件**

```bash
# .env 文件内容
JOPLIN_HOST=localhost
JOPLIN_PORT=41184
JOPLIN_TOKEN=your_api_token_here
```

**方法 3: 使用系统环境变量**

```bash
export JOPLIN_TOKEN="your_token"
export JOPLIN_HOST="192.168.1.100"  # 可选
export JOPLIN_PORT="41184"          # 可选
```

## 🎯 功能特性

### 基础操作
- ✅ **连接测试** - 验证 API 连接状态
- ✅ **统计信息** - 查看笔记本、笔记、标签数量
- ✅ **最近笔记** - 查看最近更新的笔记

### 笔记管理
- ✅ **列出笔记** - 查看所有笔记或指定笔记本的笔记
- ✅ **获取笔记** - 查看笔记详情和内容
- ✅ **创建笔记** - 新建笔记到指定笔记本
- ✅ **更新笔记** - 修改笔记标题或内容
- ✅ **删除笔记** - 删除单条笔记
- ✅ **搜索笔记** - 按关键词搜索笔记
- ✅ **移动笔记** - 移动笔记到其他笔记本
- ✅ **导出笔记** - 导出为 Markdown 或 JSON

### 笔记本管理
- ✅ **列出笔记本** - 查看所有笔记本
- ✅ **创建笔记本** - 新建笔记本或子笔记本
- ✅ **重命名笔记本** - 修改笔记本名称
- ✅ **删除笔记本** - 删除空笔记本

### 标签管理
- ✅ **列出标签** - 查看所有标签
- ✅ **查看笔记标签** - 查看某条笔记的标签
- ✅ **添加标签** - 为笔记添加标签（自动创建新标签）
- ✅ **移除标签** - 从笔记移除标签

### 批量操作
- ✅ **批量移动** - 移动整个笔记本的笔记
- ✅ **批量导入** - 导入 Markdown 文件或整个目录
- ✅ **批量导出** - 导出所有笔记到本地

## 🚀 快速开始

### 1. 安装依赖

```bash
pip install requests python-dotenv
```

### 2. 配置连接

```bash
cd /root/.openclaw/workspace/skills/joplin-api
cp CONFIG.example .env
```

编辑 `.env` 文件:

```bash
# Joplin Data API 配置
JOPLIN_HOST=localhost          # 主机地址（IP、域名均可）
JOPLIN_PORT=41184              # API 端口
JOPLIN_TOKEN=your_api_token    # 从 Joplin 获取的 API Token
```

### 3. 获取 API Token

1. 打开 Joplin 桌面版
2. 进入 **工具** → **选项** → **Web Clipper**
3. 勾选 **启用 Web Clipper 服务**
4. 复制 **"API Token"** 填入 `.env`

### 4. 测试连接

```bash
python3 scripts/joplin_ping.py
```

看到 `✅ 连接成功!` 即表示配置正确。

## 📖 使用指南

### 统一入口（推荐）

使用 `joplin` 统一命令:

```bash
python3 scripts/joplin.py <command> [args]
```

### 各命令详解

#### 🔍 查询类

```bash
# 测试连接
python3 scripts/joplin.py ping

# 查看统计
python3 scripts/joplin.py stats

# 最近笔记
python3 scripts/joplin.py recent --limit 5

# 列出所有笔记本
python3 scripts/joplin.py folders list

# 列出所有笔记
python3 scripts/joplin.py list --type notes

# 列出所有标签
python3 scripts/joplin.py tags list

# 查看某笔记本的笔记
python3 scripts/joplin.py folder-notes --folder "工作"

# 搜索笔记
python3 scripts/joplin.py search "会议纪要"

# 查看笔记详情
python3 scripts/joplin.py get --id <note_id>

# 查看笔记的标签
python3 scripts/joplin.py tags note-tags --note-id <note_id>
```

#### ✏️ 编辑类

```bash
# 创建笔记
python3 scripts/joplin.py create --title "待办" --body "内容..."
python3 scripts/joplin.py create --title "笔记" --folder "工作"

# 更新笔记
python3 scripts/joplin.py update --id <note_id> --title "新标题"
python3 scripts/joplin.py update --id <note_id> --body "新内容"

# 移动笔记
python3 scripts/joplin.py move --note-id <note_id> --to-folder "归档"

# 添加标签
python3 scripts/joplin.py tags add --note-id <note_id> --tag "重要"

# 移除标签
python3 scripts/joplin.py tags remove --note-id <note_id> --tag-id <tag_id>

# 删除笔记
python3 scripts/joplin.py delete --id <note_id> --type notes

# 创建笔记本
python3 scripts/joplin.py folders create --name "新项目"

# 重命名笔记本
python3 scripts/joplin.py folders rename --id <folder_id> --name "新名称"

# 删除笔记本
python3 scripts/joplin.py folders delete --id <folder_id>
```

#### 📦 导入导出

```bash
# 导出单条笔记
python3 scripts/joplin.py export --note-id <note_id> -o output.md

# 导出所有笔记
python3 scripts/joplin.py export --all -o ./backup

# 导入单个文件
python3 scripts/joplin.py import note.md --folder "导入"

# 导入整个目录
python3 scripts/joplin.py import ./notes --folder "批量导入"
```

#### 🔄 批量操作

```bash
# 批量移动整个笔记本
python3 scripts/joplin.py move --batch-from "旧文件夹" --batch-to "新文件夹"
```

## 🔧 配置示例

### 本地 Joplin（默认）
```bash
JOPLIN_HOST=localhost
JOPLIN_PORT=41184
```

### Docker 部署
```bash
JOPLIN_HOST=192.168.1.100
JOPLIN_PORT=41184
```

### 远程服务器 + 反向代理
```bash
JOPLIN_HOST=joplin.example.com
JOPLIN_PORT=443
```

## 📝 使用场景

### 场景 1: 快速记录
```bash
python3 scripts/joplin.py create --title "临时想法" --body "..." --folder "Inbox"
```

### 场景 2: 整理笔记
```bash
# 查看 Inbox 有哪些笔记
python3 scripts/joplin.py folder-notes --folder "Inbox"

# 移动到对应分类
python3 scripts/joplin.py move --note-id <id> --to-folder "工作"
```

### 场景 3: 备份
```bash
# 每周导出所有笔记
python3 scripts/joplin.py export --all -o ~/joplin-backup/$(date +%Y%m%d)
```

### 场景 4: 知识整理
```bash
# 搜索相关笔记
python3 scripts/joplin.py search "机器学习"

# 批量添加标签
for id in $(...); do
  python3 scripts/joplin.py tags add --note-id $id --tag "AI"
done
```

## ⚠️ 注意事项

1. **Web Clipper 必须启用** - Data API 依赖此服务
2. **端口防火墙** - 远程访问需开放 41184 端口
3. **API Token 安全** - 不要泄露 Token，建议用 `.env` 文件
4. **备份** - 删除操作不可恢复，建议定期导出

## 🐛 故障排查

**无法连接:**
- 检查 Joplin 是否运行
- 确认 Web Clipper 已启用
- 验证主机地址和端口

**认证失败:**
- 检查 API Token 是否正确
- Token 可在 Joplin 设置中重新生成

**权限问题:**
- 确保脚本可执行：`chmod +x scripts/*.py`
