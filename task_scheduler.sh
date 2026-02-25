#!/bin/bash
# task_scheduler.sh - 每15分钟执行一次任务（无需cron）

LOG_FILE="$HOME/clawd/task_scheduler.log"
PID_FILE="$HOME/clawd/task_scheduler.pid"

# 检查是否已在运行
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "Task scheduler already running (PID: $OLD_PID)"
        exit 1
    fi
fi

echo $$ > "$PID_FILE"
echo "[$(date)] Task Scheduler Started (PID: $$)" >> "$LOG_FILE"

# 清理函数
cleanup() {
    echo "[$(date)] Task Scheduler Stopped" >> "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 0
}
trap cleanup INT TERM

# 主循环
while true; do
    echo "[$(date)] Running Stock Stalker tasks..." >> "$LOG_FILE"
    
    # 执行 Stock Stalker 自动任务
    cd "$HOME/clawd/stock_stalker" && python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')

try:
    from core.watchlist_scanner import WatchlistScanner
    scanner = WatchlistScanner()
    
    if scanner.items:
        for ticker in list(scanner.items.keys())[:3]:  # 最多3个
            print(f"[{__import__('datetime').datetime.now()}] Scanning {ticker}")
            result = scanner.scan_ticker(ticker, save_to_db=True)
            score = result.get('conviction', {}).get('score', 0)
            print(f"  Conviction: {score}, State: {result.get('state')}")
    else:
        print("Watchlist empty, adding sample tickers...")
        scanner.add_ticker("AAPL", "Apple Inc.")
        scanner.add_ticker("TSLA", "Tesla Inc.")
        scanner.add_ticker("NVDA", "NVIDIA Corp")
        
except Exception as e:
    print(f"Error: {e}")
PYEOF
    
    echo "[$(date)] Tasks completed, sleeping 15 minutes..." >> "$LOG_FILE"
    echo "---" >> "$LOG_FILE"
    
    # 睡眠15分钟
    sleep 900
done
