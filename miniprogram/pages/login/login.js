const app = getApp()

Page({
  data: {
    loggingIn: false,
    agreePrivacy: false,
    inputAccount: '',
    inputPassword: '',
    showPassword: false,
    showPhoneModal: false,
    inputPhone: '',
    inputCode: '',
    codeSending: false,
    countdown: 0
  },

  _timer: null,

  onLoad() {
    // 检查是否已登录
    const info = wx.getStorageSync('qingyin_login_info')
    if (info && info.openid) {
      wx.switchTab({ url: '/pages/journal/journal', fail() {} })
      return
    }
    // 恢复协议状态
    if (wx.getStorageSync('qingyin_privacy_agreed')) {
      this.setData({ agreePrivacy: true })
    }
  },

  onUnload() {
    if (this._timer) clearInterval(this._timer)
  },

  /* ─── 输入处理 ─── */
  onAccountInput(e) { this.setData({ inputAccount: e.detail.value }) },
  onPasswordInput(e) { this.setData({ inputPassword: e.detail.value }) },
  togglePassword() { this.setData({ showPassword: !this.data.showPassword }) },

  /* ─── 微信一键登录（主推） ─── */
  onWechatLogin() {
    if (!this._checkAgree()) return
    this._doLogin()
  },

  /* ─── 表单登录 ─── */
  handleLogin() {
    if (!this._checkAgree()) return
    const account = this.data.inputAccount.trim()
    if (/^1\d{10}$/.test(account)) {
      this.setData({ inputPhone: account, showPhoneModal: true })
      return
    }
    this._doLogin()
  },

  /* ─── 核心登录流程 ─── */
  _doLogin() {
    this.setData({ loggingIn: true })
    app.silentLogin((ok, result) => {
      this.setData({ loggingIn: false })
      if (ok) {
        app.agreePrivacy()
        wx.showToast({ title: '欢迎回来！', icon: 'success' })
        setTimeout(() => {
          wx.switchTab({ url: '/pages/journal/journal' })
        }, 600)
        return
      }
      // 登录失败提示（截断过长信息）
      let msg = typeof result === 'string' ? result : '网络连接失败'
      if (msg.length > 60) msg = msg.slice(0, 55) + '...'
      wx.showModal({ title: '登录失败', content: msg, showCancel: false })
    })
  },

  _checkAgree() {
    if (!this.data.agreePrivacy) {
      wx.showToast({ title: '请先同意协议和隐私政策', icon: 'none' })
      return false
    }
    return true
  },

  /* ─── 协议 ─── */
  toggleAgreement() { this.setData({ agreePrivacy: !this.data.agreePrivacy }) },

  openUserAgreement() {
    wx.showModal({
      title: '用户服务协议',
      content: '欢迎使用轻印旅行记忆应用。\n\n本应用为旅行记录工具。使用微信即可快速登录。\n\n使用本服务即表示您同意：\n1. 您对上传的内容负责\n2. 请勿上传违法违规内容\n3. 我们保护您的个人数据安全',
      confirmText: '我知道了',
      showCancel: false
    })
  },

  openPrivacyPolicy() {
    wx.showModal({
      title: '隐私政策',
      content: '我们收集的信息：\n• 微信OpenID（用于身份识别）\n• 手机号（可选）\n• 您创建的旅行记录\n\n数据存储在腾讯云数据库，加密传输。\n\n我们不会将您的信息出售给第三方。',
      confirmText: '我知道了',
      showCancel: false
    })
  },

  showRegisterTips() {
    wx.showToast({ title: '使用微信或手机号快速登录', icon: 'none' })
  },

  /* ─── 手机号弹窗 ─── */
  showPhoneInput() { this.setData({ showPhoneModal: true }) },
  closePhoneModal() { this.setData({ showPhoneModal: false }) },
  onPhoneInput(e) { this.setData({ inputPhone: e.detail.value }) },
  onCodeInput(e) { this.setData({ inputCode: e.detail.value }) },

  sendCode() {
    const phone = this.data.inputPhone
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '请输入正确的手机号', icon: 'none' }); return
    }
    if (this.data.codeSending) return
    this.setData({ codeSending: true, countdown: 60 })
    this._timer = setInterval(() => {
      const cd = this.data.countdown - 1
      if (cd <= 0) {
        clearInterval(this._timer)
        this.setData({ codeSending: false, countdown: 0 })
      } else {
        this.setData({ countdown: cd })
      }
    }, 1000)
    wx.showToast({ title: '验证码已发送（模拟）', icon: 'success' })
  },

  submitPhoneLogin() {
    const { inputPhone, inputCode } = this.data
    if (!inputPhone || inputCode.length < 4) {
      wx.showToast({ title: '请填写完整信息', icon: 'none' }); return
    }
    this.setData({ showPhoneModal: false, loggingIn: true })
    const that = this
    app.silentLogin((success) => {
      that.setData({ loggingIn: false })
      if (success) {
        app.agreePrivacy()
        wx.showToast({ title: '登录成功！', icon: 'success' })
        setTimeout(() => wx.switchTab({ url: '/pages/journal/journal' }), 600)
      } else {
        wx.showToast({ title: '登录失败', icon: 'error' })
      }
    })
  },

  noop() {}
})
