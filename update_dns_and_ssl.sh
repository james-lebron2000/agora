#!/bin/bash
# update_dns_and_ssl.sh - 更新DNS并申请SSL证书

SERVER_IP="45.32.219.241"
DOMAIN="findclinicaltrial.org"

echo "🔧 DNS 和 SSL 配置脚本"
echo "======================"
echo ""

# 检查当前DNS
echo "📊 当前DNS解析:"
CURRENT_IP=$(dig +short $DOMAIN)
echo "  $DOMAIN -> $CURRENT_IP"
echo ""

if [ "$CURRENT_IP" = "$SERVER_IP" ]; then
    echo "✅ DNS 已正确指向服务器"
    echo ""
    echo "🚀 立即申请 SSL 证书..."
    
    ssh root@$SERVER_IP << 'SSHCOMMANDS'
        # 停止 nginx 容器释放80端口
        cd /opt/treatbot/server
        docker compose stop nginx
        
        # 使用 standalone 模式申请证书
        certbot certonly --standalone -d findclinicaltrial.org -d www.findclinicaltrial.org --agree-tos --non-interactive -m admin@findclinicaltrial.org
        
        # 检查证书
        if [ -f "/etc/letsencrypt/live/findclinicaltrial.org/fullchain.pem" ]; then
            echo "✅ SSL 证书申请成功"
            
            # 更新 nginx 配置使用 SSL
            cat > /opt/treatbot/server/nginx/default.conf << 'EOF'
server {
    listen 80;
    server_name findclinicaltrial.org www.findclinicaltrial.org;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name findclinicaltrial.org www.findclinicaltrial.org;
    
    ssl_certificate /etc/letsencrypt/live/findclinicaltrial.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/findclinicaltrial.org/privkey.pem;
    
    location / {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF
            
            # 重启 nginx
            docker compose up -d nginx
            
            # 设置自动续期
            (crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet && docker compose -f /opt/treatbot/server/docker-compose.yml restart nginx") | crontab -
            
            echo "✅ HTTPS 配置完成"
        else
            echo "❌ SSL 证书申请失败"
        fi
SSHCOMMANDS
else
    echo "⚠️  DNS 未更新"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "请手动更新 DNS 记录:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "域名: $DOMAIN"
    echo "当前指向: $CURRENT_IP"
    echo "需要改为: $SERVER_IP"
    echo ""
    echo "操作步骤:"
    echo "1. 登录你的域名提供商后台"
    echo "2. 找到 DNS 管理 / 域名解析"
    echo "3. 修改 A 记录:"
    echo "   - 主机: @"
    echo "   - 值: $SERVER_IP"
    echo "   - TTL: 600"
    echo ""
    echo "完成后重新运行此脚本"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi
