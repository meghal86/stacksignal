# Human-Like Memory Skill for OpenClaw

为 OpenClaw 提供长期记忆能力的 Skill，让 AI 助手能够记住过去的对话内容。

## 功能

- **记忆召回** - 根据当前对话自动检索相关的历史记忆
- **记忆存储** - 将重要的对话内容保存到长期记忆
- **记忆搜索** - 显式搜索特定主题的记忆

## 安装

### 从 ClawHub 安装（推荐）

```bash
openclaw skill install human-like-memory
```

### 手动安装

```bash
# 克隆仓库
git clone https://gitlab.ttyuyin.com/personalization_group/human-like-mem-openclaw-skill.git

# 复制到 OpenClaw skills 目录
cp -r human-like-mem-openclaw-skill ~/.openclaw/skills/human-like-memory
```

## 配置

### 方式一：安装时自动配置

当通过 ClawHub 安装时，OpenClaw 会自动检测 `skill.json` 中声明的 secrets，并弹出配置表单让你填写。
如果安装时跳过了表单，可以在后续进入 Skill 设置页补填 `HUMAN_LIKE_MEM_API_KEY`。

### 方式二：运行配置脚本

```bash
cd ~/.openclaw/skills/human-like-memory
bash scripts/setup.sh
```

### 安装后快速检查

执行下面命令检查 API Key 是否已配置：

```bash
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs config
```

如果输出里 `apiKeyConfigured` 为 `false`，请执行：

```bash
bash ~/.openclaw/skills/human-like-memory/scripts/setup.sh
```

### 方式三：手动配置

编辑 `~/.openclaw/secrets.json`：

```json
{
  "human-like-memory": {
    "HUMAN_LIKE_MEM_API_KEY": "mp_your_api_key_here",
    "HUMAN_LIKE_MEM_BASE_URL": "https://multiego.me",
    "HUMAN_LIKE_MEM_USER_ID": "your-user-id"
  }
}
```

### 方式四：环境变量

```bash
export HUMAN_LIKE_MEM_API_KEY="mp_your_api_key_here"
export HUMAN_LIKE_MEM_BASE_URL="https://multiego.me"
export HUMAN_LIKE_MEM_USER_ID="your-user-id"
```

## 获取 API Key

1. 访问 [https://multiego.me](https://multiego.me)
2. 注册账号并登录
3. 在控制台创建 API Key
4. 复制 `mp_` 开头的 Key

## 配置项说明

| 配置项 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `HUMAN_LIKE_MEM_API_KEY` | 是 | - | API 密钥 |
| `HUMAN_LIKE_MEM_BASE_URL` | 否 | `https://multiego.me` | API 地址 |
| `HUMAN_LIKE_MEM_USER_ID` | 否 | `openclaw-user` | 用户标识 |

## 使用方式

安装并配置后，Skill 会在以下场景自动触发：

1. 当你问 "还记得我们之前讨论的..." 时
2. 当你说 "帮我记住这个..." 时
3. 当你需要回顾历史对话时

### 命令行测试

```bash
# 检查配置
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs config

# 召回记忆
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs recall "我最近在做什么项目"

# 保存记忆
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs save "我在开发记忆插件" "好的，我记住了"

# 搜索记忆
node ~/.openclaw/skills/human-like-memory/scripts/memory.mjs search "会议纪要"
```

## 文件结构

```
human-like-mem-openclaw-skill/
├── SKILL.md              # Skill 定义和指令
├── skill.json            # 元数据和配置声明
├── scripts/
│   ├── memory.mjs        # 记忆操作 CLI
│   └── setup.sh          # 配置脚本
├── references/           # 参考文档（可选）
└── README.md
```

## 与 Plugin 的区别

| 特性 | Skill | Plugin |
|------|-------|--------|
| 触发方式 | 手动或 AI 判断触发 | 自动 hook 生命周期 |
| 记忆召回 | 需要显式调用 | 自动注入上下文 |
| 记忆存储 | 需要显式调用 | 对话结束自动存储 |
| 安装方式 | 复制文件夹 | npm install |
| 适用场景 | 按需使用记忆 | 全自动记忆增强 |

如果你需要**完全自动化**的记忆功能，建议使用 [human-like-mem-openclaw-plugin](https://www.npmjs.com/package/human-like-mem-openclaw-plugin)。

## License

Apache-2.0
