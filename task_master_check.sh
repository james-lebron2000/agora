#!/bin/bash
# task_master_check.sh - 每30分钟检查任务队列

LOG_FILE="~/clawd/task_logs/check_$(date +%Y%m%d).log"
mkdir -p ~/clawd/task_logs

echo "===== Task Master Check - $(date '+%Y-%m-%d %H:%M:%S') =====" >> $LOG_FILE

# 统计任务
PENDING_COUNT=$(ls ~/clawd/task_queue/pending/ 2>/dev/null | wc -l)
IN_PROGRESS_COUNT=$(ls ~/clawd/task_queue/in_progress/ 2>/dev/null | wc -l)
COMPLETED_TODAY=$(find ~/clawd/task_queue/completed/ -name "*$(date +%Y%m%d)*" 2>/dev/null | wc -l)

echo "任务统计: 待办=$PENDING_COUNT, 进行中=$IN_PROGRESS_COUNT, 今日完成=$COMPLETED_TODAY" >> $LOG_FILE

# 如果有待办任务，调用 codex
if [ $PENDING_COUNT -gt 0 ]; then
    echo "发现 $PENDING_COUNT 个待办任务，准备调用 Codex..." >> $LOG_FILE
    
    # 获取最高优先级任务
    TASK_FILE=$(ls -t ~/clawd/task_queue/pending/*.yaml 2>/dev/null | head -1)
    
    if [ -f "$TASK_FILE" ]; then
        TASK_ID=$(basename "$TASK_FILE" .yaml)
        echo "执行任务: $TASK_ID" >> $LOG_FILE
        
        # 移动到进行中
        mv "$TASK_FILE" ~/clawd/task_queue/in_progress/
        
        # 解析任务
        PROJECT=$(grep "project:" ~/clawd/task_queue/in_progress/$(basename $TASK_FILE) | cut -d: -f2 | xargs)
        TASK_TYPE=$(grep "type:" ~/clawd/task_queue/in_progress/$(basename $TASK_FILE) | cut -d: -f2 | xargs)
        DESCRIPTION=$(grep "description:" ~/clawd/task_queue/in_progress/$(basename $TASK_FILE) | cut -d: -f2- | xargs)
        
        # 根据项目路径执行
        case $PROJECT in
            "stock_stalker")
                cd ~/clawd/stock_stalker
                echo "调用 Codex 完善 Stock Stalker..." >> $LOG_FILE
                # 这里会调用 codex，但暂时用日志代替
                echo "[CODEX_CALL] $DESCRIPTION" >> $LOG_FILE
                ;;
            "treatbot")
                cd ~/treatbot-weapp
                echo "调用 Codex 完善 Treatbot..." >> $LOG_FILE
                echo "[CODEX_CALL] $DESCRIPTION" >> $LOG_FILE
                ;;
            *)
                echo "未知项目: $PROJECT" >> $LOG_FILE
                ;;
        esac
        
        # 标记完成（模拟）
        mv ~/clawd/task_queue/in_progress/$(basename $TASK_FILE) ~/clawd/task_queue/completed/${TASK_ID}_$(date +%Y%m%d_%H%M%S).yaml
        echo "任务 $TASK_ID 完成" >> $LOG_FILE
    fi
else
    echo "无待办任务" >> $LOG_FILE
fi

echo "" >> $LOG_FILE
