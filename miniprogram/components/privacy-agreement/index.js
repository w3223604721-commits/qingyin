Component({
  properties: { show: { type: Boolean, value: false } },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close') },
    onDisagree() { wx.showToast({ title: '需要同意协议才能使用', icon: 'none' }) },
    onAgree() {
      const app = getApp()
      app.agreePrivacy()
      this.triggerEvent('agree')
      this.triggerEvent('close')
    }
  }
})