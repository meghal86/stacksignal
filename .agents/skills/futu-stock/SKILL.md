---
name: futu-stock
description: Access Futu stock market data via MCP server - real-time quotes, K-lines, options, account info for HK/US/CN markets
metadata: {"openclaw": {"emoji": "📈", "requires": {"bins": ["python3", "futu-mcp-server"], "env": ["FUTU_HOST", "FUTU_PORT"]}, "primaryEnv": "FUTU_HOST"}}
version: 1.1.0
---

# futu-stock Skill

基于富途 OpenAPI 的股票行情 Skill，通过 MCP 协议访问港股、美股、A 股实时行情、K 线、期权及账户信息。

**MCP 源码**: https://github.com/shuizhengqi1/futu-stock-mcp-server

---

## 一、整体流程

```
┌─────────────────────────────────────────────────────────────────────────┐
│  1. 环境检测                                                              │
│     ├─ 检测 python3、futu-mcp-server、mcp 包、OpenD 状态                    │
│     └─ 输出检测结果                                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  2. 依赖处理                                                              │
│     ├─ 若缺少 futu-mcp-server → 执行 pipx install futu-stock-mcp-server   │
│     ├─ 若缺少 mcp 包 → 执行 pip install mcp                                │
│     └─ 若 OpenD 已安装但未启动 → 调用时尝试启动（需配置 OPEND_PATH）          │
├─────────────────────────────────────────────────────────────────────────┤
│  3. 查询逻辑                                                              │
│     ├─ 有明确股票代码（如 HK.00700、US.AAPL）→ 直接调用 get_stock_quote /    │
│     │   get_market_snapshot / get_history_kline 等                         │
│     └─ 无股票代码（如「港股 10–50 元的股票」）→ 使用 get_stock_filter 筛选     │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、环境检测与依赖处理

### 2.1 执行环境检测

```bash
cd {baseDir}
python3 executor.py --check-env
```

输出示例：
- `python3`: OK / 缺失
- `futu-mcp-server`: OK / 缺失
- `mcp 包`: OK / 缺失
- `OpenD (FUTU_HOST:FUTU_PORT)`: 监听中 / 未监听

### 2.2 依赖缺失时的安装

| 依赖 | 检测方式 | 安装命令 |
|------|----------|----------|
| futu-mcp-server | `which futu-mcp-server` | `pipx install futu-stock-mcp-server` 或 `pip install futu-stock-mcp-server` |
| mcp 包 | `python3 -c "import mcp"` | `pip install mcp` |
| Futu OpenD | `netstat -an \| grep 11111` 或 `lsof -i :11111` | 见下方 OpenD 安装 |

### 2.3 OpenD 安装与启动

**下载**: https://openapi.futunn.com/futu-api-doc/opend/opend-cmd.html

**配置** `FutuOpenD.xml`：
- `login_account`: 富途账号
- `login_pwd`: 登录密码
- `api_port`: 默认 11111
- `ip`: 默认 127.0.0.1

**启动**：
```bash
# Linux/macOS
nohup ./FutuOpenD > opend.log 2>&1 &

