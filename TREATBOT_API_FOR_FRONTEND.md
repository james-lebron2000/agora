# Treatbot 前端API对接文档 v1.0

> 更新时间: 2026-02-26
> 后端地址: http://49.235.162.129:3000

---

## ✅ 已可用接口（可立即联调）

### 1. 健康检查
```http
GET http://49.235.162.129:3000/health
```
**响应:**
```json
{"status": "ok"}
```

---

### 2. 获取试验列表
```http
GET http://49.235.162.129:3000/api/trials
```

**小程序调用:**
```javascript
wx.request({
  url: 'http://49.235.162.129:3000/api/trials',
  method: 'GET',
  success: (res) => {
    console.log('试验列表:', res.data);
  }
});
```

**响应:**
```json
{
  "success": true,
  "trials": [
    {
      "id": 1,
      "nct_id": "NCT06361116",
      "title": "卡瑞利珠单抗联合化疗用于晚期NSCLC",
      "indication": "非小细胞肺癌",
      "phase": "III期",
      "location": "上海、北京、广州",
      "status": "招募中",
      "sponsor": "恒瑞医药"
    }
  ]
}
```

---

### 3. 匹配试验 ⭐核心接口
```http
POST http://49.235.162.129:3000/api/trials/matches/find
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `disease` | string | ✅ | 疾病类型，如"肺癌"、"乳腺癌" |
| `stage` | string | ❌ | 分期，如"III期"、"晚期" |
| `city` | string | ❌ | 城市，如"上海" |
| `gene_mutation` | string | ❌ | 基因突变，如"EGFR L858R" |

**小程序调用:**
```javascript
wx.request({
  url: 'http://49.235.162.129:3000/api/trials/matches/find',
  method: 'POST',
  header: {
    'Content-Type': 'application/json'
  },
  data: {
    disease: '非小细胞肺癌',
    stage: 'III期',
    city: '上海',
    gene_mutation: 'EGFR突变'
  },
  success: (res) => {
    console.log('匹配结果:', res.data.matches);
  }
});
```

**响应:**
```json
{
  "success": true,
  "matches": [
    {
      "trial": {
        "id": 1,
        "nct_id": "NCT06361116",
        "title": "卡瑞利珠单抗联合化疗用于晚期NSCLC",
        "indication": "非小细胞肺癌",
        "phase": "III期",
        "location": "上海、北京、广州",
        "status": "招募中",
        "sponsor": "恒瑞医药"
      },
      "match_score": 92,
      "match_level": "高度匹配",
      "match_reasons": [
        "疾病类型匹配",
        "疾病分期匹配",
        "同城有研究中心",
        "正在招募患者"
      ]
    }
  ]
}
```

---

## ⚠️ 需要后端实现的接口

### 4. 上传病历
```http
POST http://49.235.162.129:3000/api/medical/upload
Content-Type: multipart/form-data
```

**字段:**
- `file` (File) - 图片/PDF文件
- `type` (string) - 文件类型: auto/image/pdf
- `remark` (string) - 备注

**小程序调用:**
```javascript
wx.uploadFile({
  url: 'http://49.235.162.129:3000/api/medical/upload',
  filePath: tempFilePath,  // 本地临时文件路径
  name: 'file',            // 字段名必须是'file'
  formData: {
    type: 'auto',
    remark: '患者病历'
  },
  success: (res) => {
    const data = JSON.parse(res.data);
    console.log('fileId:', data.fileId);
  }
});
```

**响应:**
```json
{
  "success": true,
  "fileId": "medical-1234567890.jpg",
  "url": "/uploads/medical-1234567890.jpg",
  "message": "上传成功"
}
```

---

### 5. 查询解析状态
```http
GET http://49.235.162.129:3000/api/medical/parse-status?fileId={fileId}
```

**响应:**
```json
{
  "success": true,
  "fileId": "medical-1234567890.jpg",
  "status": "completed",  // uploading/parsing/analyzing/completed/failed
  "progress": 100,
  "result": {
    "disease": "非小细胞肺癌",
    "stage": "IIIB期",
    "gene_mutation": "EGFR L858R"
  }
}
```

---

### 6. 提交报名
```http
POST http://49.235.162.129:3000/api/applications
```

**当前状态:** ❌ 后端暂未实现
**前端处理:** 按钮点击提示"后端暂未开放报名接口"

---

## 🔧 微信开发者工具设置

**必须勾选:**
1. 设置 → 项目设置 → 本地设置
2. ✅ 勾选"不校验合法域名、web-view..."

**因为:**
- 开发阶段使用IP地址（http://49.235.162.129:3000）
- 域名备案和HTTPS正在申请中

---

## 📋 前端已完成的修改（确认）

根据你提供的信息，前端已做以下修改:

✅ **匹配接口:**
- 改为 `POST /api/trials/matches/find`
- 参数组装: disease必填, stage/city/gene_mutation可选

✅ **试验详情:**
- 从 `GET /api/trials` 列表中按id查找
- 不再调用 `/api/trials/:id`（后端未提供）

✅ **报名按钮:**
- 改为提示"后端暂未开放报名接口"
- 不再发送不存在的接口请求

✅ **H5同步:**
- web/src/services/api.ts 已更新

---

## 🎯 接下来需要做的

### 后端待实现:
1. [ ] 病历上传接口 `POST /api/medical/upload`
2. [ ] 解析状态查询 `GET /api/medical/parse-status`
3. [ ] 导入496条真实试验数据
4. [ ] 报名接口 `POST /api/applications`

### 前端待实现:
1. [ ] 上传病历页面（支持1-9张图片）
2. [ ] 解析状态轮询（5秒一次，最多30次）
3. [ ] 缺失字段补齐表单
4. [ ] 匹配结果排序（分数降序）

---

**需要我:**
- A. 生成缺失字段补齐表单的前端代码？
- B. 生成完整的上传病历页面代码？
- C. 生成后端缺失的接口实现？
- D. 其他？