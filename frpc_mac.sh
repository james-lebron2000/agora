#!/bin/bash
# frpc.sh - 在本地 Mac 运行此脚本建立隧道

# 配置
SERVER_IP="45.32.219.241"
FRP_VERSION="0.61.1"
LOCAL_PORT="3000"  # 修改为你本地程序的端口

echo "🚀 frp 客户端启动脚本"
echo "====================="
echo ""

# 检查 frpc 是否存在
if [ ! -f "/tmp/frp/frpc" ]; then
    echo "📦 下载 frp 客户端..."
    cd /tmp
    FRP_FILE="frp_${FRP_VERSION}_darwin_amd64"
    
    if [[ $(uname -m) == "arm64" ]]; then
        FRP_FILE="frp_${FRP_VERSION}_darwin_arm64"
    fi
    
    curl -sL "https://github.com/fatedier/frp/releases/download/v${FRP_VERSION}/${FRP_FILE}.tar.gz" -o frpc.tar.gz
    tar -xzf frpc.tar.gz
    mv "${FRP_FILE}" frp
    rm -f frpc.tar.gz
    echo "✅ frp 客户端下载完成"
else
    echo "✅ frpc 已存在"
fi

# 创建配置文件
cat > /tmp/frp/frpc.toml << EOF
serverAddr = "$SERVER_IP"
serverPort = 7000
auth.method = "token"
auth.token = "treatbot_secret_token_2026"

[[proxies]]
name = "mac-local"
type = "http"
localPort = $LOCAL_PORT
customDomains = ["mac.findclinicaltrial.org"]

[[proxies]]
name = "mac-local-tcp"
type = "tcp"
localPort = $LOCAL_PORT
remotePort = 8080
EOF

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 配置信息:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "本地端口: $LOCAL_PORT"
echo "远程访问: http://mac.findclinicaltrial.org (DNS更新后)"
echo "        或 http://45.32.219.241:8080 (直接访问)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 启动客户端
echo "🚀 启动 frp 客户端..."
echo "按 Ctrl+C 停止"
echo ""
cd /tmp/frp && ./frpc -c frpc.toml
