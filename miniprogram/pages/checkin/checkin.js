const app = getApp();

// 城市坐标映射
const CITY_COORDS = {
  '北京': [39.9042, 116.4074], '天津': [39.3434, 117.3616],
  '上海': [31.2304, 121.4737], '重庆': [29.4316, 106.9123],
  '石家庄': [38.0428, 114.5149], '太原': [37.8706, 112.5489],
  '呼和浩特': [40.8414, 111.7519], '沈阳': [41.8057, 123.432],
  '长春': [43.8171, 125.3235], '哈尔滨': [45.8038, 126.535],
  '南京': [32.0603, 118.7969], '杭州': [30.2741, 120.1551],
  '合肥': [31.8206, 117.2272], '南昌': [28.6820, 115.8579],
  '济南': [36.6512, 117.1201], '郑州': [34.7466, 113.6254],
  '武汉': [30.5928, 114.3055], '长沙': [28.2282, 112.9388],
  '广州': [23.1291, 113.2644], '南宁': [22.8170, 108.3665],
  '海口': [20.0174, 110.3492], '成都': [30.5728, 104.0668],
  '贵阳': [26.6470, 106.6302], '昆明': [25.0389, 102.7183],
  '拉萨': [29.6500, 91.1000], '西安': [34.3416, 108.9398],
  '兰州': [36.0611, 103.8343], '西宁': [36.6171, 101.7782],
  '银川': [38.4872, 106.2309], '乌鲁木齐': [43.8256, 87.6168],
  '桂林': [25.2744, 110.2900], '三亚': [18.2528, 109.5120],
  '青岛': [36.0671, 120.3826], '大连': [38.9140, 121.6147],
  '厦门': [24.4798, 118.0894], '深圳': [22.5431, 114.0579],
  '苏州': [31.2989, 120.5853], '宁波': [29.8683, 121.5440],
  '黄山': [30.1370, 118.1689], '张家界': [29.1160, 110.4790],
  '丽江': [26.8721, 100.2290], '大理': [25.6007, 100.2166]
};

function getCoordsByLocation(province, city) {
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (city && (city.includes(k) || k.includes(city))) return { lat: v[0], lng: v[1] };
  }
  if (province) {
    for (const [k, v] of Object.entries(CITY_COORDS)) {
      if (k.startsWith(province.slice(0, 2))) return { lat: v[0] + (Math.random() - 0.5) * 1, lng: v[1] + (Math.random() - 0.5) * 1 };
    }
  }
  return { lat: 35 + (Math.random() - 0.5) * 15, lng: 105 + (Math.random() - 0.5) * 20 };
}

