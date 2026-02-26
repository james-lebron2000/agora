# Treatbot 前后端衔接指南

## 🌐 后端API地址

```
Base URL: http://49.235.162.129:3000
```

---

## 🔌 可用API端点

### 1. 健康检查
```http
GET http://49.235.162.129:3000/health
```

**响应：**
```json
{
  "status": "ok",
  "timestamp": "2026-02-26T...",
  "version": "1.0.0"
}
```

---

### 2. 获取所有试验
```http
GET http://49.235.162.129:3000/api/trials
```

**小程序调用：**
```javascript
wx.request({
  url: 'http://49.235.162.129:3000/api/trials',
  method: 'GET',
  success: (res) => {
    console.log('试验列表:', res.data.trials);
  }
});
```

**响应：**
```json
{
  "success": true,
  "total": 4,
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

### 3. 匹配试验（核心功能）⭐

```http
POST http://49.235.162.129:3000/api/trials/matches/find
Content-Type: application/json
```

**请求参数：**

| 字段 | 类型 | 必填 | 示例 |
|------|------|------|------|
| disease | string | ✅ | "肺癌"、"乳腺癌" |
| stage | string | ❌ | "III期"、"晚期" |
| city | string | ❌ | "上海"、"北京" |
| gene_mutation | string | ❌ | "EGFR突变" |

**小程序调用：**

```javascript
// utils/api.js
const API_BASE = 'http://49.235.162.129:3000';

// 匹配试验
function findMatchingTrials(patientInfo) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${API_BASE}/api/trials/matches/find`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        disease: patientInfo.disease,    // 必填
        stage: patientInfo.stage,        // 可选
        city: patientInfo.city,          // 可选
        gene_mutation: patientInfo.gene  // 可选
      },
      success: (res) => {
        if (res.data.success) {
          resolve(res.data.matches);
        } else {
          reject(res.data.message);
        }
      },
      fail: reject
    });
  });
}

module.exports = { API_BASE, findMatchingTrials };
```

**请求示例：**
```json
{
  "disease": "非小细胞肺癌",
  "stage": "III期",
  "city": "上海"
}
```

**响应：**
```json
{
  "success": true,
  "total": 4,
  "patientInfo": {
    "disease": "非小细胞肺癌",
    "stage": "III期",
    "city": "上海"
  },
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
      "matchScore": 85,
      "matchReasons": [
        "疾病类型匹配",
        "疾病分期匹配",
        "同城有研究中心",
        "正在招募患者"
      ],
      "matchLevel": "高度匹配"
    }
  ]
}
```

---

## 🧠 匹配算法规则

| 匹配维度 | 权重 | 说明 |
|----------|------|------|
| 疾病匹配 | 40分 | 精确匹配疾病类型 |
| 分期匹配 | 20分 | 匹配疾病分期 |
| 地理位置 | 20分 | 同城/同省有研究中心 |
| 招募状态 | 10分 | 是否正在招募 |
| 基因突变 | 10分 | 靶向治疗匹配 |

**匹配等级：**
- ≥80分：高度匹配 ⭐⭐⭐
- ≥60分：中度匹配 ⭐⭐
- ≥40分：低度匹配 ⭐
- <40分：不匹配

---

## 📱 完整页面示例

### 1. 搜索页面 (pages/search/search.js)

```javascript
const { findMatchingTrials } = require('../../utils/api.js');

Page({
  data: {
    disease: '',
    stage: '',
    city: '',
    matches: [],
    loading: false
  },

  // 输入疾病
  onDiseaseInput(e) {
    this.setData({ disease: e.detail.value });
  },

  // 输入分期
  onStageInput(e) {
    this.setData({ stage: e.detail.value });
  },

  // 输入城市
  onCityInput(e) {
    this.setData({ city: e.detail.value });
  },

  // 搜索匹配
  async onSearch() {
    const { disease, stage, city } = this.data;
    
    if (!disease) {
      wx.showToast({ title: '请输入疾病类型', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const matches = await findMatchingTrials({
        disease,
        stage,
        city
      });

      this.setData({
        matches: matches,
        loading: false
      });

      if (matches.length === 0) {
        wx.showToast({ title: '未找到匹配的试验', icon: 'none' });
      }

    } catch (error) {
      console.error('匹配失败:', error);
      wx.showToast({ title: '请求失败，请重试', icon: 'none' });
      this.setData({ loading: false });
    }
  }
});
```

