/pages/upload/upload.js

Page({
  data: {
    uploadStatus: '',
    fileId: '',
    fileUrl: ''
  },

  // 选择图片并上传
  chooseAndUpload() {
    const that = this;
    
    // 步骤1: 选择图片
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        console.log('选择的文件:', tempFilePaths[0]);
        
        that.setData({
          uploadStatus: '正在上传...'
        });

        // 步骤2: 上传文件
        wx.uploadFile({
          url: 'http://49.235.162.129:3000/api/medical/upload',
          filePath: tempFilePaths[0],
          name: 'file',  // ⚠️ 必须是 'file'，不能是其他值
          formData: {
            type: 'auto',
            remark: '患者病历'
          },
          timeout: 30000,  // 30秒超时
          success: (uploadRes) => {
            console.log('上传响应:', uploadRes);
            
            if (uploadRes.statusCode === 200) {
              try {
                const data = JSON.parse(uploadRes.data);
                console.log('解析后的数据:', data);
                
                if (data.success) {
                  that.setData({
                    uploadStatus: '上传成功!',
                    fileId: data.fileId,
                    fileUrl: data.url
                  });
                  
                  wx.showToast({
                    title: '上传成功',
                    icon: 'success'
                  });
                  
                  // 这里可以调用解析状态查询
                  that.checkParseStatus(data.fileId);
                } else {
                  that.setData({
                    uploadStatus: '上传失败: ' + data.message
                  });
                  wx.showToast({
                    title: data.message || '上传失败',
                    icon: 'none'
                  });
                }
              } catch (e) {
                console.error('解析响应失败:', e);
                that.setData({
                  uploadStatus: '解析响应失败'
                });
              }
            } else {
              console.error('HTTP错误:', uploadRes.statusCode);
              that.setData({
                uploadStatus: '服务器错误: ' + uploadRes.statusCode
              });
              wx.showToast({
                title: '服务器错误 ' + uploadRes.statusCode,
                icon: 'none'
              });
            }
          },
          fail: (err) => {
            console.error('上传失败:', err);
            that.setData({
              uploadStatus: '上传失败: ' + JSON.stringify(err)
            });
            wx.showToast({
              title: '上传失败，请检查网络',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
      }
    });
  },

  // 查询解析状态
  checkParseStatus(fileId) {
    wx.request({
      url: 'http://49.235.162.129:3000/api/medical/parse-status?fileId=' + fileId,
      method: 'GET',
      success: (res) => {
        console.log('解析状态:', res.data);
        if (res.data.success) {
          this.setData({
            parseStatus: res.data.status,
            parseResult: res.data.result
          });
        }
      }
    });
  }
});
