# Stock Stalker 快速参考指南

> 常用命令速查

---

## 🚀 快速开始

```bash
cd ~/clawd/stock_stalker

# 查看仪表板
make dashboard

# 或
python3 cli.py dashboard
```

---

## 📊 股票分析

### 扫描股票信号
```bash
# 扫描AAPL
make scan T=AAPL

# 或
python3 cli.py scan AAPL

# 扫描并保存到数据库
python3 cli.py scan TSLA --save

# 输出JSON格式
python3 cli.py scan NVDA --json
```

### 技术分析
```bash
# 查看技术指标
make tech T=AAPL

# 或
python3 cli.py tech AAPL
```

---

## 📈 策略回测

```bash
# 使用均线策略回测
make backtest T=AAPL

# 或
python3 cli.py backtest AAPL --strategy ma --days 100

# 使用RSI策略回测
python3 cli.py backtest TSLA --strategy rsi --capital 50000

# 导出回测结果
python3 cli.py backtest NVDA --export
```

---

## 📋 观察列表管理

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

---

## 🔔 监控和备份

### 服务器监控
```bash
# 检查服务器状态
./monitor.sh

# 查看日志
tail -f logs/monitor_$(date +%Y%m%d).log
```

### 数据备份
```bash
# 备份数据库和代码
./backup.sh

# 备份存储位置
~/clawd/backups/stock_stalker/
```

---

## 🐳 Docker 操作

```bash
# 构建Docker镜像
make docker-build

# 启动服务
make docker-run

# 停止服务
make docker-stop

# 查看日志
make docker-logs
```

---

## 🧪 测试和开发

```bash
# 运行所有测试
make test

# 代码检查
make lint

# 安装依赖
make install

# 清理缓存
make clean
```

---

## 🌐 服务器管理

### 检查Treatbot服务器
```bash
ssh root@45.32.219.241

# 查看容器状态
docker compose ps

# 查看日志
docker compose logs -f api

# 重启服务
docker compose restart
```

### 访问地址
- **主应用**: https://45.32.219.241
- **frp面板**: http://45.32.219.241:7500 (admin/admin123)
- **本地API**: http://localhost:3000

---

## 📝 数据导出

```bash
# 导出事件数据
python3 cli.py export --type events

# 导出特定股票事件
python3 cli.py export --type events --ticker AAPL

# 导出观察列表
python3 cli.py export --type watchlist
```

---

## 🔧 常用文件位置

```
~/clawd/stock_stalker/
├── data/
│   └── stock_stalker.db          # 本地数据库
├── logs/                          # 日志文件
├── backups/                       # 备份目录
├── examples/
│   └── StockStalker_Demo.ipynb   # Jupyter示例
├── cli.py                         # CLI工具
├── main.py                        # 主程序
└── README.md                      # 完整文档
```

---

## 🎯 Python API 快速使用

```python
# 扫描股票
from core.watchlist_scanner import WatchlistScanner
scanner = WatchlistScanner()
result = scanner.scan_ticker("AAPL")

# 技术分析
from analysis.technical_indicators import TechnicalAnalyzer
indicators = TechnicalAnalyzer.calculate_all(
    ticker="AAPL",
    prices=prices,
    volumes=volumes,
)

# 回测策略
from analysis.backtest import BacktestEngine, simple_ma_strategy
engine = BacktestEngine(initial_capital=100000)
result = engine.run_backtest(
    ticker="AAPL",
    price_data=price_data,
    strategy=simple_ma_strategy,
)

# 发送通知
from core.notifications import create_notification_manager
manager = create_notification_manager(console=True)
manager.send_trade_signal(
    ticker="AAPL",
    action="BUY",
    price=150.25,
    conviction=85,
    reason="RSI oversold",
)
```

---

## 🆘 故障排除

### 问题1: 测试失败
```bash
# 重新安装依赖
make clean
make install
make test
```

### 问题2: Docker启动失败
```bash
# 检查端口占用
lsof -i :8080

# 重启Docker服务
make docker-stop
make docker-run
```

### 问题3: 数据库连接错误
```bash
# 检查数据库文件
ls -la data/stock_stalker.db

# 备份并重建
make backup
rm data/stock_stalker.db
python3 -c "from data.storage.database import Database; db = Database()"
```

---

## 📞 获取帮助

1. **查看完整文档**: `cat README.md`
2. **运行Jupyter示例**: `jupyter notebook examples/StockStalker_Demo.ipynb`
3. **查看项目报告**: `cat PROJECT_REPORT.md`
4. **检查日志**: `tail -f logs/*.log`

---

**最后更新**: 2026-02-26
