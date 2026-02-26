#!/bin/bash
# monitor.sh - Stock Stalker 服务器监控脚本

SERVER_IP="45.32.219.241"
LOG_FILE="$HOME/clawd/stock_stalker/logs/monitor_$(date +%Y%m%d).log"
mkdir -p "$HOME/clawd/stock_stalker/logs"

echo "🔍 Stock Stalker 监控检查 - $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "================================================" | tee -a "$LOG_FILE"

# 检查服务器连接
echo -e "\n📡 检查服务器连接..." | tee -a "$LOG_FILE"
if ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no root@$SERVER_IP "echo 'OK'" > /dev/null 2>&1; then
    echo "✅ 服务器连接正常" | tee -a "$LOG_FILE"
else
    echo "❌ 服务器连接失败" | tee -a "$LOG_FILE"
    exit 1
fi

# 检查Docker服务
echo -e "\n🐳 检查Docker服务..." | tee -a "$LOG_FILE"
ssh root@$SERVER_IP "docker ps --format '{{.Names}}: {{.Status}}' | grep treatbot" | tee -a "$LOG_FILE"

# 检查API健康
echo -e "\n🌐 检查API健康..." | tee -a "$LOG_FILE"
if curl -s -k https://$SERVER_IP/health > /dev/null 2>&1; then
    echo "✅ API响应正常" | tee -a "$LOG_FILE"
    curl -s -k https://$SERVER_IP/health | tee -a "$LOG_FILE"
else
    echo "⚠️  API响应异常" | tee -a "$LOG_FILE"
fi

# 检查磁盘空间
echo -e "\n💾 检查磁盘空间..." | tee -a "$LOG_FILE"
ssh root@$SERVER_IP "df -h / | tail -1" | tee -a "$LOG_FILE"

# 检查内存使用
echo -e "\n🧠 检查内存使用..." | tee -a "$LOG_FILE"
ssh root@$SERVER_IP "free -h | grep Mem" | tee -a "$LOG_FILE"

# 检查最近日志
echo -e "\n📝 最近错误日志..." | tee -a "$LOG_FILE"
ssh root@$SERVER_IP "cd /opt/treatbot/server && docker compose logs --tail 5 api 2>&1 | grep -i error || echo '无错误'" | tee -a "$LOG_FILE"

echo -e "\n================================================" | tee -a "$LOG_FILE"
echo "✅ 监控检查完成 - $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# 显示摘要
echo -e "\n📊 监控摘要:"
echo "  日志文件: $LOG_FILE"
echo "  检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  服务器: $SERVER_IP"
