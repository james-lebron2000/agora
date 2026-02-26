# Treatbot 项目完整交付包 - 最终版

> 日期: 2026-02-26
> 版本: v1.0

---

## 📦 交付清单

### 1. 匹配算法后端服务
**位置:** `/tmp/treatbot-matching/`
**生产包:** `/tmp/deploy_package.tar.gz`

**文件结构:**
```
treatbot-matching/
├── src/                          # TypeScript源码
│   ├── models/
│   │   ├── Patient.ts            # 患者数据模型
│   │   ├── Trial.ts              # 试验数据模型
│   │   └── Match.ts              # 匹配结果模型
│   ├── services/
│   │   ├── MatchingEngine.ts     # 核心匹配算法 (500行)
│   │   └── MatchService.ts       # 匹配服务层
│   ├── controllers/
│   │   └── MatchController.ts    # API控制器
│   ├── routes/
│   │   └── matchRoutes.ts        # 路由定义
│   ├── utils/
│   │   └── missingFields.ts      # 缺失字段检测
│   ├── app.ts                    # Express应用
│   └── server.ts                 # 服务入口
├── tests/                        # 单元测试
├── dist/                         # 编译后的JS代码
├── package.json
├── tsconfig.json
└── README.md
```

**核心功能:**
- ✅ 7维度智能匹配算法（总分100分）
- ✅ 匹配等级划分（高度/中度/低度/不匹配）
- ✅ 排除标准检查（绝对/相对）
- ✅ 缺失字段检测（P0/P1/P2优先级）
- ✅ RESTful API（分页/排序/筛选）

---

### 2. API接口文档
**位置:** `~/clawd/TREATBOT_API_FOR_FRONTEND.md`

**已可用接口:**
| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 健康检查 | GET | `/health` | ✅ 可用 |
| 试验列表 | GET | `/api/trials` | ✅ 可用 |
| 匹配试验 | POST | `/api/trials/matches/find` | ✅ 可用 |

**待实现接口:**
| 接口 | 方法 | 路径 | 状态 |
|------|------|------|------|
| 上传病历 | POST | `/api/medical/upload` | ⏳ 待部署 |
| 解析状态 | GET | `/api/medical/parse-status` | ⏳ 待部署 |
| 报名申请 | POST | `/api/applications` | ⏳ 待开发 |

---

### 3. 部署脚本
**位置:** `/tmp/ONE_CLICK_DEPLOY.sh`

**功能:**
1. 安装 multer/cors 依赖
2. 创建上传目录
3. 生成 medical.js 路由
4. 修改 app.js 添加CORS
5. 重启服务

---

## 🚀 部署指南

### 方案A: 一键部署（推荐）

```bash
# 1. SSH到服务器
ssh ubuntu@49.235.162.129
# 密码: sndQueAy8#Z)6S

# 2. 在服务器上下载并执行部署脚本
curl -o /tmp/deploy.sh [部署脚本URL]
bash /tmp/deploy.sh
```

### 方案B: 手动部署

**步骤1: 部署匹配服务**
```bash
# SSH到服务器
ssh ubuntu@49.235.162.129

# 创建目录
sudo mkdir -p /opt/treatbot-matching
sudo chown ubuntu:ubuntu /opt/treatbot-matching
cd /opt/treatbot-matching

# 解压代码（需要先上传deploy_package.tar.gz）
tar -xzf /tmp/deploy_package.tar.gz

# 安装依赖
npm ci --production

# 安装PM2
sudo npm install -g pm2

# 启动服务
pm2 start dist/server.js --name treatbot-matching
pm2 save
```

**步骤2: 修复上传API**
```bash
cd /opt/treatbot/server

# 安装依赖
npm install multer cors

# 创建上传目录
mkdir -p uploads
chmod 755 uploads

# 创建路由文件 routes/medical.js
cat > routes/medical.js << 'EOF'
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/opt/treatbot/server/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'medical-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 }
});

router.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 400,
        message: '未上传文件或文件类型不支持'
      });
    }

    const fileId = req.file.filename;

    res.json({
      success: true,
      code: 200,
      fileId: fileId,
      url: `/uploads/${fileId}`,
      originalName: req.file.originalname,
      size: req.file.size,
      message: '上传成功'
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      code: 500,
      message: error.message || '上传失败'
    });
  }
});

module.exports = router;
EOF

# 修改 app.js
# 在顶部添加:
const cors = require('cors');
const medicalRoutes = require('./routes/medical');

# 在 app.use(express.json()) 后添加:
app.use(cors({
  origin: ['http://localhost:5173', 'http://inseq.top'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use('/api/medical', medicalRoutes);

# 重启服务
pm2 restart all
```

---

## 🧪 测试命令

### 测试健康检查
```bash
curl http://49.235.162.129:3000/health
```

### 测试匹配API
```bash
curl -X POST http://49.235.162.129:3000/api/trials/matches/find \
  -H "Content-Type: application/json" \
  -d '{
    "disease": "肺癌",
    "stage": "III期",
    "city": "上海"
  }'
```

### 测试上传API（部署后）
```bash
curl -X POST http://49.235.162.129:3000/api/medical/upload \
  -F "file=@test.jpg" \
  -F "type=auto"
```

---

## 📋 前端对接要点

### 微信开发者工具设置
1. 设置 → 项目设置 → 本地设置
2. ✅ **必须勾选"不校验合法域名"**

### 小程序调用示例
```javascript
// 匹配试验
wx.request({
  url: 'http://49.235.162.129:3000/api/trials/matches/find',
  method: 'POST',
  data: {
    disease: '非小细胞肺癌',  // 必填
    stage: 'III期',           // 可选
    city: '上海',             // 可选
    gene_mutation: 'EGFR突变' // 可选
  },
  success: (res) => {
    console.log('匹配结果:', res.data.matches);
  }
});

// 上传病历（待后端部署）
wx.uploadFile({
  url: 'http://49.235.162.129:3000/api/medical/upload',
  filePath: tempFilePath,
  name: 'file',  // 字段名必须是'file'
  formData: {
    type: 'auto'
  }
});
```

---

## ⚠️ 已知问题

### 1. 上传API返回Empty Reply
**原因:** 后端缺少multer配置和CORS支持
**解决:** 执行上述部署步骤修复

### 2. 域名未备案
**原因:** inseq.top需要ICP备案才能使用HTTPS
**临时解决:** 开发阶段使用IP地址 + 勾选不校验域名

### 3. 试验数据不完整
**现状:** 只有4条测试数据
**解决:** 需要导入496条真实数据

---

## 🎯 下一步建议

### 优先级P0（必须）
1. [ ] 执行服务器部署（按照上述指南）
2. [ ] 验证API可用性
3. [ ] 导入496条试验数据

### 优先级P1（重要）
4. [ ] 开发病历OCR解析服务
5. [ ] 实现结构化数据提取
6. [ ] 完成报名流程

### 优先级P2（优化）
7. [ ] 申请ICP备案
8. [ ] 配置HTTPS证书
9. [ ] 性能优化和缓存

---

## 📞 需要帮助？

如果部署遇到问题：
1. 检查服务器上 `/opt/treatbot/` 目录是否存在
2. 检查Node.js是否安装: `node --version`
3. 检查PM2是否安装: `pm2 --version`
4. 查看日志: `pm2 logs`

---

**所有代码和文档已准备就绪，等待部署执行！** 🚀