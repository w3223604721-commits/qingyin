Component({
  properties: {
    showText: { type: Boolean, value: false },
    size: { type: String, value: 'normal' }
  },
  data: {},
  methods: {
    onTapBadge() {
      wx.navigateToMiniProgram({
        appId: '',
        path: '',
        fail: () => {
          wx.setClipboardData({
            data: 'https://github.com/TencentCloudBase/CloudBase-AI-ToolKit',
            success: () => { wx.showToast({ title: '已复制链接', icon: 'success' }) }
          })
        }
      })
    }
  }
})