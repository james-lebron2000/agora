# Stock Stalker 使用指南

> 事件驱动型交易代理系统

---

## 📋 目录

1. [快速开始](#快速开始)
2. [核心概念](#核心概念)
3. [CLI 命令](#cli-命令)
4. [API 使用](#api-使用)
5. [策略回测](#策略回测)
6. [技术指标](#技术指标)
7. [通知系统](#通知系统)
8. [常见问题](#常见问题)

---

## 🚀 快速开始

### 安装依赖

```bash
cd ~/clawd/stock_stalker
pip3 install -r requirements.txt
```

### 运行测试

```bash
python3 run_tests.py
```

### 启动监控

```bash
python3 main.py --ticker AAPL
```

---

## 🧠 核心概念

### 1. 状态机 (State Machine)

系统通过7个状态处理交易信号：

- **S0_IDLE**: 等待事件
- **S1_DETECTED**: 检测到事件
- **S2_RESEARCHING**: 正在研究
- **S3_ANALYZING**: 分析中
- **S4_EXECUTING**: 执行交易
- **S5_MONITORING**: 监控持仓
- **S6_COMPLETE**: 完成

### 2. Conviction Score (确定性评分)

0-100分评估交易信号质量：

- **≥75分**: 强烈建议交易
- **60-74分**: 小仓位尝试
- **<60分**: 观望

评分维度：
- 信息确定性 (25%)
- 催化剂强度 (25%)
- 预期差异 (25%)
- 执行可行性 (25%)

### 3. 证据等级

- **A级**: 公司官方来源（财报、公告）
- **B级**: 权威第三方（SEC文件、主流财经媒体）
- **C级**: 社交媒体/论坛（需验证）

---

## 💻 CLI 命令

### 扫描股票

```bash
# 扫描AAPL
python3 cli.py scan AAPL

# 扫描并保存到数据库
python3 cli.py scan TSLA --save

# 输出JSON格式
python3 cli.py scan NVDA --json
```

### 管理观察列表

```bash
# 查看观察列表
python3 cli.py watchlist

# 添加股票
python3 cli.py watchlist --add MSFT --name "Microsoft"

# 删除股票
python3 cli.py watchlist --remove AAPL

# 扫描所有观察列表股票
python3 cli.py watchlist --scan
```

### 技术分析

```bash
python3 cli.py tech AAPL
```

输出示例：
```
📈 Trend:
  SMA 20: $150.25
  SMA 50: $145.80

💹 Momentum:
  RSI 14: 65.42
  MACD: 0.5234

🎯 Signal: MA_GOLDEN_CROSS, MACD_BULLISH
```

### 策略回测

```bash
# 使用均线策略回测
python3 cli.py backtest AAPL --strategy ma --days 100

# 使用RSI策略回测
python3 cli.py backtest TSLA --strategy rsi --capital 50000

# 导出结果
python3 cli.py backtest NVDA --export
```

### 数据导出

```bash
# 导出事件数据
python3 cli.py export --type events

# 导出特定股票事件
python3 cli.py export --type events --ticker AAPL

# 导出观察列表
python3 cli.py export --type watchlist
```

### 仪表板

```bash
python3 cli.py dashboard
```

---

## 🔌 API 使用

### Python API

```python
from core.watchlist_scanner import WatchlistScanner
from core.enhanced_scanner import EnhancedWatchlistScanner

# 基础扫描
scanner = WatchlistScanner()
result = scanner.scan_ticker("AAPL", save_to_db=True)

# 增强扫描（含技术指标）
enhanced = EnhancedWatchlistScanner()
result = enhanced.scan_with_technicals("AAPL")

print(f"Conviction: {result['conviction']['score']}")
print(f"Signal: {result['technical_signal']}")
```

### 添加股票到观察列表

```python
scanner = WatchlistScanner()
scanner.add_ticker("TSLA", "Tesla Inc.")
scanner.add_ticker("NVDA", "NVIDIA Corp")
```

### 技术分析

```python
from analysis.technical_indicators import TechnicalAnalyzer

prices = [100, 102, 101, 103, 105, ...]  # 价格数据
volumes = [1000000, 1200000, ...]  # 成交量

indicators = TechnicalAnalyzer.calculate_all(
    ticker="AAPL",
    prices=prices,
    volumes=volumes,
)

print(f"RSI: {indicators.rsi_14}")
print(f"MACD: {indicators.macd}")
print(f"Signal: {indicators.get_signal()}")
```

---

## 📈 策略回测

### 使用示例

```python
from analysis.backtest import BacktestEngine, simple_ma_strategy
from analysis.backtest import rsi_strategy

# 准备历史数据
price_data = [
    {'date': datetime(...), 'open': 100, 'high': 105, 'low': 98, 'close': 102, 'volume': 1000000},
    # ... more data
]

# 创建回测引擎
engine = BacktestEngine(initial_capital=100000.0)

# 运行回测
result = engine.run_backtest(
    ticker="AAPL",
    price_data=price_data,
    strategy=simple_ma_strategy,
)

# 查看结果
print(result.summary())
print(f"Return: {result.total_return_pct:.2f}%")
print(f"Win Rate: {result.win_rate:.1%}")
print(f"Max Drawdown: {result.max_drawdown_pct:.2f}%")
```

### 自定义策略

```python
from analysis.backtest import TradeAction

def my_strategy(ticker, current_bar, historical_data, current_position, capital):
    current_price = current_bar['close']
    
    # 自定义逻辑
    if len(historical_data) >= 20:
        ma20 = sum(d['close'] for d in historical_data[-20:]) / 20
        
        if current_price > ma20 and current_position == 0:
            return {
                "action": TradeAction.BUY,
                "conviction": 80,
                "reason": "Price above MA20"
            }
    
    return {
        "action": TradeAction.HOLD,
        "conviction": 50,
        "reason": "No signal"
    }
```

---

## 📊 技术指标

### 支持的指标

| 指标 | 描述 | 用途 |
|------|------|------|
| **SMA** | 简单移动平均线 | 趋势判断 |
| **EMA** | 指数移动平均线 | 趋势跟踪 |
| **RSI** | 相对强弱指标 | 超买/超卖 |
| **MACD** | 异同移动平均线 | 趋势动量 |
| **Bollinger Bands** | 布林带 | 波动性 |
| **OBV** | 能量潮 | 量价分析 |
| **Pivot Points** | 枢轴点 | 支撑阻力 |

### 信号类型

- **RSI_OVERSOLD**: RSI < 30（买入信号）
- **RSI_OVERBOUGHT**: RSI > 70（卖出信号）
- **MACD_BULLISH**: MACD柱状图转正
- **MACD_BEARISH**: MACD柱状图转负
- **MA_GOLDEN_CROSS**: 短期均线上穿长期均线
- **MA_DEATH_CROSS**: 短期均线下穿长期均线
- **BB_SQUEEZE**: 布林带收窄（波动率下降）

---

## 🔔 通知系统

### 配置通知

```python
from core.notifications import create_notification_manager

# 控制台通知
manager = create_notification_manager(console=True)

# 邮件通知
manager = create_notification_manager(
    console=True,
    email_config={
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "username": "your_email@gmail.com",
        "password": "your_password",
        "from_addr": "your_email@gmail.com",
        "to_addrs": ["recipient@example.com"],
    }
)

# Slack通知
manager = create_notification_manager(
    console=True,
    slack_webhook="https://hooks.slack.com/services/..."
)
```

### 发送交易信号

```python
manager.send_trade_signal(
    ticker="AAPL",
    action="BUY",
    price=150.25,
    conviction=85,
    reason="RSI oversold, MACD bullish",
    priority="high",
)
```

### 发送自定义提醒

```python
manager.send_alert(
    title="Market Alert",
    body="S&P 500 dropped 2%",
    priority="urgent",
)
```

---

## ❓ 常见问题

### Q: 如何获取 Alpha Vantage API 密钥？

A: 访问 https://www.alphavantage.co/support/#api-key 免费注册

### Q: 如何更新域名DNS？

A: 在域名提供商后台修改 A 记录到 45.32.219.241

### Q: 如何配置微信小程序？

A: 登录微信公众平台 → 开发 → 开发设置 → 添加 https://45.32.219.241

### Q: 如何启动本地Mac隧道？

A: 运行 `cd ~/clawd && ./frpc_mac.sh`

### Q: 数据库文件在哪里？

A: `~/clawd/stock_stalker/data/stock_stalker.db`

---

## 📚 文件结构

```
stock_stalker/
├── agents/              # 交易代理
├── analysis/            # 技术分析
│   ├── technical_indicators.py
│   └── backtest.py
├── core/                # 核心功能
│   ├── watchlist_scanner.py
│   ├── enhanced_scanner.py
│   └── notifications.py
├── data/                # 数据存储
│   ├── fetchers/        # 数据获取
│   └── storage/         # 数据持久化
├── models/              # 数据模型
├── tests/               # 测试用例
├── main.py              # 主程序
├── cli.py               # 命令行工具
└── README.md            # 本文件
```

---

## 🆘 技术支持

遇到问题？

1. 检查日志：`docker compose logs`（服务器）
2. 运行测试：`python3 run_tests.py`
3. 查看状态：`python3 cli.py dashboard`

---

**最后更新**: 2026-02-26
