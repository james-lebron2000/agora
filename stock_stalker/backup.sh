#!/bin/bash
# backup.sh - Stock Stalker 自动备份脚本

BACKUP_DIR="$HOME/clawd/backups/stock_stalker"
DB_FILE="$HOME/clawd/stock_stalker/data/stock_stalker.db"
DATE=$(date +%Y%m%d_%H%M%S)
SERVER_IP="45.32.219.241"

echo "💾 Stock Stalker 备份 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "================================================"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 1. 备份本地数据库
if [ -f "$DB_FILE" ]; then
    echo -e "\n📁 备份本地数据库..."
    cp "$DB_FILE" "$BACKUP_DIR/stock_stalker_local_$DATE.db"
    echo "✅ 本地数据库已备份: stock_stalker_local_$DATE.db"
else
    echo "⚠️  本地数据库文件不存在"
fi

# 2. 备份服务器数据库
echo -e "\n🌐 备份服务器数据库..."
if ssh -o ConnectTimeout=5 root@$SERVER_IP "test -f /opt/treatbot/server/data/stock_stalker.db" 2>/dev/null; then
    scp root@$SERVER_IP:/opt/treatbot/server/data/stock_stalker.db "$BACKUP_DIR/treatbot_server_$DATE.db" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "✅ 服务器数据库已备份: treatbot_server_$DATE.db"
    else
        echo "⚠️  服务器数据库备份失败"
    fi
else
    echo "⚠️  服务器数据库文件不存在或无法连接"
fi

# 3. 备份代码
echo -e "\n📦 备份代码..."
cd "$HOME/clawd/stock_stalker"
tar -czf "$BACKUP_DIR/code_backup_$DATE.tar.gz" \
    --exclude='__pycache__' \
    --exclude='*.pyc' \
    --exclude='.pytest_cache' \
    --exclude='*.log' \
    . 2>/dev/null

echo "✅ 代码已备份: code_backup_$DATE.tar.gz"

# 4. 备份观察列表
echo -e "\n📋 备份观察列表..."
python3 << 'PYEOF'
import json
import sys
sys.path.insert(0, '.')

try:
    from core.watchlist_scanner import WatchlistScanner
    scanner = WatchlistScanner()
    
    backup_file = "$BACKUP_DIR/watchlist_$DATE.json"
    with open(backup_file.replace('$DATE', '$(date +%Y%m%d_%H%M%S)'), 'w') as f:
        json.dump(scanner.items, f, indent=2)
    
    print(f"✅ 观察列表已备份 ({len(scanner.items)} 个股票)")
except Exception as e:
    print(f"⚠️  观察列表备份失败: {e}")
PYEOF

# 5. 清理旧备份（保留最近30天）
echo -e "\n🧹 清理旧备份..."
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete 2>/dev/null
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete 2>/dev/null
find "$BACKUP_DIR" -name "*.json" -mtime +30 -delete 2>/dev/null

echo "✅ 已清理30天前的旧备份"

# 显示备份摘要
echo -e "\n================================================"
echo "📊 备份摘要:"
echo "  备份目录: $BACKUP_DIR"
echo "  备份时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  备份文件:"
ls -lh "$BACKUP_DIR"/*$DATE* 2>/dev/null | awk '{print "    - " $9 " (" $5 ")"}'
echo "================================================"
