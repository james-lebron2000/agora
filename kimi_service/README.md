# Kimi多模态OCR服务 - 部署指南

## 📦 交付文件清单

| 文件 | 路径 | 说明 |
|------|------|------|
| **Kimi OCR核心服务** | `~/clawd/kimi_service/kimi_ocr.py` | OCR处理核心代码 |
| **数据库Schema** | `~/clawd/kimi_service/database_schema.sql` | 完整病历结构化数据库 |
| **API端点** | `~/clawd/kimi_service/ocr_api.py` | Flask API接口 |
| **部署指南** | `~/clawd/kimi_service/README.md` | 本文件 |

---

## 🚀 快速部署

### 1. 安装依赖

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install flask requests pillow pdf2image

# 安装poppler（PDF处理必需）
# macOS:
brew install poppler
# Ubuntu:
# apt-get install poppler-utils
```

### 2. 配置Kimi API

API Key已嵌入代码：`sk-jNGnc1N6uxUGIyY4YI7Z143DZ4BPTtkWA8nuPRj7lDBG98sg`

### 3. 启动服务

```bash
cd ~/clawd/kimi_service
python ocr_api.py
```

服务将运行在 `http://localhost:5000`

---

## 📡 API使用

### 单文件OCR提取

```bash
curl -X POST http://localhost:5000/api/ocr/extract \
  -F "file=@病历照片.jpg"
```

**响应示例：**
```json
{
  "success": true,
  "data": {
    "patient_basic_info": {
      "name": "张三",
      "gender": "女",
      "age": 58
    },
    "diagnosis": {
      "primary_diagnosis": "非小细胞肺癌",
      "icd10_code": "C34.9",
      "morphology": "腺癌"
    },
    "staging": {
      "overall_stage": "IIIB期",
      "t_stage": "T3",
      "n_stage": "N2",
      "m_stage": "M0"
    },
    "molecular_pathology": {
      "egfr": {
        "tested": true,
        "mutation_status": "阳性",
        "mutation_type": "L858R"
      }
    },
    "treatment_history": {
      "total_lines": 2,
      "treatments": [...]
    },
    "physical_status": {
      "ecog_score": 1
    },
    "laboratory": {
      "complete_blood_count": {...},
      "liver_function": {...}
    }
  },
  "completeness_score": 0.85,
  "message": "病历信息提取成功"
}
```

---

## 🗄️ 数据库表说明

### 核心表结构

| 表名 | 字段数 | 用途 |
|------|--------|------|
| **patients** | 15+ | 患者基本信息 |
| **diagnoses** | 10+ | 诊断信息(ICD-10) |
| **staging** | 15+ | TNM分期信息 |
| **pathology** | 20+ | 病理+免疫组化 |
| **molecular_markers** | 15+ | 基因突变检测 |
| **treatment_history** | 25+ | 治疗史时间线 |
| **physical_status** | 10+ | ECOG/KPS评分 |
| **laboratory_tests** | 50+ | 血常规/生化/肿瘤标志物 |
| **comorbidities** | 15+ | 合并症 |
| **contraindications** | 15+ | 禁忌症筛查 |
| **ocr_extractions** | 10+ | OCR提取记录 |

**总计：200+ 个字段**，覆盖所有临床试验入排标准需要的信息！

---

## 🎯 与临床试验匹配系统集成

### 数据流向

```
病历图像/PDF
    ↓
Kimi OCR API (/api/ocr/extract)
    ↓
结构化病历数据（200+字段）
    ↓
存入数据库
    ↓
临床试验匹配引擎
    ↓
精确匹配结果（NCT编号+试验名称）
```

---

## 📋 前端展示建议

基于提取的结构化数据，前端可以展示：

### 1. 病历摘要卡片
- 患者基本信息
- 主要诊断（带ICD-10编码）
- TNM分期
- ECOG评分

### 2. 基因突变面板
- EGFR/ALK/PD-L1等关键标志物
- 可视化突变图谱

### 3. 治疗史时间线
- 各线治疗记录
- 疗效评价（CR/PR/SD/PD）
- 进展时间标记

### 4. 缺失字段提醒
- 自动识别缺失的关键信息
- 提示用户补充

---

## 🔧 部署到生产服务器

```bash
# 1. 复制到服务器
scp -r ~/clawd/kimi_service ubuntu@49.235.162.129:/opt/treatbot/server/

# 2. SSH到服务器安装依赖
ssh ubuntu@49.235.162.129
cd /opt/treatbot/server/kimi_service
pip3 install -r requirements.txt

# 3. 创建systemd服务
sudo tee /etc/systemd/system/kimi-ocr.service << 'EOF'
[Unit]
Description=Kimi OCR Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/treatbot/server/kimi_service
ExecStart=/usr/bin/python3 ocr_api.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# 4. 启动服务
sudo systemctl enable kimi-ocr
sudo systemctl start kimi-ocr

# 5. 配置Nginx反向代理
# 将 /api/ocr 路由到 localhost:5000
```

---

## ✅ 测试验证

```bash
# 健康检查
curl http://localhost:5000/api/ocr/health

# OCR测试
curl -X POST http://localhost:5000/api/ocr/extract \
  -F "file=@test_medical_record.jpg"
```

---

## 🎉 完成！

现在你可以：
1. ✅ 上传病历图像/PDF
2. ✅ 自动提取200+个结构化字段
3. ✅ 与临床试验匹配系统集成
4. ✅ 精确匹配到具体试验名称和NCT编号

**所有组件已准备就绪，可以立即部署使用！** 🚀