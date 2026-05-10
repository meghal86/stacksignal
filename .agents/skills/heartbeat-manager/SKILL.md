---
name: heartbeat-manager
description: Agent 心跳管理系统：自动检查任务状态、智能超时分析、日报/周报、健康度评分。与 OpenClaw 心跳同步运行。
---

# Heartbeat Manager

> 自动化任务监控 · 智能超时分析 · 日报/周报 · 健康度评分

---

## ⚠️ 安装前须知

### 凭证声明
本 Skill **不内置、不存储任何邮件凭证**。邮件功能（告警、日报、周报）需要你在安装后自行配置：
- 提供一个 Gmail 账号及其 App Password
- 填入 `config/.env`（该文件永远不会被上传或共享）

> 若不配置邮件，Skill 仍可正常运行心跳检查（任务监控、健康度评分），仅邮件通知功能不可用。

### 副作用声明
本 Skill 会在运行时产生以下副作用：

| 操作 | 说明 | 可关闭 |
|------|------|--------|
| 写入本地文件 | 更新 `workspace/` 下的 MASTER.md、state.json 等 | ❌ 核心功能 |
| 写入日志 | 追加 `logs/heartbeat.log` | ✅ `settings.yaml` |
| IMAP 读取邮件 | 检查指定邮箱未读邮件 | ✅ `email.enabled: false` |
| SMTP 发送邮件 | 发送告警、日报、周报 | ✅ `email.enabled: false` |
| Git commit + push | 自动提交工作区变更至远程 | ✅ `git.auto_push: false` |

---

## Quick Start

### 1. 安装依赖

```bash
pip install pyyaml jinja2 python-dotenv
# 或使用 uv（推荐）
uv venv .venv && uv pip install --python .venv/bin/python pyyaml jinja2 python-dotenv
```

### 2. 配置邮件（可选，但强烈推荐）

```bash
cp config/.env.example config/.env
```

编辑 `config/.env`：

```env
# Gmail 发件账号
EMAIL_SENDER=your-agent@gmail.com
# Gmail 应用专用密码（非登录密码）
# 获取方式：Google 账号 → 安全性 → 两步验证 → 应用专用密码
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
# 收件人列表（逗号分隔）
EMAIL_RECIPIENTS=you@example.com
```

> 如何获取 Gmail App Password：
> 1. 开启 Google 账号两步验证
> 2. 访问 myaccount.google.com/apppasswords
> 3. 生成一个应用专用密码并粘贴到上方

### 3. 调整配置（可选）

编辑 `config/settings.yaml`：

```yaml
email:
  enabled: true          # 改为 false 可完全禁用邮件功能

git:
  auto_push: true        # 改为 false 可禁用自动推送
```

### 4. 验证配置

```bash
python tools/heartbeat_run.py status
```

### 5. 首次心跳

```bash
python tools/heartbeat_run.py beat
```

---

## 功能概览

### `beat` — 心跳检查（每30分钟）

1. 检查 `daily.md` 例行任务完成情况
2. 检查 `todo.md` 待办 + `@due:HH:MM` 超期检测
3. 检查 `ongoing.json` 任务状态机
4. 智能超时分析（正常推进 vs 完全卡死）
5. 检查邮件（需配置凭证）
6. 计算健康度评分（0-100）
7. 更新 `MASTER.md` 主控表
8. Git 同步（可选）

### `reset` — 每日重置（00:00）

- 发送昨日完成任务日报邮件（需配置凭证）
- 重置 `daily.md` 为新一天
- 清理已完成的 ongoing 任务

### `weekly` — 周报（每周日 23:59）

- 汇总本周健康度趋势与任务统计（需配置凭证）

### `status` — 查看状态

- 无需凭证，打印当前 MASTER 快照

---

## OpenClaw 集成

在 `HEARTBEAT.md` 中添加：

```bash
cd /path/to/heartbeat-manager && python tools/heartbeat_run.py beat
```

OpenClaw 内置心跳触发时将自动执行本 Skill。

---

## 任务文件格式

**`daily.md`** — 每日例行任务
```markdown
# DAILY | 2026-02-25
- [ ] 晨间邮件检查
- [ ] 更新记忆库
- [x] 系统状态确认 @done:14:30
```

**`todo.md`** — 动态待办
```markdown
- [ ] 修复登录 bug @due:18:00
- [ ] 写周报
```

**`ongoing.json`** — 任务状态机
```json
{
  "tasks": [{
    "id": "01", "title": "毕业论文",
    "status": "WIP", "priority": "P0",
    "eta": "2026-03-01", "progress": 65,
    "context": "第三章进行中"
  }]
}
```

状态流转：`IDLE → WIP → DONE`，`WIP → WAIT → WIP`，`WIP → BLOCK`（智能检测卡死）

---

## 健康度评分

| 维度 | 权重 | 说明 |
|------|------|------|
| Daily 完成率 | 25% | 例行任务完成比例 |
| Todo 完成率 | 20% | 超期扣分 |
| Ongoing 状态 | 25% | BLOCK/超期扣分 |
| 邮件处理 | 15% | 未读过多扣分 |
| Git 同步 | 15% | push 成功满分 |

连续 3 次低于 60 分 → 邮件告警

---

## 许可

MIT License
