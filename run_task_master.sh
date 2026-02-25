#!/bin/bash
# run_task_master.sh - 手动运行 Task Master（如果 cron 安装失败）

echo "🚀 启动 Task Master..."
echo ""

# 显示当前状态
echo "📊 当前任务状态:"
./task_master status
echo ""

# 询问是否执行任务
read -p "是否立即检查并执行任务队列? (y/n) " answer

if [[ $answer == "y" || $answer == "Y" ]]; then
    echo ""
    echo "🔍 检查任务队列..."
    ./task_master_check.sh
    echo ""
    
    echo "📈 生成进度报告..."
    ./task_master_report.sh
    echo ""
    
    echo "✅ Task Master 执行完成！"
else
    echo "已取消"
fi

echo ""
echo "💡 提示: 你可以手动运行 ./run_task_master.sh 来检查任务队列"
echo "   或添加以下 cron 任务实现自动化:"
echo ""
echo "   # 每30分钟检查一次"
echo "   */30 * * * * cd ~/clawd && ./task_master_check.sh >> ~/clawd/task_logs/cron.log 2>&1"
echo ""
echo "   # 每天9点和18点发送报告"
echo "   0 9,18 * * * cd ~/clawd && ./task_master_report.sh >> ~/clawd/task_logs/report.log 2>&1"