Page({
  data: {
    mapCenter: { lat: 35.86, lng: 104.19 },
    mapScale: 4,
    markers: [],
    polylines: [],
    circles: [],
    showUserLocation: true,
    checkins: [],
    showList: false,
    showModal: false,
    tracking: false,
    footprintCount: 0,
    form: { place: '', city: '', province: '', photo: '', note: '', transport: '' },
    selectedPhoto: '',
    // 勋章弹窗
    showMedalPopup: false,
    medalPopupData: { icon: '', name: '', building: '', place: '', total: 1 },
    // 全屏地图状态栏高度
    statusBarHeight: 0,
    // 二次打卡提示
    placeHint: '',
    // 足迹报告面板
    showReport: false,
    reportTab: 'overview',
    reportData: {
      totalCheckins: 0,
      cityCount: 0,
      provinceLit: 0,
      provinceTotal: 34,
      trackCount: 0,
      provinceStats: [],
      provinceStatsFull: [],
      cityStats: [],
      flightSegments: [],
      favCity: '',
      favMonth: '',
      favTransport: '',
      favTransportIcon: ''
    }
  },

  _footprintPoints: [],
  _trackingTimer: null,
  _currentLocation: null,

  onShow() {
    // 登录检查
    if (!app.requireLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    // 获取状态栏高度用于全屏地图布局
    try {
      const sysInfo = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sysInfo.statusBarHeight || 0 })
    } catch (e) { /* ignore */ }
    this.loadCheckins();
    this.renderMarkers();
    this.computeReportData();
  },

  onHide() {
    if (this.data.tracking) this.stopTracking();
  },

  onUnload() {
    if (this.data.tracking) this.stopTracking();
  },

  loadCheckins() {
    const data = app.globalData.appData;
    const rawCheckins = data.checkins || [];
    
    // 计算每个地点的打卡次数
    const placeCountMap = {};
    rawCheckins.forEach(c => {
      if (c.place) placeCountMap[c.place] = (placeCountMap[c.place] || 0) + 1;
    });
    
    // 计算每次打卡是该地点的第几次
    const placeVisitIndex = {};
    const sortedByTime = [...rawCheckins].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    sortedByTime.forEach(c => {
      if (c.place) {
        placeVisitIndex[c.id] = (placeVisitIndex[c.place] || 0) + 1;
      }
    });
    
    const checkins = rawCheckins.map(c => ({
      ...c,
      createdAt: app.formatDateCN(c.createdAt),
      visitCount: placeCountMap[c.place] || 1,
      visitIndex: placeVisitIndex[c.id] || 1
    }));
    this.setData({ checkins });
  },

  renderMarkers() {
    const data = app.globalData.appData;
    const checkins = data.checkins || [];
    const markers = checkins.map((c, i) => ({
      id: i,
      latitude: c.lat,
      longitude: c.lng,
      title: c.place,
      iconPath: c.photo ? '/images/marker-photo.png' : '',
      width: 32,
      height: 32,
      callout: {
        content: c.place,
        color: '#1E293B',
        fontSize: 13,
        borderRadius: 8,
        padding: 8,
        display: 'BYCLICK'
      }
    }));

    this.setData({ markers });

    // 自动调整视野
    if (checkins.length > 0 && checkins.length <= 1) {
      this.setData({
        mapCenter: { lat: checkins[0].lat, lng: checkins[0].lng },
        mapScale: 14
      });
    }
  },

  // 地图事件
  onMarkerTap(e) {
    const id = e.detail.markerId;
    const data = app.globalData.appData;
    const c = data.checkins[id];
    if (!c) return;
    wx.showModal({
      title: c.place,
      content: `${c.province || ''} ${c.city || ''}\n${c.note || ''}`,
      confirmText: '知道了',
      showCancel: false
    });
  },

  onRegionChange(e) {
    if (e.type === 'end') {
      // 可在此处理地图移动事件
    }
  },

  onMapTap() {},

  locateUser() {
    const that = this;
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success(res) {
        that._currentLocation = { lat: res.latitude, lng: res.longitude };
        that.setData({
          mapCenter: { lat: res.latitude, lng: res.longitude },
          mapScale: 15,
          circles: [{
            latitude: res.latitude,
            longitude: res.longitude,
            radius: 50,
            color: '#6366F180',
            fillColor: '#6366F130'
          }]
        });
        wx.showToast({ title: '定位成功', icon: 'success', duration: 1500 });
      },
      fail(err) {
        console.error('定位失败:', err);
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中允许轻印获取位置信息，以便记录足迹',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({ title: '定位失败，请稍后重试', icon: 'none' });
        }
      }
    });
  },

  // 打卡列表
  toggleList() {
    this.setData({ showList: !this.data.showList });
  },

  focusCheckin(e) {
    const id = e.currentTarget.dataset.id;
    const data = app.globalData.appData;
    const c = data.checkins.find(x => x.id === id);
    if (!c) return;
    this.setData({
      mapCenter: { lat: c.lat, lng: c.lng },
      mapScale: 15
    });
  },

  // 打卡 CRUD
  openCheckinModal() {
    this.setData({
      showModal: true,
      form: { place: '', city: '', province: '', photo: '', note: '', transport: '' },
      selectedPhoto: '',
      linkedJourneyId: '',
      linkedDayDate: '',
      linkedDays: [],
    });
  },

  closeModal() {
    this.setData({ showModal: false });
  },

  noop() {},

  onFieldInput(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    this.setData({ [`form.${field}`]: value });
    
    // 地点输入时显示二次打卡提示
    if (field === 'place') {
      const data = app.globalData.appData;
      const checkins = data.checkins || [];
      const count = checkins.filter(c => c.place === value.trim()).length;
      if (count > 0 && value.trim()) {
        this.setData({ placeHint: `你已在此打过 ${count} 次卡，这将是第 ${count + 1} 次` });
      } else {
        this.setData({ placeHint: '' });
      }
    }
  },

  // 交通工具选择
  selectTransport(e) {
    const value = e.currentTarget.dataset.value;
    const current = this.data.form.transport;
    this.setData({ 'form.transport': current === value ? '' : value });
  },

  choosePhoto() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({
          'form.photo': tempFilePath,
          selectedPhoto: tempFilePath
        });
      }
    });
  },

  // 关联日志：选择旅程后加载天数列表
  linkedDays: [],
  linkedJourneyId: '',
  linkedDayDate: '',

  onJourneyChange(e) {
    const id = e.detail.value
    this.setData({ linkedJourneyId: id, linkedDayDate: '', linkedDays: [] })
    if (!id) return
    const journey = app.globalData.appData.journeys.find(j => j.id === id)
    if (journey?.days?.length) {
      this.setData({ linkedDays: [...journey.days].sort((a, b) => new Date(a.date) - new Date(b.date)) })
    }
  },

  onDayDateChange(e) {
    this.setData({ linkedDayDate: e.detail.value })
  },

  saveCheckin() {
    if (this.data._saving) return
    const { form } = this.data;
    if (!form.place.trim()) {
      wx.showToast({ title: '请输入地点名称', icon: 'error' });
      return;
    }

    this.setData({ _saving: true })
    wx.showLoading({ title: '保存中...', mask: true })

    const self = this
    wx.nextTick(() => {
      try {
        const coords = getCoordsByLocation(form.province.trim(), form.city.trim());

        // 关联日志信息
        let journeyId = undefined, journeyName = undefined, dayDate = undefined, dayTitle = undefined
        if (self.data.linkedJourneyId) {
          journeyId = self.data.linkedJourneyId
          const journey = app.globalData.appData.journeys.find(j => j.id === journeyId)
          journeyName = journey?.name
          if (self.data.linkedDayDate) {
            dayDate = self.data.linkedDayDate
            const day = journey?.days?.find(d => d.date === dayDate)
            dayTitle = day?.title
          }
        }

        const checkin = {
          id: app.generateId('c'),
          place: form.place.trim(),
          city: form.city.trim(),
          province: form.province.trim(),
          lat: coords.lat,
          lng: coords.lng,
          photo: form.photo || null,
          note: form.note.trim(),
          transport: form.transport || undefined,
          journeyId: journeyId || undefined,
          journeyName: journeyName || undefined,
          dayDate: dayDate || undefined,
          dayTitle: dayTitle || undefined,
          createdAt: new Date().toISOString()
        };

        const data = app.globalData.appData;
        data.checkins.unshift(checkin);
        app.saveData(data);
        app.saveMedals();

        wx.hideLoading()
        self.setData({ _saving: false, linkedJourneyId: '', linkedDayDate: '', linkedDays: [] })
        self.closeModal();
        self.loadCheckins();
        self.renderMarkers();
        self.computeReportData();
        wx.showToast({ title: '打卡成功！', icon: 'success' });

        // 检查勋章
        self.checkMedal(form.province.trim(), form.city.trim(), form.place.trim());
      } catch (e) {
        console.error('saveCheckin error:', e)
        wx.hideLoading()
        self.setData({ _saving: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  },

  deleteCheckin(e) {
    const id = e.currentTarget.dataset.id;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '确定删除这个打卡记录吗？',
      success(res) {
        if (!res.confirm) return;
        const data = app.globalData.appData;
        data.checkins = data.checkins.filter(c => c.id !== id);
        app.saveData(data);
        that.loadCheckins();
        that.renderMarkers();
        that.computeReportData();
        wx.showToast({ title: '打卡已删除', icon: 'success' });
      }
    });
  },

  checkMedal(province, city, place) {
    const loc = (province || city).replace(/[省市自治区特别行政区]/g, '').trim();
    const unlockedMedals = [];
    const medals = app.globalData.provinceMedals;

    medals.forEach(m => {
      if (m.lit) return;
      const mName = m.name.replace(/[省市自治区特别行政区]/g, '');
      if (loc.includes(mName) || mName.includes(loc) || (loc.length <= 2 && mName.includes(loc))) {
        m.lit = true;
        unlockedMedals.push(m);
      }
    });

    if (unlockedMedals.length > 0) {
      app.saveMedals();
      // 显示精美的勋章解锁弹窗
      const medal = unlockedMedals[0];
      this.setData({
        showMedalPopup: true,
        medalPopupData: {
          icon: medal.icon,
          name: medal.name,
          building: medal.building,
          place: place || loc,
          total: unlockedMedals.length
        }
      });
    }
  },

  // 关闭勋章弹窗
  closeMedalPopup() {
    this.setData({ showMedalPopup: false });
  },

  // 从勋章弹窗前往勋章页
  goToMedalsFromPopup() {
    this.setData({ showMedalPopup: false });
    wx.navigateTo({ url: '/pages/medals/medals' });
  },

  // 足迹记录
  toggleTracking() {
    if (this.data.tracking) {
      this.stopTracking();
    } else {
      this.startTracking();
    }
  },

  startTracking() {
    const that = this;
    that._footprintPoints = [];
    that.setData({ tracking: true, footprintCount: 0, polylines: [] });

    wx.startLocationUpdate({
      success() {
        wx.onLocationChange(function(res) {
          if (!that.data.tracking) return;
          const pt = { lat: res.latitude, lng: res.longitude };
          that._footprintPoints.push(pt);
          that.setData({ footprintCount: that._footprintPoints.length });

          if (that._footprintPoints.length >= 2) {
            const points = that._footprintPoints.map(p => ({
              latitude: p.lat,
              longitude: p.lng
            }));
            that.setData({
              polylines: [{
                points: points,
                color: '#EF4444',
                width: 3,
                dottedLine: true
              }]
            });
          }

          that.setData({
            mapCenter: { lat: pt.lat, lng: pt.lng }
          });
        });
      },
      fail(err) {
        console.error('开启位置更新失败:', err);
        if (err.errMsg && err.errMsg.includes('auth deny')) {
          wx.showModal({
            title: '需要位置权限',
            content: '请在设置中允许轻印获取位置信息',
            confirmText: '去设置',
            success(res) {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '无法获取位置信息', icon: 'none' });
        }
        that.setData({ tracking: false });
      }
    });
  },

  stopTracking() {
    const points = this._footprintPoints;
    this.setData({ tracking: false, footprintCount: 0 });
    wx.stopLocationUpdate();
    wx.offLocationChange();

    if (points.length > 0) {
      wx.showToast({ title: `足迹完成，共${points.length}个点`, icon: 'success' });
      const data = app.globalData.appData;
      if (!data.footprintTracks) data.footprintTracks = [];
      data.footprintTracks.push({
        id: app.generateId('fp'),
        points: points,
        pointCount: points.length,
        createdAt: new Date().toISOString()
      });
      app.saveData(data);
    }
    this._footprintPoints = [];
    this.setData({ polylines: [] });
  },

  // ====== 足迹报告功能 ======
  toggleReport() {
    if (this.data.showReport) {
      this.setData({ showReport: false });
    } else {
      this.computeReportData();
      this.setData({ showReport: true, reportTab: 'overview' });
    }
  },

  switchReportTab(e) {
    this.setData({ reportTab: e.currentTarget.dataset.tab });
  },

  computeReportData() {
    const data = app.globalData.appData;
    const checkins = (data.checkins || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // 基础统计
    const cityMap = {};
    const provinceMap = {};
    const monthMap = {};
    const transportMap = {};

    checkins.forEach(c => {
      if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1;
      if (c.province) provinceMap[c.province] = (provinceMap[c.province] || 0) + 1;
      if (c.createdAt) {
        const m = new Date(c.createdAt).getMonth() + 1;
        monthMap[m] = (monthMap[m] || 0) + 1;
      }
      if (c.transport) transportMap[c.transport] = (transportMap[c.transport] || 0) + 1;
    });

    // 城市统计排序
    const cityStats = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count, pct: 0 }))
      .sort((a, b) => b.count - a.count);
    const maxCity = Math.max(1, ...cityStats.map(s => s.count));
    cityStats.forEach(s => { s.pct = Math.round(s.count / maxCity * 100); });

    // 省份统计（含勋章状态）
    const medals = app.globalData.provinceMedals || [];
    const visitedProvs = Object.keys(provinceMap);
    const provinceStats = visitedProvs.map(name => {
      const medal = medals.find(m =>
        name.includes(m.name.replace(/(省|市|自治区|特别行政区)/g, '')) ||
        m.name.includes(name.replace(/(省|市|自治区|特别行政区)/g, ''))
      );
      return {
        name: name.replace(/(省|市|自治区|特别行政区)/g, ''),
        count: provinceMap[name],
        lit: !!medal?.lit,
        icon: medal?.icon || '📍',
        building: medal?.building || ''
      };
    }).sort((a, b) => b.count - a.count);

    // 全部34省份
    const allProvinces = medals.map(m => {
      const short = m.name.replace(/(省|市|自治区|特别行政区)/g, '');
      const found = provinceStats.find(p => p.name === short);
      return found || { name: short, count: 0, lit: !!m.lit, icon: m.icon, building: m.building };
    });

    const provinceLit = medals.filter(m => m.lit).length;

    // 飞行段
    const flightSegments = [];
    for (let i = 1; i < checkins.length; i++) {
      const prev = checkins[i - 1];
      const curr = checkins[i];
      flightSegments.push({
        id: `rs_${i}`,
        fromCity: prev.city || prev.place,
        fromTime: prev.createdAt ? app.formatDateCN(prev.createdAt) : '',
        toCity: curr.city || curr.place,
        toTime: curr.createdAt ? app.formatDateCN(curr.createdAt) : '',
        transport: curr.transport || '',
        transportLabel: this._getTransportLabel(curr.transport),
        fromCoords: prev.lat ? { lat: prev.lat, lng: prev.lng } : null,
        toCoords: curr.lat ? { lat: curr.lat, lng: curr.lng } : null
      });
    }

    // 偏好分析
    let favCity = '', favMonth = '', favTransport = '', favTransportIcon = '';
    if (cityStats.length > 0) favCity = cityStats[0].name;
    if (Object.keys(monthMap).length > 0) {
      const topMonth = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0];
      favMonth = `${topMonth[0]}月 (${topMonth[1]}次)`;
    }
    if (Object.keys(transportMap).length > 0) {
      const topTransport = Object.entries(transportMap).sort((a, b) => b[1] - a[1])[0];
      favTransport = this._getTransportLabel(topTransport[0]) || topTransport[0];
      const iconMap = { plane: '✈️', train: '🚄', car: '🚗', bus: '🚌', bike: '🚲', walk: '🚶', ship: '🚢' };
      favTransportIcon = iconMap[topTransport[0]] || '🚗';
    }

    this.setData({
      reportData: {
        totalCheckins: checkins.length,
        cityCount: Object.keys(cityMap).length,
        provinceLit,
        provinceTotal: 34,
        trackCount: (data.footprintTracks || []).length,
        provinceStats,
        provinceStatsFull: allProvinces,
        cityStats,
        flightSegments: flightSegments.reverse(),
        favCity, favMonth, favTransport, favTransportIcon
      }
    });
  },

  _getTransportLabel(t) {
    const map = {
      plane: '✈️ 飞机', train: '🚄 高铁', car: '🚗 汽车',
      bus: '🚌 大巴', bike: '🚲 骑行', walk: '🚶 步行', ship: '🚢 轮船'
    };
    return map[t] || '';
  },

  focusReportSegment(e) {
    const idx = e.currentTarget.dataset.idx;
    const seg = this.data.reportData.flightSegments[idx];
    if (!seg?.fromCoords) return;
    const midLat = (seg.fromCoords.lat + (seg.toCoords?.lat || seg.fromCoords.lat)) / 2;
    const midLng = (seg.fromCoords.lng + (seg.toCoords?.lng || seg.fromCoords.lng)) / 2;
    this.setData({
      showReport: false,
      mapCenter: { lat: midLat, lng: midLng },
      mapScale: 10
    });
    wx.showToast({ title: `${seg.fromCity} → ${seg.toCity}`, icon: 'none' });
  }
});