# Windows
FutuOpenD.exe
```

### 2.4 调用时自动启动 OpenD

若已安装 OpenD 但未启动，可设置 `OPEND_PATH` 环境变量，executor 在检测到端口未监听时会尝试启动：

```bash
export OPEND_PATH=/path/to/opend/directory  # 含 FutuOpenD 可执行文件的目录
```

---

## 三、查询逻辑（核心规则）

### 3.1 有明确股票代码

用户给出具体代码（如 `HK.00700`、`00700`、`腾讯` 且能映射到代码）时，直接按代码查询：

| 需求类型 | 推荐工具 | 示例 |
|----------|----------|------|
| 实时报价 | `get_stock_quote` 或 `get_market_snapshot` | `{"tool": "get_market_snapshot", "arguments": {"symbols": ["HK.00700"]}}` |
| 历史 K 线 | `get_history_kline` | `{"tool": "get_history_kline", "arguments": {"symbol": "HK.00700", "ktype": "K_DAY", "start": "2026-01-01", "end": "2026-02-25"}}` |
| 期权链 | `get_option_chain` | `{"tool": "get_option_chain", "arguments": {"symbol": "HK.00700", "start": "2026-04-01", "end": "2026-06-30"}}` |
| 需订阅的数据 | 先 `subscribe` 再查 | 见下方「需订阅的工具」 |

**股票代码格式**: `{市场}.{代码}`  
- 港股: `HK.00700`  
- 美股: `US.AAPL`  
- 沪市: `SH.600519`  
- 深市: `SZ.000001`  

### 3.2 无股票代码（条件筛选）

用户只给条件（如「港股 10–50 元的股票」「纳斯达克涨幅前 20」）时，使用 `get_stock_filter`：

```json
{
  "tool": "get_stock_filter",
  "arguments": {
    "market": "HK.Motherboard",
    "base_filters": [{
      "field_name": 5,
      "filter_min": 10.0,
      "filter_max": 50.0,
      "sort_dir": 1
    }],
    "page": 1,
    "page_size": 50
  }
}
```

**常用 market 值**:
- `HK.Motherboard` 港股主板
- `HK.GEM` 港股创业板
- `US.NASDAQ` 纳斯达克
- `US.NYSE` 纽交所
- `SH.3000000` 沪市主板
- `SZ.3000004` 深市创业板

**base_filters 常用 field_name**（参考富途 StockField）:
- 5: 当前价
- 6: 涨跌幅
- 7: 成交量
- 8: 成交额
- 1: 排序

---

## 四、可用工具

### 行情
- `get_stock_quote`: 报价
- `get_market_snapshot`: 快照（含买卖盘）
- `get_cur_kline`: 当前 K 线（需先 subscribe）
- `get_history_kline`: 历史 K 线
- `get_rt_data`: 实时数据（需 subscribe RT_DATA）
- `get_ticker`: 逐笔（需 subscribe TICKER）
- `get_order_book`: 买卖盘（需 subscribe ORDER_BOOK）
- `get_broker_queue`: 经纪队列（需 subscribe BROKER）

### 订阅
- `subscribe`: 订阅 QUOTE / ORDER_BOOK / TICKER / RT_DATA / BROKER / K_1M / K_DAY 等
- `unsubscribe`: 取消订阅

### 期权
- `get_option_chain`: 期权链
- `get_option_expiration_date`: 到期日
- `get_option_condor`: 鹰式策略
- `get_option_butterfly`: 蝶式策略

### 账户
- `get_account_list`: 账户列表
- `get_funds`: 资金
- `get_positions`: 持仓
- `get_max_power`: 最大交易力
- `get_margin_ratio`: 保证金比例

### 市场
- `get_market_state`: 市场状态
- `get_security_info`: 证券信息
- `get_security_list`: 证券列表
- **`get_stock_filter`**: 条件筛选（无代码时使用）

---

## 五、调用方式

### 执行工具

```bash
cd {baseDir}
python3 executor.py --call '{"tool": "get_market_snapshot", "arguments": {"symbols": ["HK.00700"]}}'
```

### 查看工具参数

```bash
cd {baseDir}
python3 executor.py --describe get_stock_filter
```

### 列出所有工具

```bash
cd {baseDir}
python3 executor.py --list
```

---

## 六、常见问题

### Q1: `futu-mcp-server` 找不到

```bash
pipx install futu-stock-mcp-server
# 或
pip install futu-stock-mcp-server
which futu-mcp-server
```

### Q2: 连接 OpenD 失败 / 端口未监听

```bash
# 检查端口
lsof -i :11111
# 或
netstat -an | grep 11111

# 未监听则启动 OpenD（见 2.3）
# 或配置 OPEND_PATH 让 executor 自动启动（见 2.4）
```

### Q3: `mcp` 包未安装

```bash
pip install mcp
```

### Q4: 股票代码格式错误

必须使用 `{市场}.{代码}`，例如：
- 港股: `HK.00700`（不是 `00700`）
- 美股: `US.AAPL`（不是 `AAPL`）

### Q5: 需要订阅才能用的工具

`get_cur_kline`、`get_rt_data`、`get_ticker`、`get_order_book`、`get_broker_queue` 需先 `subscribe`：

```bash
# 1. 先订阅
python3 executor.py --call '{"tool": "subscribe", "arguments": {"symbols": ["HK.00700"], "sub_types": ["QUOTE", "K_DAY"]}}'

# 2. 再查询
python3 executor.py --call '{"tool": "get_cur_kline", "arguments": {"symbol": "HK.00700", "ktype": "K_DAY", "count": 100}}'
```

### Q6: get_stock_filter 限频

- 每 30 秒最多 10 次
- 每页最多 200 条
- 建议不超过 250 个筛选条件

### Q7: 历史 K 线限制

- 30 天内最多 30 只股票
- 需合理控制 `start` 和 `end` 范围

---

## 七、配置

```json5
// ~/.openclaw/openclaw.json
{
  skills: {
    entries: {
      "futu-stock": {
        enabled: true,
        env: {
          FUTU_HOST: "127.0.0.1",
          FUTU_PORT: "11111",
          OPEND_PATH: "/path/to/opend"  // 可选，用于自动启动 OpenD
        }
      }
    }
  }
}
```

---

## 八、决策流程速查

1. **先做环境检测**：`python3 executor.py --check-env`
2. **有缺失**：按 2.2 安装缺失依赖
3. **有股票代码**：用 `get_stock_quote` / `get_market_snapshot` / `get_history_kline` 等
4. **无股票代码**：用 `get_stock_filter` 按条件筛选
5. **需订阅**：先 `subscribe` 再查
6. **出错**：按第六节常见问题排查

---

*本 Skill 通过 MCP 协议访问富途 OpenAPI，数据来自 https://github.com/shuizhengqi1/futu-stock-mcp-server*
