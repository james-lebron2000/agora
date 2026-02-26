#!/bin/bash
# install_cron.sh - 安装定时任务

echo "📅 安装 Stock Stalker 定时任务"
echo "================================"
echo ""

# 检查当前crontab
echo "🔍 检查现有crontab..."
crontab -l > /tmp/current_crontab 2>/dev/null || echo "# 新建crontab" > /tmp/current_crontab

# 检查是否已安装
if grep -q "Stock Stalker" /tmp/current_crontab; then
    echo "⚠️  定时任务已存在，跳过安装"
    echo ""
    echo "如需重新安装，先运行: crontab -r"
    exit 0
fi

echo "📝 添加定时任务..."

# 添加新任务
cat >> /tmp/current_crontab << 'EOF'

# ============================================
# Stock Stalker 定时任务
# ============================================

# 每30分钟监控服务器状态
*/30 * * * * cd ~/clawd/stock_stalker && ./monitor.sh >> logs/cron_monitor.log 2>&1

# 每天凌晨3点自动备份
0 3 * * * cd ~/clawd/stock_stalker && ./backup.sh >> logs/cron_backup.log 2>&1

# 每周一清理旧日志
0 0 * * 1 find ~/clawd/stock_stalker/logs -name "*.log" -mtime +30 -delete

# ============================================
EOF

# 安装crontab
crontab /tmp/current_crontab

echo "✅ 定时任务安装完成！"
echo ""
echo "📋 已安装的任务:"
echo "  • 每30分钟: 服务器监控"
echo "  • 每天3:00: 自动备份"
echo "  • 每周一: 清理旧日志"
echo ""
echo "📊 查看当前crontab:"
crontab -l | grep -A10 "Stock Stalker"
echo ""
echo "💡 提示:"
echo "  编辑: crontab -e"
echo "  查看: crontab -l"
echo "  删除: crontab -r"
echo ""
echo "日志位置:"
echo "  ~/clawd/stock_stalker/logs/cron_monitor.log"
echo "  ~/clawd/stock_stalker/logs/cron_backup.log"
