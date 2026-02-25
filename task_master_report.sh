#!/bin/bash
# task_master_report.sh - 每日进度报告

REPORT_FILE="~/clawd/task_logs/report_$(date +%Y%m%d_%H%M).txt"
mkdir -p ~/clawd/task_logs

cat > $REPORT_FILE << EOF
📊 Task Master 进度报告
时间: $(date '+%Y-%m-%d %H:%M')

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 进行中任务:
EOF

# 统计进行中任务
IN_PROGRESS=$(ls ~/clawd/task_queue/in_progress/ 2>/dev/null)
if [ -z "$IN_PROGRESS" ]; then
    echo "  (无)" >> $REPORT_FILE
else
    for task in $IN_PROGRESS; do
        echo "  • $(basename $task .yaml)" >> $REPORT_FILE
    done
fi

cat >> $REPORT_FILE << EOF

⏳ 待办任务:
EOF

# 统计待办任务
PENDING=$(ls ~/clawd/task_queue/pending/ 2>/dev/null | head -5)
if [ -z "$PENDING" ]; then
    echo "  (无)" >> $REPORT_FILE
else
    for task in $PENDING; do
        # 解析优先级
        PRIORITY=$(grep "priority:" ~/clawd/task_queue/pending/$task 2>/dev/null | cut -d: -f2 | xargs || echo "P2")
        echo "  • [${PRIORITY}] $(basename $task .yaml)" >> $REPORT_FILE
    done
    
    TOTAL_PENDING=$(ls ~/clawd/task_queue/pending/ 2>/dev/null | wc -l)
    if [ $TOTAL_PENDING -gt 5 ]; then
        echo "  ... 还有 $((TOTAL_PENDING - 5)) 个任务" >> $REPORT_FILE
    fi
fi

cat >> $REPORT_FILE << EOF

✅ 最近完成 ($(date +%Y-%m-%d)):
EOF

# 统计今日完成
COMPLETED=$(ls -t ~/clawd/task_queue/completed/*$(date +%Y%m%d)* 2>/dev/null | head -5)
if [ -z "$COMPLETED" ]; then
    echo "  (无)" >> $REPORT_FILE
else
    for task in $COMPLETED; do
        echo "  • $(basename $task .yaml)" >> $REPORT_FILE
    done
fi

cat >> $REPORT_FILE << EOF

📈 今日统计:
  完成任务: $(ls ~/clawd/task_queue/completed/*$(date +%Y%m%d)* 2>/dev/null | wc -l) 个
  新增任务: $(ls ~/clawd/task_queue/pending/*$(date +%Y%m%d)* 2>/dev/null | wc -l) 个
  待办任务: $(ls ~/clawd/task_queue/pending/ 2>/dev/null | wc -l) 个

🎯 建议:
EOF

# 生成建议
PENDING_COUNT=$(ls ~/clawd/task_queue/pending/ 2>/dev/null | wc -l)
if [ $PENDING_COUNT -eq 0 ]; then
    echo "  ✅ 所有任务已完成！可以考虑添加新任务。" >> $REPORT_FILE
else
    # 检查是否有P0/P1任务
    HIGH_PRIORITY=$(grep -l "priority: P0\|priority: P1" ~/clawd/task_queue/pending/*.yaml 2>/dev/null | wc -l)
    if [ $HIGH_PRIORITY -gt 0 ]; then
        echo "  ⚠️  有 $HIGH_PRIORITY 个高优先级任务待处理" >> $REPORT_FILE
    fi
    
    # 检查Stock Stalker
    if ls ~/clawd/task_queue/pending/*stock_stalker* 1>/dev/null 2>&1; then
        echo "  💡 Stock Stalker 有待办任务，可以继续完善" >> $REPORT_FILE
    fi
    
    # 检查Treatbot
    if ls ~/clawd/task_queue/pending/*treatbot* 1>/dev/null 2>&1; then
        echo "  ⏳ Treatbot 等待服务器部署" >> $REPORT_FILE
    fi
fi

cat >> $REPORT_FILE << EOF

📋 快速操作:
  查看详细报告: cat $REPORT_FILE
  查看所有任务: ls ~/clawd/task_queue/pending/
  添加新任务: ./task_master add --task "任务描述"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EOF

# 显示报告
cat $REPORT_FILE

# 同时保存到最新报告链接
ln -sf $REPORT_FILE ~/clawd/task_logs/latest_report.txt
