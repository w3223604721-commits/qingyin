const app = getApp()

Page({
  data: {
    mapCenter: { lat: 35.86, lng: 104.19 },
    mapScale: 4,
    markers: [],
    polylines: [],
    routeCircles: [],
    activeTab: 'timeline',
    totalCheckins: 0,
    visitedCities: [],
    visitedProvinces: [],
    provinceLitCount: 0,
    medalTotalCount: 34,
    cityStats: [],
    provinceStats: [],
    trackCount: 0,
    displayCheckins: [],
    flightSegments: [],

    // 面板交互
    showDetail: false,

    // 轨迹播放
    isPlaying: false,
    playProgress: 0,
    routeStartLabel: '',
    routeEndLabel: '',

    // 回忆模式 - 日期范围
    showDatePicker: false,
    dateStart: '',
    dateEnd: '',
    dateStartDisplay: '',
    dateEndDisplay: '',
    memoryCheckins: [],  // 日期范围内的打卡点
    memoryActive: false,  // 是否启用回忆模式

    _playTimer: null,
    _currentPlayIndex: 0
  },

  onShow() {
    if (!app.requireLogin()) {
      wx.navigateBack()
      return
    }
    this.loadData()
  },

  loadData() {
    const data = app.globalData.appData
    const checkins = (data.checkins || []).map(c => ({
      ...c,
      createdAtCN: c.createdAt ? app.formatDateCN(c.createdAt) : ''
    }))

    // 按时间排序
    checkins.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    // 统计城市和省份
    const cityMap = {}
    const provinceMap = {}

    checkins.forEach(c => {
      if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1
      if (c.province) provinceMap[c.province] = (provinceMap[c.province] || 0) + 1
    })

    // 城市统计排序
    const cityStats = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count, pct: 100 }))
      .sort((a, b) => b.count - a.count)
    const maxCityCount = Math.max(1, ...cityStats.map(s => s.count))
    cityStats.forEach(s => { s.pct = Math.round(s.count / maxCityCount * 100) })

    // 省份统计（结合勋章）
    const medals = app.globalData.provinceMedals || []
    const shortProvince = (s) => (s || '').replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, '')
    const provinceStats = Object.entries(provinceMap).map(([name, count]) => {
      const sn = shortProvince(name)
      const medal = medals.find(m =>
        name.includes(shortProvince(m.name)) ||
        m.name.includes(sn)
      )
      return { name, count, shortName: sn, lit: !!medal?.lit, icon: medal?.icon || '📍', building: medal?.building || '' }
    }).sort((a, b) => b.count - a.count)

    const litCount = provinceStats.filter(p => p.lit).length
    const visitedCities = [...new Set(checkins.map(c => c.city).filter(Boolean))]
    const visitedProvinces = [...new Set(checkins.map(c => c.province).filter(Boolean))]

    // 构建飞行轨迹路线（连接所有打卡点）
    this._buildFlightRoute(checkins)

    // 构建飞行段数据
    this._buildFlightSegments(checkins)

    // 地图标记
    const markers = checkins.filter(c => c.lat && c.lng).map((c, i) => ({
      id: i,
      latitude: c.lat,
      longitude: c.lng,
      title: c.place,
      width: 28,
      height: 38,
      callout: {
        content: `${c.place}\n${c.city || ''}\n${c.createdAtCN}`,
        color: '#1E293B',
        fontSize: 12,
        borderRadius: 8,
        padding: 8,
        display: 'BYCLICK'
      },
      anchor: { x: 0.5, y: 1 }
    }))

    // 起终点标注
    if (checkins.length >= 2) {
      const start = checkins[0]
      const end = checkins[checkins.length - 1]
      
      // 起点
      if (start.lat) {
        routeCircles.push({
          latitude: start.lat,
          longitude: start.lng,
          radius: 3000,
          color: '#07C16020',
          fillColor: '#07C16030'
        })
      }

      // 终点
      if (end.lat) {
        routeCircles.push({
          latitude: end.lat,
          longitude: end.lng,
          radius: 3000,
          color: '#FF444420',
          fillColor: '#FF444430'
        })
      }
    }

    this.setData({
      totalCheckins: checkins.length,
      visitedCities,
      visitedProvinces,
      provinceLitCount: litCount,
      cityStats,
      provinceStats,
      trackCount: (data.footprintTracks || []).length,
      displayCheckins: checkins,
      markers,
      routeCircles: this.data.routeCircles,
      routeStartLabel: checkins[0]?.city || '起点',
      routeEndLabel: checkins[checkins.length - 1]?.city || '终点'
    })

    // 自动适配视野
    if (markers.length > 0) {
      this.fitAllPoints()
    }

    this.switchTab({ currentTarget: { dataset: { tab: 'timeline' } } })
  },

  // ====== 飞行轨迹构建 ======
  _buildFlightRoute(checkins) {
    const points = checkins.filter(c => c.lat && c.lng)
    if (points.length < 2) {
      this.setData({ polylines: [] })
      return
    }

    const polylinePoints = points.map(p => ({
      latitude: p.lat,
      longitude: p.lng
    }))

    // 主航线（渐变色效果模拟）
    const colors = ['#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899']
    
    this.setData({
      polylines: [{
        points: polylinePoints,
        color: '#6366F1',
        width: 5,
        dottedLine: false,
        arrowLine: true,
        arrowIconPath: '/images/arrow-right.png',
        borderColor: '#fff',
        borderWidth: 2
      }]
    })

    // 调整地图视野到包含所有点
    this.setData({ mapScale: 5 })
  },

  // ====== 飞行段构建 ======
  _buildFlightSegments(checkins) {
    const segments = []
    for (let i = 1; i < checkins.length; i++) {
      const prev = checkins[i - 1]
      const curr = checkins[i]
      segments.push({
        id: `seg_${i}`,
        fromCity: prev.city || prev.place,
        fromTime: prev.createdAtCN || '',
        toCity: curr.city || curr.place,
        toTime: curr.createdAtCN || '',
        transport: curr.transport || '',
        transportLabel: this._getTransportLabel(curr.transport),
        fromCoords: prev.lat ? { lat: prev.lat, lng: prev.lng } : null,
        toCoords: curr.lat ? { lat: curr.lat, lng: curr.lng } : null
      })
    }
    this.setData({ flightSegments: segments.reverse() }) // 最新的在前
  },

  _getTransportLabel(transport) {
    const map = {
      plane: '✈️ 飞机', train: '🚄 高铁', car: '🚗 汽车',
      bus: '🚌 大巴', bike: '🚲 骑行', walk: '🚶 步行', ship: '🚢 轮船'
    }
    return map[transport] || ''
  },

  // ====== 轨迹播放 ======
  togglePlayRoute() {
    if (this.data.isPlaying) {
      this.stopPlayRoute()
    } else {
      this.startPlayRoute()
    }
  },

  startPlayRoute() {
    // 如果回忆模式启用，使用回忆日期范围内的打卡点
    const checkins = this.data.memoryActive && this.data.memoryCheckins.length > 0
      ? this.data.memoryCheckins
      : this.data.displayCheckins
    
    const points = checkins.filter(c => c.lat && c.lng)
    if (points.length < 2) {
      wx.showToast({ title: '足迹点不足，无法播放', icon: 'none' })
      return
    }

    this.setData({ isPlaying: true, _currentPlayIndex: 0, playProgress: 0 })
    const that = this
    let idx = 0
    const total = points.length - 1

    // 构建播放轨迹的 polyline
    const playLinePoints = points.map(p => ({
      latitude: p.lat,
      longitude: p.lng
    }))

    this._playTimer = setInterval(() => {
      idx++
      if (idx >= total) {
        that.stopPlayRoute()
        that.setData({ playProgress: 100 })
        wx.showToast({ title: '轨迹播放完成', icon: 'success' })
        return
      }

      const currPoint = points[idx]
      const currTransport = currPoint.transport ? that._getTransportLabel(currPoint.transport) : ''

      that.setData({
        playProgress: Math.round(idx / total * 100),
        mapCenter: { lat: currPoint.lat, lng: currPoint.lng },
        mapScale: 12
      })
    }, 800) // 每800ms移动一个点
  },

  stopPlayRoute() {
    if (this._playTimer) {
      clearInterval(this._playTimer)
      this._playTimer = null
    }
    this.setData({ isPlaying: false })
  },

  // ====== 回忆模式 - 日期范围选择 ======
  openDatePicker() {
    this.setData({ showDatePicker: true })
  },

  closeDatePicker() {
    this.setData({ showDatePicker: false })
  },

  onDateStartChange(e) {
    this.setData({ dateStart: e.detail.value, dateStartDisplay: e.detail.value })
  },

  onDateEndChange(e) {
    this.setData({ dateEnd: e.detail.value, dateEndDisplay: e.detail.value })
  },

  applyDateRange() {
    const { dateStart, dateEnd } = this.data
    if (!dateStart || !dateEnd) {
      wx.showToast({ title: '请选择完整的日期范围', icon: 'none' })
      return
    }

    const startDate = new Date(dateStart + 'T00:00:00')
    const endDate = new Date(dateEnd + 'T23:59:59')

    if (startDate > endDate) {
      wx.showToast({ title: '开始日期不能晚于结束日期', icon: 'none' })
      return
    }

    const data = app.globalData.appData
    const checkins = (data.checkins || [])
      .filter(c => {
        if (!c.createdAt) return false
        const d = new Date(c.createdAt)
        return d >= startDate && d <= endDate
      })
      .map(c => ({
        ...c,
        createdAtCN: c.createdAt ? app.formatDateCN(c.createdAt) : ''
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

    if (checkins.length < 2) {
      wx.showToast({ title: '该日期范围内至少需要2个打卡点', icon: 'none' })
      return
    }

    // 构建该时间段的轨迹线路
    const routePoints = checkins.filter(c => c.lat && c.lng).map(c => ({
      latitude: c.lat,
      longitude: c.lng
    }))

    // 更新地图标记
    const markers = checkins.filter(c => c.lat && c.lng).map((c, i) => ({
      id: i,
      latitude: c.lat,
      longitude: c.lng,
      title: c.place,
      width: 28,
      height: 38,
      callout: {
        content: `${c.place}\n${c.city || ''}\n${c.createdAtCN || ''}`,
        color: '#1E293B',
        fontSize: 12,
        borderRadius: 8,
        padding: 8,
        display: 'BYCLICK'
      },
      anchor: { x: 0.5, y: 1 }
    }))

    // 起终点标注
    const circles = []
    if (checkins.length >= 2) {
      const start = checkins[0]
      const end = checkins[checkins.length - 1]
      if (start.lat) circles.push({ latitude: start.lat, longitude: start.lng, radius: 3000, color: '#07C16020', fillColor: '#07C16030' })
      if (end.lat) circles.push({ latitude: end.lat, longitude: end.lng, radius: 3000, color: '#FF444420', fillColor: '#FF444430' })
    }

    // 构建回忆飞行段
    const segments = []
    for (let i = 1; i < checkins.length; i++) {
      const prev = checkins[i - 1]
      const curr = checkins[i]
      segments.push({
        id: `mem_${i}`,
        fromCity: prev.city || prev.place,
        fromTime: prev.createdAtCN || '',
        toCity: curr.city || curr.place,
        toTime: curr.createdAtCN || '',
        transport: curr.transport || '',
        transportLabel: this._getTransportLabel(curr.transport),
        fromCoords: prev.lat ? { lat: prev.lat, lng: prev.lng } : null,
        toCoords: curr.lat ? { lat: curr.lat, lng: curr.lng } : null
      })
    }

    this.setData({
      showDatePicker: false,
      memoryActive: true,
      memoryCheckins: checkins,
      markers,
      polylines: routePoints.length >= 2 ? [{
        points: routePoints,
        color: '#6366F1',
        width: 5,
        dottedLine: false,
        arrowLine: true,
        borderColor: '#fff',
        borderWidth: 2
      }] : [],
      routeCircles: circles,
      flightSegments: segments.reverse(),
      playProgress: 0,
      routeStartLabel: checkins[0]?.city || '起点',
      routeEndLabel: checkins[checkins.length - 1]?.city || '终点'
    })

    // 调整地图视野
    if (markers.length > 0) {
      this.fitAllPoints()
    }

    wx.showToast({ 
      title: `回顾 ${dateStart} ~ ${dateEnd}\n共 ${checkins.length} 个足迹`, 
      icon: 'none' 
    })
  },

  resetMemory() {
    this.setData({
      memoryActive: false,
      memoryCheckins: [],
      dateStart: '',
      dateEnd: '',
      dateStartDisplay: '',
      dateEndDisplay: '',
      playProgress: 0
    })
    this.stopPlayRoute()
    this.loadData()
  },

  // ====== 面板交互 ======
  toggleDetail() {
    this.setData({ showDetail: !this.data.showDetail })
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab })
  },

  focusSegment(e) {
    const idx = e.currentTarget.dataset.idx
    const seg = this.data.flightSegments[idx]
    if (!seg || !seg.fromCoords) return

    // 动画飞向该段
    const midLat = (seg.fromCoords.lat + (seg.toCoords?.lat || seg.fromCoords.lat)) / 2
    const midLng = (seg.fromCoords.lng + (seg.toCoords?.lng || seg.fromCoords.lng)) / 2

    this.setData({
      mapCenter: { lat: midLat, lng: midLng },
      mapScale: 10
    })

    wx.showToast({ title: `${seg.fromCity} → ${seg.toCity}`, icon: 'none' })
  },

  locateUser() {
    const that = this
    wx.getLocation({
      type: 'gcj02',
      success(res) {
        that.setData({ mapCenter: { lat: res.latitude, lng: res.longitude }, mapScale: 14 })
        wx.showToast({ title: '定位成功', icon: 'success' })
      },
      fail() {
        wx.showToast({ title: '定位失败，请检查权限', icon: 'error' })
      }
    })
  },

  fitAllPoints() {
    if (this.data.markers.length === 0) return
    this.setData({ mapScale: 5 })
  },

  onRegionChange(e) {
    if (e.type === 'end') {
      // 可在此处理地图移动事件
    }
  },

  goBack() {
    // 先停止播放
    this.stopPlayRoute()
    wx.navigateBack()
  },

  onUnload() {
    this.stopPlayRoute()
  }
})
