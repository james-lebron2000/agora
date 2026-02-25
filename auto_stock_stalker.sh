#!/bin/bash
# auto_stock_stalker.sh - 每15分钟自动执行

LOG_FILE="$HOME/clawd/stock_stalker/logs/auto_$(date +%Y%m%d).log"
mkdir -p "$HOME/clawd/stock_stalker/logs"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Stock Stalker Auto-Run" >> "$LOG_FILE"

cd "$HOME/clawd/stock_stalker" || exit 1

python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')

try:
    from core.watchlist_scanner import WatchlistScanner
    from datetime import datetime
    
    scanner = WatchlistScanner()
    
    if scanner.items:
        ticker = list(scanner.items.keys())[0]
        print(f"Scanning {ticker}...")
        result = scanner.scan_ticker(ticker, save_to_db=True)
        score = result.get('conviction', {}).get('score', 0)
        print(f"Conviction Score: {score}")
        print(f"State: {result.get('state', 'unknown')}")
    else:
        print("Watchlist is empty")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
PYEOF

echo "" >> "$LOG_FILE"
