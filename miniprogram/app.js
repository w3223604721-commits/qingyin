// 轻印旅行记忆 v2.0 - 小程序版 (支持云登录)
App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库')
      return
    }
    wx.cloud.init({
      env: 'ai-native-d5gv1bzqle900971e',
      traceUser: true,
    })
    
    this.globalData.user = null
    this._loginChecked = false
    this.checkLoginStatus()
  },

  // ====== 登录拦截 ======
  // 检查是否需要登录，每个tabbar页面的onShow应调用此方法
  requireLogin() {
    const loginInfo = wx.getStorageSync('qingyin_login_info')
    if (loginInfo && loginInfo.openid) {
      const now = Date.now()
      if (now - loginInfo.loginTime < 30 * 24 * 60 * 60 * 1000) {
        this.globalData.user = {
          openid: loginInfo.openid,
          phone: loginInfo.phone || '',
          nickName: loginInfo.nickName || '旅行者',
          avatarUrl: loginInfo.avatarUrl || ''
        }
        this.loadData()
        return true
      }
    }
    this.globalData.user = null
    this.loadLocalData()
    return false
  },

  // ====== 用户登录系统 ======
  // 检查本地是否有有效的登录态（30天免登）
  checkLoginStatus() {
    const loginInfo = wx.getStorageSync('qingyin_login_info')
    // 兼容旧key
    if (!loginInfo) {
      const legacyInfo = wx.getStorageSync('mapory_login_info')
      if (legacyInfo) {
        wx.setStorageSync('qingyin_login_info', legacyInfo)
        return this._handleLoginInfo(legacyInfo)
      }
    }
    return this._handleLoginInfo(loginInfo)
  },

  _handleLoginInfo(loginInfo) {
    if (loginInfo && loginInfo.openid) {
      const now = Date.now()
      if (now - loginInfo.loginTime < 30 * 24 * 60 * 60 * 1000) {
        this.globalData.user = {
          openid: loginInfo.openid,
          phone: loginInfo.phone || '',
          nickName: loginInfo.nickName || '旅行者',
          avatarUrl: loginInfo.avatarUrl || ''
        }
        this.loadData()
        return
      }
    }
    // 需要重新登录
    this.globalData.user = null
    this.loadLocalData()
  },

  // 微信静默登录（获取openid，不弹授权）
  silentLogin(callback) {
    const that = this
    wx.cloud.callFunction({
      name: 'maporyAuth',
      data: { action: 'login' },
      success(res) {
        const result = res.result || {}
        if (!result.openid) {
          callback && callback(false, '登录失败')
          return
        }

        const user = {
          openid: result.openid,
          phone: result.phone || '',
          nickName: result.nickName || '旅行者',
          avatarUrl: result.avatarUrl || ''
        }

        that.globalData.user = user

        // 保存登录信息（30天免登）
        wx.setStorageSync('qingyin_login_info', {
          openid: result.openid,
          phone: result.phone || '',
          nickName: result.nickName || '旅行者',
          avatarUrl: result.avatarUrl || '',
          loginTime: Date.now(),
          loginDate: new Date().toISOString()
        })

        // 同步云端数据到本地
        if (result.appData) {
          that.globalData.appData = result.appData
          if (result.medals) that.globalData.provinceMedals = result.medals
        } else {
          that.loadLocalData()
        }

        callback && callback(true, user)
      },
      fail(err) {
        console.error('Login fail:', err)
        callback && callback(false, err.errMsg || '网络错误')
      }
    })
  },

  // 绑定手机号（需要用户点击按钮触发）
  bindPhone(e, callback) {
    if (!this.globalData.user) return

    const cloudID = e.detail.cloudID
    if (!cloudID) {
      callback && callback(false, '获取手机号失败')
      return
    }

    const that = this
    wx.cloud.callFunction({
      name: 'maporyAuth',
      data: { action: 'bindPhone', openid: that.globalData.user.openid, phoneCloudID: cloudID },
      success(res) {
        const result = res.result || {}
        if (result.phone) {
          that.globalData.user.phone = result.phone
          // 更新本地存储
          const info = wx.getStorageSync('qingyin_login_info') || {}
          info.phone = result.phone
          wx.setStorageSync('qingyin_login_info', info)
          callback && callback(true, result.phone)
        } else {
          callback && callback(false, result.error || '绑定失败')
        }
      },
      fail(err) {
        callback && callback(false, err.errMsg || '网络错误')
      }
    })
  },

  // 检查是否已登录
  isLoggedIn() {
    return !!this.globalData.user
  },

  // ====== 云端数据同步 ======
  saveData(data) {
    if (data) {
      this.globalData.appData = data
    }
    // 使用异步延迟写入，避免阻塞 UI 线程
    const appData = this.globalData.appData
    wx.nextTick(() => {
      try {
        wx.setStorageSync('qingyin_data', JSON.stringify(appData))
      } catch (e) {
        console.error('Storage write failed:', e)
        // 存储空间不足时，尝试清理旧数据
        this._handleStorageError(e)
      }
    })
    // 延迟云同步，避免阻塞
    this._pendingSync = true
    if (!this._syncTimer) {
      this._syncTimer = setTimeout(() => {
        this._pendingSync = false
        this._syncTimer = null
        this.syncToCloud()
      }, 500)
    }
  },

  syncToCloud() {
    if (!this.globalData.user?.openid) return
    wx.cloud.callFunction({
      name: 'maporyAuth',
      data: {
        action: 'syncData',
        openid: this.globalData.user.openid,
        appData: this.globalData.appData,
        medals: this.globalData.provinceMedals
      },
      fail(err) {
        console.warn('Sync to cloud failed:', err)
      }
    })
  },

  // 处理存储空间不足
  _handleStorageError(err) {
    console.warn('Storage capacity issue, attempting cleanup')
    try {
      // 清除不必要的大数据
      const data = this.globalData.appData
      if (data && data.journeys) {
        // 压缩旅程数据：清除临时文件路径（这些路径已失效）
        let cleaned = false
        data.journeys.forEach(j => {
          if (j.coverPhoto && j.coverPhoto.startsWith('http://tmp/')) {
            j.coverPhoto = ''
            cleaned = true
          }
          if (j.days) {
            j.days.forEach(d => {
              if (d.photos && d.photos.length > 10) {
                d.photos = d.photos.slice(0, 10)
                cleaned = true
              }
            })
          }
        })
        if (cleaned) {
          wx.setStorageSync('qingyin_data', JSON.stringify(data))
          wx.showToast({ title: '已自动清理临时数据', icon: 'none' })
        }
      }
    } catch (e2) {
      console.error('Cleanup failed:', e2)
    }
  },

  loadFromCloud(callback) {
    if (!this.globalData.user?.openid) {
      callback && callback(false)
      return
    }
    const that = this
    wx.cloud.callFunction({
      name: 'maporyAuth',
      data: { action: 'loadData', openid: that.globalData.user.openid },
      success(res) {
        const result = res.result || {}
        if (result.appData) that.globalData.appData = result.appData
        if (result.medals) that.globalData.provinceMedals = result.medals
        callback && callback(true)
      },
      fail(err) {
        console.warn('Load from cloud failed:', err)
        that.loadLocalData()
        callback && callback(false)
      }
    })
  },

  // 本地数据管理（降级方案）
  loadLocalData() {
    try {
      const raw = wx.getStorageSync('qingyin_data')
      if (raw) this.globalData.appData = JSON.parse(raw)
    } catch (e) { /* use default */ }
    try {
      const m = wx.getStorageSync('qingyin_medals')
      if (m) this.globalData.provinceMedals = JSON.parse(m)
    } catch (e) { /* use default */ }
  },

  loadData() {
    // 优先从云端加载
    this.loadFromCloud((ok) => {
      if (!ok) this.loadLocalData()
    })
  },

  saveMedals() {
    wx.setStorageSync('qingyin_medals', JSON.stringify(this.globalData.provinceMedals))
    // 同步到云端
    if (this.globalData.user?.openid) {
      wx.cloud.callFunction({
        name: 'maporyAuth',
        data: { action: 'syncMedals', openid: this.globalData.user.openid, medals: this.globalData.provinceMedals },
        fail() { /* ignore */ }
      })
    }
  },

  // ====== 工具函数 ======
  generateId(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
  },

  formatDate(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  },

  formatDateCN(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  },

  formatDateRange(start, end) {
    if (!start) return ''
    const s = this.formatDateCN(start)
    if (!end || start === end) return s
    return `${s} - ${this.formatDateCN(end)}`
  },

  formatTime(dateStr) {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  },

  getCityCoords(province, city) {
    const map = {
      '北京市': [39.9042, 116.4074], '上海市': [31.2304, 121.4737],
      '广州市': [23.1291, 113.2644], '深圳市': [22.5431, 114.0579],
      '杭州市': [30.2741, 120.1551], '南京市': [32.0603, 118.7969],
      '成都市': [30.5728, 104.0668], '武汉市': [30.5928, 114.3055],
      '重庆市': [29.4316, 106.9123], '西安市': [34.3416, 108.9398],
      '长沙市': [28.2282, 112.9388], '苏州市': [31.2990, 120.5853],
      '天津市': [39.3434, 117.3616], '厦门市': [24.4798, 118.0894],
      '青岛市': [36.0671, 120.3826], '大连市': [38.9140, 121.6147],
      '昆明市': [25.0389, 102.7183], '三亚市': [18.2528, 109.5120],
      '拉萨市': [29.6500, 91.1000], '哈尔滨市': [45.8038, 126.5350],
      '桂林市': [25.2736, 110.2900], '丽江': [26.8721, 100.2299],
      '大理': [25.5894, 100.2258], '张家界': [29.1170, 110.4780],
      '贵阳': [26.6470, 106.6302], '南宁': [22.8170, 108.3665],
      '郑州': [34.7466, 113.6253], '济南': [36.6512, 116.9972],
      '合肥': [31.8206, 117.2272], '南昌': [28.6820, 115.8579],
      '福州': [26.0745, 119.2965], '沈阳': [41.8057, 123.4315],
      '长春': [43.8171, 125.3235], '海口': [20.0440, 110.1999],
      '乌鲁木齐': [43.8256, 87.6168], '呼和浩特': [40.8424, 111.7490],
      '兰州': [36.0611, 103.8343], '西宁': [36.6171, 101.7782],
      '银川': [38.4872, 106.2309], '太原': [37.8706, 112.5489],
      '石家庄': [38.0428, 114.5149]
    }
    const key = city || province
    for (const k of Object.keys(map)) {
      if (k.includes(key) || (key && k.includes(k))) return map[k]
    }
    const provCoords = {
      '北京': [39.9, 116.4], '上海': [31.2, 121.5], '广东': [23.1, 113.3],
      '浙江': [30.3, 120.2], '江苏': [32.1, 118.8], '四川': [30.6, 104.1],
      '湖北': [30.6, 114.3], '重庆': [29.6, 106.5], '陕西': [34.3, 108.9],
      '湖南': [28.2, 112.9], '福建': [26.1, 119.3], '山东': [36.7, 117.0],
      '辽宁': [41.8, 123.4], '云南': [25.0, 102.7], '海南': [20.0, 110.3],
      '西藏': [29.7, 91.1], '黑龙江': [45.8, 126.5], '广西': [22.8, 108.4],
      '贵州': [26.6, 106.7], '河南': [34.8, 113.6], '安徽': [31.8, 117.2],
      '江西': [28.7, 115.9], '吉林': [43.8, 125.3], '新疆': [43.8, 87.6],
      '内蒙古': [40.8, 111.8], '甘肃': [36.1, 103.8], '青海': [36.6, 101.8],
      '宁夏': [38.5, 106.2], '山西': [37.9, 112.5], '河北': [38.0, 114.5],
      '天津': [39.3, 117.4], '香港': [22.3, 114.2], '澳门': [22.2, 113.5],
      '台湾': [25.0, 121.5]
    }
    if (province) {
      for (const k of Object.keys(provCoords)) {
        if (province.includes(k) || k.includes(province)) return provCoords[k]
      }
    }
    return [35 + Math.random() * 5, 105 + Math.random() * 10]
  },

  // 显示隐私协议弹窗
  showPrivacyAgreement() {
    const agreed = wx.getStorageSync('qingyin_privacy_agreed')
    if (agreed) return false
    return true
  },

  agreePrivacy() {
    wx.setStorageSync('qingyin_privacy_agreed', true)
  },

  // ====== 全局数据 ======
  globalData: {
    user: null,
    appData: {
      journeys: [],
      checkins: [],
      footprintTracks: [],
      profile: { name: '旅行者', bio: '探索世界，记录美好', avatar: '' },
      trash: [],
      carouselIndex: {}
    },
    provinceMedals: [
      { code: 'beijing', name: '北京市', icon: '🏛️', building: '天安门', lit: false },
      { code: 'shanghai', name: '上海市', icon: '🌃', building: '东方明珠', lit: false },
      { code: 'tianjin', name: '天津市', icon: '🎡', building: '天津之眼', lit: false },
      { code: 'chongqing', name: '重庆市', icon: '🌉', building: '洪崖洞', lit: false },
      { code: 'hebei', name: '河北省', icon: '🏯', building: '避暑山庄', lit: false },
      { code: 'shanxi', name: '山西省', icon: '🏔️', building: '云冈石窟', lit: false },
      { code: 'liaoning', name: '辽宁省', icon: '🏭', building: '沈阳故宫', lit: false },
      { code: 'jilin', name: '吉林省', icon: '❄️', building: '长白山', lit: false },
      { code: 'heilongjiang', name: '黑龙江省', icon: '🧊', building: '冰雪大世界', lit: false },
      { code: 'jiangsu', name: '江苏省', icon: '🏞️', building: '苏州园林', lit: false },
      { code: 'zhejiang', name: '浙江省', icon: '🛶', building: '西湖', lit: false },
      { code: 'anhui', name: '安徽省', icon: '⛰️', building: '黄山', lit: false },
      { code: 'fujian', name: '福建省', icon: '🏠', building: '土楼', lit: false },
      { code: 'jiangxi', name: '江西省', icon: '🏺', building: '景德镇', lit: false },
      { code: 'shandong', name: '山东省', icon: '⛲', building: '泰山', lit: false },
      { code: 'henan', name: '河南省', icon: '🛕', building: '少林寺', lit: false },
      { code: 'hubei', name: '湖北省', icon: '🏗️', building: '黄鹤楼', lit: false },
      { code: 'hunan', name: '湖南省', icon: '🏞️', building: '张家界', lit: false },
      { code: 'guangdong', name: '广东省', icon: '🏙️', building: '广州塔', lit: false },
      { code: 'guangxi', name: '广西壮族自治区', icon: '🏔️', building: '桂林山水', lit: false },
      { code: 'hainan', name: '海南省', icon: '🌴', building: '三亚海滩', lit: false },
      { code: 'sichuan', name: '四川省', icon: '🐼', building: '九寨沟', lit: false },
      { code: 'guizhou', name: '贵州省', icon: '🌄', building: '黄果树瀑布', lit: false },
      { code: 'yunnan', name: '云南省', icon: '🦚', building: '丽江古城', lit: false },
      { code: 'xizang', name: '西藏自治区', icon: '🏔️', building: '布达拉宫', lit: false },
      { code: 'shaanxi', name: '陕西省', icon: '🗿', building: '兵马俑', lit: false },
      { code: 'gansu', name: '甘肃省', icon: '🐫', building: '莫高窟', lit: false },
      { code: 'qinghai', name: '青海省', icon: '💧', building: '青海湖', lit: false },
      { code: 'ningxia', name: '宁夏回族自治区', icon: '🕌', building: '沙坡头', lit: false },
      { code: 'xinjiang', name: '新疆维吾尔自治区', icon: '🍇', building: '天山天池', lit: false },
      { code: 'neimenggu', name: '内蒙古自治区', icon: '🐴', building: '呼伦贝尔草原', lit: false },
      { code: 'xianggang', name: '香港特别行政区', icon: '🏙️', building: '维多利亚港', lit: false },
      { code: 'aomen', name: '澳门特别行政区', icon: '🎰', building: '大三巴', lit: false },
      { code: 'taiwan', name: '台湾省', icon: '🏯', building: '台北101', lit: false }
    ]
  }
})
