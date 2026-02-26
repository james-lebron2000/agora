#!/bin/bash
# 推送Treatbot代码到GitHub

cd ~/treatbot-weapp

echo "🚀 推送代码到 GitHub"
echo "===================="
echo "目标仓库: https://github.com/james-lebron2000/treatbot_we.git"
echo ""

# 检查远程仓库
echo "📡 检查远程仓库..."
if git remote -v | grep -q origin; then
    echo "⚠️  已有远程仓库，移除旧配置..."
    git remote rm origin
fi

# 添加新的远程仓库
echo "➕ 添加远程仓库..."
git remote add origin https://github.com/james-lebron2000/treatbot_we.git

# 检查分支
echo "🌿 检查分支..."
BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "当前分支: $BRANCH"

# 推送代码
echo ""
echo "📤 推送代码..."
git push -u origin $BRANCH --force

echo ""
echo "✅ 推送完成！"
echo "仓库地址: https://github.com/james-lebron2000/treatbot_we"
echo ""
echo "📋 克隆命令（其他机器使用）:"
echo "   git clone https://github.com/james-lebron2000/treatbot_we.git"
