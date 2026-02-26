# 上传API故障排查指南

## ✅ 后端状态确认

根据服务器日志，后端上传API是**正常的**：
```bash
curl -F "file=@/etc/hostname" http://localhost:3000/api/medical/upload
# 返回: {"success":true,"fileId":"medical-..."}
```

---

## 🔍 前端常见问题排查

### 问题1: 字段名错误
**错误代码:**
```javascript
wx.uploadFile({
  url: 'http://49.235.162.129:3000/api/medical/upload',
  filePath: tempFilePath,
  name: 'image',  // ❌ 错误！必须是 'file'
  ...
})
```

**正确代码:**
```javascript
wx.uploadFile({
  url: 'http://49.235.162.129:3000/api/medical/upload',
  filePath: tempFilePath,
  name: 'file',   // ✅ 正确！必须是 'file'
  ...
})
```

---

### 问题2: 未勾选不校验域名
**必须设置:**
1. 微信开发者工具 → 详情 → 本地设置
2. ✅ **勾选"不校验合法域名..."**

---

### 问题3: 文件路径错误
**完整正确代码:**
```javascript
wx.chooseImage({
  count: 1,
  success: (res) => {
    const tempFilePath = res.tempFilePaths[0];  // 获取临时文件路径
    
    wx.uploadFile({
      url: 'http://49.235.162.129:3000/api/medical/upload',
      filePath: tempFilePath,     // ✅ 使用临时文件路径
      name: 'file',               // ✅ 字段名必须是 'file'
      formData: {
        type: 'auto'              // 可选参数
      },
      success: (uploadRes) => {
        const data = JSON.parse(uploadRes.data);
        console.log('上传成功:', data);
        console.log('fileId:', data.fileId);
        console.log('url:', data.url);
      },
      fail: (err) => {
        console.error('上传失败:', err);
      }
    });
  }
})
```

---

## 🧪 测试方法

### 方法1: 在服务器上测试（已确认正常）
```bash
ssh ubuntu@49.235.162.129
curl -F "file=@/etc/hostname" http://localhost:3000/api/medical/upload
```

### 方法2: 使用小程序调试器
```javascript
// 在小程序控制台直接测试
wx.uploadFile({
  url: 'http://49.235.162.129:3000/api/medical/upload',
  filePath: '/tmp/test.jpg',  // 使用本地测试文件
  name: 'file',
  success: console.log,
  fail: console.error
})
```

---

## 📋 请提供以下信息以便排查

1. **前端代码**: 你的 `wx.uploadFile` 完整代码
2. **错误信息**: 控制台输出的错误详情
3. **调试日志**: 开发者工具Network面板截图
4. **配置确认**: 是否已勾选"不校验合法域名"

---

## ✅ 已确认正常

- 后端API: ✅ 正常
- 服务器测试: ✅ 成功
- 上传目录: ✅ 已创建
- 依赖安装: ✅ multer已安装

**后端没有问题，请检查前端代码！** 🚀
