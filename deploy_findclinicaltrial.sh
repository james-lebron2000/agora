#!/bin/bash
# deploy_findclinicaltrial.sh - 部署临床试验匹配平台

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Deploying findclinicaltrial.org (Treatbot Platform)    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

DOMAIN="findclinicaltrial.org"
PROJECT_DIR="$HOME/treatbot-weapp"
DEPLOY_DIR="/var/www/$DOMAIN"

echo "📋 部署清单:"
echo "  域名: $DOMAIN"
echo "  项目: $PROJECT_DIR"
echo "  部署目录: $DEPLOY_DIR"
echo ""

# 检查项目是否存在
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ 错误: 项目目录不存在: $PROJECT_DIR"
    echo ""
    echo "请先确认 Treatbot 项目位置:"
    echo "  ls -la ~/treatbot-weapp"
    echo "  或"
    echo "  ls -la ~/clawd/treatbot-weapp"
    exit 1
fi

echo "✅ 项目目录存在"
echo ""

# 部署步骤
echo "🚀 部署步骤:"
echo ""
echo "1. 本地测试运行"
echo "   cd $PROJECT_DIR/server"
echo "   make dev"
echo ""
echo "2. 生产环境部署 (需要服务器)"
echo "   ./deploy.sh production"
echo ""
echo "3. 配置域名 $DOMAIN"
echo "   - 购买域名: $DOMAIN"
echo "   - 配置DNS指向服务器IP"
echo "   - 申请SSL证书"
echo ""
echo "4. 配置微信小程序"
echo "   - 添加服务器域名: https://$DOMAIN"
echo "   - 配置request合法域名"
echo ""

echo "⚠️  当前状态: 等待服务器购买"
echo ""
echo "你还没有购买服务器，无法完成生产部署。"
echo ""
echo "💡 建议操作:"
echo "  1. 购买腾讯云服务器 (约¥200/月)"
echo "  2. 提供服务器IP地址"
echo "  3. 我将远程部署并配置"
echo ""
echo "或者先在本地测试:"
echo "  cd $PROJECT_DIR/server && make dev"
echo ""
