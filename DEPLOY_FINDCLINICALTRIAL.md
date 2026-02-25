# Treatbot 生产部署完整指南

> 域名：findclinicaltrial.org

---

## 📋 部署前检查清单

### 1. 服务器准备
- [ ] 购买腾讯云轻量应用服务器（4核8G 12M带宽）
- [ ] 选择地域：上海/北京（靠近用户）
- [ ] 操作系统：Ubuntu 20.04 LTS
- [ ] 重置密码并记录
- [ ] 记录公网 IP 地址

### 2. 域名准备
- [ ] 购买域名：findclinicaltrial.org
- [ ] 配置 DNS 解析到服务器 IP
- [ ] 等待 DNS 生效（通常 5-30 分钟）

### 3. 安全组配置
- [ ] 开放端口 22 (SSH)
- [ ] 开放端口 80 (HTTP)
- [ ] 开放端口 443 (HTTPS)
- [ ] 开放端口 3000 (应用)

---

## 🚀 一键部署脚本

```bash
#!/bin/bash
# deploy.sh - Treatbot 生产部署脚本

set -e

DOMAIN="findclinicaltrial.org"
SERVER_IP="YOUR_SERVER_IP"
PROJECT_DIR="/opt/treatbot"

echo "🚀 开始部署 Treatbot 到 $DOMAIN..."

# 1. 连接服务器
echo "📡 连接到服务器 $SERVER_IP..."
ssh ubuntu@$SERVER_IP << 'REMOTE_SCRIPT'

# 2. 安装环境
echo "📦 安装依赖..."
sudo apt update
sudo apt install -y docker.io docker-compose nginx certbot python3-certbot-nginx git

# 3. 克隆项目
echo "📥 下载项目..."
sudo mkdir -p $PROJECT_DIR
sudo git clone https://github.com/your-repo/treatbot.git $PROJECT_DIR || true
cd $PROJECT_DIR

# 4. 配置环境变量
echo "⚙️  配置环境..."
sudo cp server/.env.example server/.env
# 编辑 .env 文件（需要手动配置）
sudo nano server/.env

# 5. 启动服务
echo "🎯 启动服务..."
cd server
sudo docker-compose up -d

# 6. 配置 Nginx
echo "🌐 配置 Nginx..."
sudo tee /etc/nginx/sites-available/treatbot << 'EOF'
server {
    listen 80;
    server_name findclinicaltrial.org www.findclinicaltrial.org;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/treatbot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 7. 申请 SSL 证书
echo "🔒 申请 SSL 证书..."
sudo certbot --nginx -d findclinicaltrial.org -d www.findclinicaltrial.org --non-interactive --agree-tos -m your-email@example.com

# 8. 设置自动续期
echo "🔄 配置自动续期..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

# 9. 启动完成
echo "✅ 部署完成！"
echo ""
echo "🌐 访问地址:"
echo "  - 网站: https://findclinicaltrial.org"
echo "  - 管理后台: https://findclinicaltrial.org/admin"
echo "  - API: https://findclinicaltrial.org/api"

REMOTE_SCRIPT

echo "🎉 部署脚本执行完毕！"
```

---

## 🔧 手动部署步骤

### 步骤 1: 连接服务器
```bash
ssh ubuntu@YOUR_SERVER_IP
```

### 步骤 2: 安装 Docker
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

### 步骤 3: 安装 Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 步骤 4: 上传项目
```bash
# 本地执行
scp -r ~/treatbot-weapp ubuntu@YOUR_SERVER_IP:/opt/
```

### 步骤 5: 配置环境
```bash
cd /opt/treatbot-weapp/server
cp .env.example .env
nano .env  # 编辑配置
```

### 步骤 6: 启动服务
```bash
docker-compose up -d
```

### 步骤 7: 配置域名
```bash
# 编辑 DNS 记录，添加 A 记录指向服务器 IP
```

---

## ⚙️ 环境变量配置

```env
# 基础配置
NODE_ENV=production
PORT=3000

# 数据库（使用云数据库或本地）
DB_HOST=localhost
DB_PORT=3306
DB_USER=treatbot
DB_PASSWORD=YOUR_STRONG_PASSWORD
DB_NAME=treatbot

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=YOUR_REDIS_PASSWORD

# JWT
JWT_SECRET=YOUR_JWT_SECRET_KEY

# 微信小程序
WEAPP_APPID=wxYOUR_APPID
WEAPP_SECRET=YOUR_APP_SECRET

# 腾讯云
COS_SECRET_ID=YOUR_SECRET_ID
COS_SECRET_KEY=YOUR_SECRET_KEY
COS_BUCKET=treatbot-files
COS_REGION=ap-shanghai

# OCR
OCR_SECRET_ID=YOUR_OCR_SECRET_ID
OCR_SECRET_KEY=YOUR_OCR_SECRET_KEY
```

---

## 🔍 部署验证

### 检查服务状态
```bash
# 检查 Docker 容器
docker-compose ps

# 检查日志
docker-compose logs -f api

# 测试 API
curl http://localhost:3000/health
```

### 检查 Nginx
```bash
sudo nginx -t
sudo systemctl status nginx
```

### 检查 SSL
```bash
sudo certbot certificates
```

---

## 🛠️ 故障排查

### 问题 1: 端口被占用
```bash
# 检查端口
sudo netstat -tulnp | grep :3000

# 释放端口
sudo kill -9 <PID>
```

### 问题 2: 数据库连接失败
```bash
# 检查 MySQL
sudo systemctl status mysql

# 检查连接
mysql -h localhost -u treatbot -p
```

### 问题 3: Nginx 配置错误
```bash
# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

---

## 📊 监控与维护

### 查看日志
```bash
# 应用日志
docker-compose logs -f api

# Nginx 日志
sudo tail -f /var/log/nginx/access.log

# 系统日志
sudo journalctl -u treatbot -f
```

### 备份数据
```bash
# 数据库备份
mysqldump -u root -p treatbot > backup_$(date +%Y%m%d).sql

# 文件备份
tar -czvf backup_$(date +%Y%m%d).tar.gz /opt/treatbot-weapp
```

### 更新部署
```bash
cd /opt/treatbot-weapp
git pull
docker-compose down
docker-compose up -d
```

---

## 🎯 部署后配置

### 1. 微信小程序配置
- 登录微信公众平台
- 开发 → 开发设置 → 服务器域名
- 添加: https://findclinicaltrial.org

### 2. 腾讯云 COS 配置
- 配置跨域访问
- 设置防盗链
- 开启 CDN 加速

### 3. 监控告警
- 配置云监控
- 设置告警规则
- 配置日志收集

---

## 📞 技术支持

部署过程中遇到问题？
- 查看日志: `docker-compose logs`
- 检查状态: `docker-compose ps`
- 重启服务: `docker-compose restart`

---

**准备开始部署？提供你的服务器 IP 地址，我立即远程部署！** 🚀
