---
name: reg-limited
description: 车辆限号查询与提醒工具。输入车牌号、所属城市和提醒时间，当限号时在设定时间推送通知。支持中国主要城市限号查询。
---

# RegLimited - 车辆限号查询与提醒

一个帮助你查询车辆限号并设置提醒的工具。

## 功能

1. **限号查询** - 根据城市和车牌号查询今日是否限行
2. **定时提醒** - 在设定的时间推送限号通知
3. **多城市支持** - 支持北京、上海、广州、深圳、杭州、成都等城市

## 使用方式

### 1. 设置限号提醒

```bash
# 基本用法
reg-limited add --city 北京 --plate 京A12345 --time "07:00"

# 完整参数
reg-limited add --city 北京 --plate 京A12345 --time "07:00" --notify-channel feishu
```

### 2. 查询今日限号

```bash
# 查询某城市今日限行尾号
reg-limited query --city 北京

# 查询车牌是否限行
reg-limited check --city 北京 --plate 京A12345
```

### 3. 列出所有提醒

```bash
reg-limited list
```

### 4. 删除提醒

```bash
reg-limited remove --id <提醒ID>
```

## 支持的城市

- 北京 (beijing)
- 上海 (shanghai)
- 广州 (guangzhou)
- 深圳 (shenzhen)
- 杭州 (hangzhou)
- 成都 (chengdu)
- 天津 (tianjin)
- 武汉 (wuhan)
- 西安 (xian)
- 南京 (nanjing)

## 限号规则说明

各城市限号规则：
- **北京**: 按尾号限行，周一到周五
- **上海**: 高架限行
- **广州**: 开四停四
- **深圳**: 早晚高峰限行

具体规则可通过 `reg-limited query --city <城市>` 查询当日具体限行尾号。

## 输出格式

JSON 格式输出，便于程序处理：
```json
{
  "success": true,
  "data": {
    "city": "北京",
    "date": "2026-02-25",
    "restricted": ["2", "7"],
    "isRestricted": false,
    "plate": "京A12345",
    "lastDigit": "5"
  }
}
```

## 技术实现

1. 通过百度搜索获取当日限行信息
2. 解析限行尾号
3. 比对车牌尾号
4. 通过定时任务推送通知

## 依赖

- Node.js
- 网络访问 (用于查询限行信息)
- 消息推送通道 (飞书/Telegram等)

## 示例对话

> 用户：北京今日限号多少？  
> 机器人：查询中... 北京今日限号：2、7

> 用户：帮我设置明天早上7点提醒我限号情况，车牌是京A12345  
> 机器人：已设置！明天7点会推送限号提醒

---

*更多城市持续添加中...*
