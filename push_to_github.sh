#!/bin/bash
# push_to_github.sh - 推送Treatbot到GitHub

cd ~/treatbot-weapp

echo "🚀 推送Treatbot到GitHub"
echo "========================"

# 检查GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 请先安装GitHub CLI:"
    echo "   brew install gh"
    echo "   然后: gh auth login"
    exit 1
fi

# 登录检查
if ! gh auth status &> /dev/null; then
    echo "❌ 请先登录GitHub:"
    echo "   gh auth login"
    exit 1
fi

# 创建仓库
echo "📦 创建GitHub仓库..."
gh repo create treatbot-weapp --public --source=. --remote=origin --push

echo ""
echo "✅ 推送完成！"
echo "仓库地址: https://github.com/$(gh api user -q .login)/treatbot-weapp"
