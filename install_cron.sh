#!/bin/bash
# install_cron.sh - 安装定时任务

echo "📦 安装 Task Master Cron 定时任务..."

# 创建任务队列目录
mkdir -p ~/clawd/task_queue/{pending,in_progress,completed}
mkdir -p ~/clawd/task_definitions
mkdir -p ~/clawd/task_logs

# 添加 cron 任务
crontab -l > /tmp/current_crontab 2>/dev/null || echo "" > /tmp/current_crontab

# 检查是否已存在
if grep -q "task_master_check.sh" /tmp/current_crontab; then
    echo "⚠️  Cron 任务已存在，跳过安装"
else
    # 添加新任务
    cat >> /tmp/current_crontab << 'EOF'

# Task Master - 每30分钟检查任务队列
*/30 * * * * cd ~/clawd && ./task_master_check.sh >> ~/clawd/task_logs/cron.log 2>&1

# Task Master - 每日9点和18点发送进度报告
0 9,18 * * * cd ~/clawd && ./task_master_report.sh >> ~/clawd/task_logs/report.log 2>&1

EOF
    
    crontab /tmp/current_crontab
    echo "✅ Cron 任务安装成功！"
fi

# 显示当前 crontab
echo ""
echo "📋 当前定时任务:"
crontab -l | grep -A2 "Task Master"

echo ""
echo "🎯 Task Master 安装完成！"
echo "   - 检查间隔: 每30分钟"
echo "   - 报告时间: 每天9:00和18:00"
echo "   - 日志位置: ~/clawd/task_logs/"