### 2. 页面模板 (pages/search/search.wxml)

```xml
<view class="container">
  <!-- 搜索表单 -->
  <view class="search-form">
    <view class="form-item">
      <text class="label">疾病类型 *</text>
      <input 
        placeholder="如：肺癌、乳腺癌" 
        value="{{disease}}"
        bindinput="onDiseaseInput"
      />
    </view>
    
    <view class="form-item">
      <text class="label">疾病分期</text>
      <input 
        placeholder="如：III期、晚期" 
        value="{{stage}}"
        bindinput="onStageInput"
      />
    </view>
    
    <view class="form-item">
      <text class="label">所在城市</text>
      <input 
        placeholder="如：上海、北京" 
        value="{{city}}"
        bindinput="onCityInput"
      />
    </view>
    
    <button type="primary" bindtap="onSearch" loading="{{loading}}">
      搜索匹配试验
    </button>
  </view>

  <!-- 匹配结果 -->
  <view class="results" wx:if="{{matches.length > 0}}">
    <view class="section-title">找到 {{matches.length}} 个匹配试验</view>
    
    <view class="result-item" wx:for="{{matches}}" wx:key="trial.id">
      <view class="trial-header">
        <text class="trial-title">{{item.trial.title}}</text>
        <view class="match-badge {{item.matchScore >= 80 ? 'high' : item.matchScore >= 60 ? 'medium' : 'low'}}">
          {{item.matchLevel}} {{item.matchScore}}分
        </view>
      </view>
      
      <view class="trial-info">
        <text class="info-item">📋 {{item.trial.indication}}</text>
        <text class="info-item">🔬 {{item.trial.phase}}</text>
        <text class="info-item">📍 {{item.trial.location}}</text>
        <text class="info-item">🏢 {{item.trial.sponsor}}</text>
      </view>
      
      <view class="match-reasons">
        <text wx:for="{{item.matchReasons}}" wx:key="*this" class="reason-tag">
          {{item}}
        </text>
      </view>
      
      <button size="mini" type="default">查看详情</button>
    </view>
  </view>
  
  <!-- 无结果 -->
  <view class="no-results" wx:if="{{matches.length === 0 && !loading}}">
    <text>暂无匹配的临床试验</text>
    <text class="tips">建议：尝试使用更通用的疾病名称，或扩大搜索范围</text>
  </view>
</view>
```

### 3. 页面样式 (pages/search/search.wxss)

```css
.container {
  padding: 20rpx;
}

.search-form {
  background: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 30rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 10rpx;
}

input {
  border: 1rpx solid #ddd;
  padding: 20rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.result-item {
  background: #fff;
  padding: 30rpx;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
}

.trial-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20rpx;
}

.trial-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  flex: 1;
}

.match-badge {
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #fff;
}

.match-badge.high {
  background: #52c41a;
}

.match-badge.medium {
  background: #faad14;
}

.match-badge.low {
  background: #f5222d;
}

.trial-info {
  margin-bottom: 20rpx;
}

.info-item {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.match-reasons {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-bottom: 20rpx;
}

.reason-tag {
  background: #e6f7ff;
  color: #1890ff;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
}
```

---

## ⚠️ 开发注意事项

1. **微信开发者工具设置**
   - 右上角 "详情" → "本地设置"
   - ✅ 勾选"不校验合法域名、web-view..."

2. **必须使用IP地址**
   - 开发阶段：使用 `http://49.235.162.129:3000`
   - 不能直接用域名（需要备案）

3. **上线前准备**
   - 申请ICP备案
   - 配置HTTPS证书
   - 在微信小程序后台配置服务器域名

---

## 📞 测试接口

```bash
# 测试健康检查
curl http://49.235.162.129:3000/health

# 测试获取试验列表
curl http://49.235.162.129:3000/api/trials

# 测试匹配功能
curl -X POST http://49.235.162.129:3000/api/trials/matches/find \
  -H "Content-Type: application/json" \
  -d '{"disease":"肺癌","city":"上海"}'
```

---

**现在可以开始开发小程序了！** 🚀
