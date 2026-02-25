#!/bin/bash
# setup_tunnel.sh - 设置 SSH 反向隧道

# 配置
SERVER_IP="45.32.219.241"
LOCAL_PORT="3000"      # 本地 Mac 程序端口
REMOTE_PORT="8080"     # 服务器对外端口
DOMAIN="findclinicaltrial.org"

echo "🚀 SSH 反向隧道设置"
echo "==================="
echo ""
echo "原理:"
echo "  本地 Mac (localhost:3000)"
echo "     ↓ SSH 隧道"
echo "  服务器 ($SERVER_IP:$REMOTE_PORT)"
echo "     ↓ Nginx 反向代理"
echo "  用户访问 (http://$DOMAIN)"
echo ""

# 在本地 Mac 运行的命令
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💻 请在本地 Mac 终端运行以下命令:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "# 方式1: 简单 SSH 隧道（关闭终端后失效）"
echo "ssh -R $REMOTE_PORT:localhost:$LOCAL_PORT root@$SERVER_IP"
echo ""
echo "# 方式2: 后台运行隧道（推荐）"
echo "ssh -fNT -R $REMOTE_PORT:localhost:$LOCAL_PORT root@$SERVER_IP"
echo ""
echo "# 方式3: 使用 autossh 自动重连"
echo "autossh -M 0 -fNT -R $REMOTE_PORT:localhost:$LOCAL_PORT root@$SERVER_IP"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 检查服务器是否已配置
if ssh -o ConnectTimeout=5 root@$SERVER_IP "echo 'OK'" 2>/dev/null | grep -q OK; then
    echo "✅ 服务器 SSH 连接正常"
    
    # 配置服务器 Nginx 转发到隧道端口
    ssh root@$SERVER_IP << EOF
        cat > /opt/treatbot/server/nginx/tunnel.conf << 'NGINXCONF'
server {
    listen 80;
    server_name tunnel.findclinicaltrial.org;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXCONF
        
        cd /opt/treatbot/server && docker compose restart nginx
        echo "✅ 服务器隧道配置完成"
EOF
    
    echo ""
    echo "🎯 访问地址:"
    echo "   http://tunnel.findclinicaltrial.org (DNS 更新后)"
    echo "   http://45.32.219.241:8080 (直接访问)"
else
    echo "❌ 无法连接到服务器，请检查 SSH 配置"
fi
