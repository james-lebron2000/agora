# Treatbot 本地前端开发 + 远程后端 提示词

## 🎯 目标
在本地开发微信小程序前端，调用远程腾讯云后端API（49.235.162.129）

---

## 📁 项目结构

```
treatbot-weapp/          # 你的本地项目目录
├── 📱 前端代码（本地开发）
│   ├── pages/            # 小程序页面
│   ├── utils/api.js      # API配置（关键文件）
│   └── app.js            # 小程序入口
│
└── 🖥️  后端服务（已部署在云端）
    └── 49.235.162.129:3000  # 远程API服务器
```

---

## ⚙️ 第一步：配置API地址

修改文件：`utils/api.js`（或 `app.js`）

```javascript
// ==========================================
// API 配置 - 连接远程服务器
// ==========================================

const API_BASE = 'http://49.235.162.129:3000';  // 远程服务器地址

// API 端点列表
const API = {
  // 健康检查
  health: `${API_BASE}/health`,
  
  // 用户相关
  login: `${API_BASE}/api/auth/login`,
  userInfo: `${API_BASE}/api/user/info`,
  
  // 病历上传
  upload: `${API_BASE}/api/upload`,
  
  // 试验搜索
  search: `${API_BASE}/api/trials/search`,
  
  // 匹配结果
  matches: `${API_BASE}/api/matches`,
  
  // 历史记录
  records: `${API_BASE}/api/records`,
};

module.exports = { API_BASE, API };
```

---

## 🚀 第二步：开发工具设置

### 微信开发者工具配置：

1. **打开项目**
   - 导入 `~/treatbot-weapp` 目录
   - AppID: `wx1c8feab29d0cf3aa`

2. **关闭域名校验**
   - 右上角 "详情" → "本地设置"
   - ✅ 勾选 "不校验合法域名、web-view..."

3. **开启调试**
   - 点击 "Console" 面板查看API请求

---

## 💡 第三步：开发流程

### 1. 测试连接

```javascript
// 在任意页面的 onLoad 中测试
Page({
  onLoad() {
    wx.request({
      url: 'http://49.235.162.129:3000/health',
      success: (res) => {
        console.log('✅ 服务器连接成功:', res.data);
        // 输出: {status: "ok", version: "1.0.0", ...}
      },
      fail: (err) => {
        console.error('❌ 连接失败:', err);
      }
    });
  }
});
```

### 2. 封装API请求

```javascript
// utils/request.js
const API_BASE = 'http://49.235.162.129:3000';

const request = (options) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else {
          reject(res);
        }
      },
      fail: reject
    });
  });
};

module.exports = { request };
```

### 3. 页面开发示例

```javascript
// pages/search/search.js
const { request } = require('../../utils/request');

Page({
  data: {
    trials: [],
    loading: false
  },

  // 搜索临床试验
  async searchTrials(e) {
    const keyword = e.detail.value;
    
    this.setData({ loading: true });
    
    try {
      const result = await request({
        url: '/api/trials/search',
        method: 'POST',
        data: { keyword }
      });
      
      this.setData({
        trials: result.data,
        loading: false
      });
      
    } catch (err) {
      console.error('搜索失败:', err);
      wx.showToast({ title: '搜索失败', icon: 'none' });
      this.setData({ loading: false });
    }
  }
});
```

---

## 🔧 第四步：调试技巧

### 查看网络请求：
1. 开发者工具 → "Network" 面板
2. 查看所有API请求和响应

### 真机调试：
1. 点击 "真机调试"
2. 扫码在手机上运行
3. 手机端查看请求日志

### 错误排查：
```javascript
// 添加全局错误处理
wx.onError((err) => {
  console.error('全局错误:', err);
});

// API请求统一错误处理
const handleError = (err) => {
  if (err.statusCode === 500) {
    wx.showToast({ title: '服务器错误', icon: 'none' });
  } else if (err.statusCode === 404) {
    wx.showToast({ title: '接口不存在', icon: 'none' });
  } else {
    wx.showToast({ title: '网络错误', icon: 'none' });
  }
};
```

---

## 📋 开发检查清单

- [ ] 微信开发者工具已安装
- [ ] 项目已导入（AppID: wx1c8feab29d0cf3aa）
- [ ] "不校验合法域名" 已勾选
- [ ] API_BASE 已改为 49.235.162.129:3000
- [ ] 健康检查接口测试通过
- [ ] 能正常调用后端API
- [ ] 页面功能开发中...

---

## 🎨 开始开发！

1. 打开微信开发者工具
2. 导入 `~/treatbot-weapp`
3. 修改 `utils/api.js` 中的 API_BASE
4. 运行测试连接
5. 开始开发页面功能

**后端API已就绪，前端任你发挥！** 🚀
