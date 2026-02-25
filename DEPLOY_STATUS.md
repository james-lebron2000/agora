# Treatbot 部署状态报告

## ✅ 已完成部署

### 1. 服务器基础配置
- **服务器 IP**: 45.32.219.241
- **域名**: findclinicaltrial.org (DNS 待更新)
- **操作系统**: Ubuntu 24.04 LTS
- **Docker**: 29.2.1
- **Docker Compose**: v2.23.0

### 2. Treatbot 应用服务
| 服务 | 状态 | 端口 | 说明 |
|------|------|------|------|
| API | ✅ 健康 | 3000 | Node.js Express 应用 |
| MySQL | ✅ 健康 | 3306 | 数据库 |
| Redis | ✅ 健康 | 6379 | 缓存 |
| Nginx | ✅ 运行 | 80 | 反向代理 |

**访问地址**:
- 直接访问: http://45.32.219.241:3000
- 通过 Nginx: http://45.32.219.241

### 3. frp 内网穿透服务
- **frp Dashboard**: http://45.32.219.241:7500 (admin/admin123)
- **frp 端口**: 7000 (服务端), 8080 (客户端映射)
- **状态**: ✅ 运行中

---

## 🔄 本地 Mac 隧道连接

### 方案 1: frp 内网穿透（推荐）

**在本地 Mac 运行:**
```bash
cd ~/clawd
./frpc_mac.sh
```

**效果**:
- 本地程序运行在 localhost:3000
- 通过 http://45.32.219.241:8080 访问
- 或通过 http://mac.findclinicaltrial.org (DNS更新后)

### 方案 2: SSH 反向隧道

**在本地 Mac 运行:**
```bash
# 简单隧道
ssh -R 8080:localhost:3000 root@45.32.219.241

# 后台运行
ssh -fNT -R 8080:localhost:3000 root@45.32.219.241
```

---

## ⚠️ 待完成任务

### 1. DNS 更新（重要）

**当前状态:**
- 域名: findclinicaltrial.org
- 当前解析: 198.18.0.27 ❌
- 需要改为: 45.32.219.241 ✅

**操作步骤:**
1. 登录域名提供商后台
2. 找到 DNS 管理 / 域名解析
3. 添加 A 记录:
   - 主机: `@`
   - 值: `45.32.219.241`
   - TTL: `600`

### 2. SSL 证书

DNS 更新后，运行以下命令申请 SSL:
```bash
ssh root@45.32.219.241
certbot --nginx -d findclinicaltrial.org -d www.findclinicaltrial.org
```

### 3. 微信小程序配置

1. 登录微信公众平台
2. 开发 → 开发设置 → 服务器域名
3. 添加:
   - request合法域名: `https://findclinicaltrial.org`
   - uploadFile合法域名: `https://findclinicaltrial.org`

---

## 📋 快速操作命令

### 服务器管理
```bash
# 查看服务状态
ssh root@45.32.219.241 "cd /opt/treatbot/server && docker compose ps"

# 查看日志
ssh root@45.32.219.241 "cd /opt/treatbot/server && docker compose logs -f api"

# 重启服务
ssh root@45.32.219.241 "cd /opt/treatbot/server && docker compose restart"
```

### 本地 Mac 隧道
```bash
# 启动 frp 客户端
cd ~/clawd && ./frpc_mac.sh

# 或者 SSH 隧道
ssh -fNT -R 8080:localhost:3000 root@45.32.219.241
```

---

## 🎯 下一步行动

1. **更新 DNS 记录** → 让域名指向服务器
2. **申请 SSL 证书** → 启用 HTTPS
3. **启动本地隧道** → 在 Mac 运行 `./frpc_mac.sh`
4. **配置微信小程序** → 添加服务器域名

---

*最后更新: 2026-02-26 03:38*
