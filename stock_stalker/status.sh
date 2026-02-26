#!/bin/bash
# status.sh - 系统状态看板

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║           📊 STOCK STALKER 系统状态看板                        ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "⏰ 检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 1. 本地项目状态
echo "📁 本地项目状态"
echo "────────────────────────────────────────────────────────────────"
cd ~/clawd/stock_stalker 2>/dev/null || exit 1

echo "📂 项目路径: $(pwd)"
echo "📊 代码统计:"
echo "  Python文件: $(find . -name '*.py' | wc -l) 个"
echo "  测试文件: $(find tests -name 'test_*.py' 2>/dev/null | wc -l) 个"
echo "  代码行数: $(find . -name '*.py' -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}') 行"

# 2. 测试状态
echo ""
echo "🧪 测试状态"
echo "────────────────────────────────────────────────────────────────"
if python3 run_tests.py 2>&1 | grep -q "Passed: 10/10"; then
    echo "✅ 所有测试通过 (10/10)"
else
    echo "⚠️  测试状态异常，请运行: make test"
fi

# 3. 数据库状态
echo ""
echo "💾 数据库状态"
echo "────────────────────────────────────────────────────────────────"
if [ -f "data/stock_stalker.db" ]; then
    DB_SIZE=$(ls -lh data/stock_stalker.db | awk '{print $5}')
    echo "✅ 数据库存在: $DB_SIZE"
    
    # 获取表信息
    python3 << 'PYEOF'
import sqlite3
try:
    conn = sqlite3.connect('data/stock_stalker.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"📋 数据表: {len(tables)} 个")
    for table in tables:
        cursor.execute(f"SELECT COUNT(*) FROM {table[0]};")
        count = cursor.fetchone()[0]
        print(f"  • {table[0]}: {count} 条记录")
    conn.close()
except Exception as e:
    print(f"⚠️  数据库读取失败: {e}")
PYEOF
else
    echo "⚠️  数据库文件不存在"
fi

# 4. 观察列表
echo ""
echo "📋 观察列表"
echo "────────────────────────────────────────────────────────────────"
python3 << 'PYEOF'
import sys
sys.path.insert(0, '.')
try:
    from core.watchlist_scanner import WatchlistScanner
    scanner = WatchlistScanner()
    print(f"✅ 观察列表: {len(scanner.items)} 只股票")
    for ticker, info in list(scanner.items.items())[:5]:
        print(f"  • {ticker}: {info.get('name', 'N/A')}")
    if len(scanner.items) > 5:
        print(f"  ... 还有 {len(scanner.items) - 5} 只")
except Exception as e:
    print(f"⚠️  读取观察列表失败: {e}")
PYEOF

# 5. 服务器状态
echo ""
echo "🌐 Treatbot服务器状态"
echo "────────────────────────────────────────────────────────────────"
SERVER_IP="45.32.219.241"

# 检查连接
if ssh -o ConnectTimeout=3 -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'OK'" > /dev/null 2>&1; then
    echo "✅ 服务器连接正常 ($SERVER_IP)"
    
    # 检查Docker容器
    echo "🐳 Docker容器:"
    ssh root@$SERVER_IP "docker ps --format '  • {{.Names}}: {{.Status}}' | grep treatbot" 2>/dev/null || echo "  ⚠️ 无法获取容器状态"
    
    # 检查API
    if curl -s -k https://$SERVER_IP/health > /dev/null 2>&1; then
        echo "✅ API健康检查通过"
    else
        echo "⚠️  API健康检查失败"
    fi
else
    echo "❌ 服务器连接失败 ($SERVER_IP)"
fi

# 6. 定时任务状态
echo ""
echo "📅 定时任务状态"
echo "────────────────────────────────────────────────────────────────"
if crontab -l 2>/dev/null | grep -q "Stock Stalker"; then
    echo "✅ 定时任务已安装"
    echo "📋 任务列表:"
    crontab -l | grep -A5 "Stock Stalker" | grep -v "^#" | grep -v "^$" | head -5
else
    echo "⚠️  定时任务未安装"
    echo "   安装: ./install_cron.sh"
fi

# 7. 最近备份
echo ""
echo "💾 最近备份"
echo "────────────────────────────────────────────────────────────────"
BACKUP_DIR="$HOME/clawd/backups/stock_stalker"
if [ -d "$BACKUP_DIR" ]; then
    LATEST_BACKUP=$(ls -t "$BACKUP_DIR" 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo "✅ 最新备份: $LATEST_BACKUP"
        echo "   备份数量: $(ls "$BACKUP_DIR" | wc -l) 个"
    else
        echo "⚠️  暂无备份"
        echo "   创建: ./backup.sh"
    fi
else
    echo "⚠️  备份目录不存在"
    echo "   创建: ./backup.sh"
fi

# 8. 系统资源
echo ""
echo "💻 本地系统资源"
echo "────────────────────────────────────────────────────────────────"
echo "💾 磁盘使用:"
df -h ~ | tail -1 | awk '{print "  已用: " $3 " / " $2 " (" $5 ")"}'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ 状态检查完成                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
