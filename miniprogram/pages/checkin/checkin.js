const app = getApp();
const CITY_COORDS = {
  '北京': [39.9042, 116.4074], '上海': [31.2304, 121.4737], '广州': [23.1291, 113.2644],
  '深圳': [22.5431, 114.0579], '成都': [30.5728, 104.0668], '杭州': [30.2741, 120.1551],
  '武汉': [30.5928, 114.3055], '西安': [34.3416, 108.9398], '南京': [32.0603, 118.7969],
  '重庆': [29.4316, 106.9123], '厦门': [24.4798, 118.0894], '三亚': [18.2528, 109.5120],
  '长沙': [28.2282, 112.9388], '昆明': [25.0389, 102.7183], '青岛': [36.0671, 120.3826],
  '大连': [38.9140, 121.6147], '苏州': [31.2989, 120.5853], '桂林': [25.2744, 110.2900],
  '丽江': [26.8721, 100.2290], '拉萨': [29.6500, 91.1000]
};

function getCoordsByLocation(province, city) {
  for (const [k, v] of Object.entries(CITY_COORDS)) {
    if (city && (city.includes(k) || k.includes(city))) return { lat: v[0], lng: v[1] };
  }
  return { lat: 35 + (Math.random() - 0.5) * 15, lng: 105 + (Math.random() - 0.5) * 20 };
}

Page({
  data: {
    mapCenter: { lat: 35.86, lng: 104.19 }, mapScale: 4, markers: [], polylines: [], circles: [], showUserLocation: true,
    checkins: [], showList: false, showModal: false, tracking: false, footprintCount: 0,
    form: { place: '', city: '', province: '', photo: '', note: '', transport: '' }, selectedPhoto: '',
    showMedalPopup: false, medalPopupData: { icon: '', name: '', building: '', place: '', total: 1 },
    statusBarHeight: 0, placeHint: '', showReport: false, reportTab: 'overview',
    reportData: { totalCheckins: 0, cityCount: 0, provinceLit: 0, provinceTotal: 34, trackCount: 0, provinceStats: [], provinceStatsFull: [], cityStats: [], flightSegments: [], favCity: '', favMonth: '', favTransport: '', favTransportIcon: '' }
  },
  _footprintPoints: [], _trackingTimer: null, _currentLocation: null,

  onShow() {
    if (!app.requireLogin()) { wx.redirectTo({ url: '/pages/login/login' }); return }
    try { const sysInfo = wx.getSystemInfoSync(); this.setData({ statusBarHeight: sysInfo.statusBarHeight || 0 }) } catch (e) {}
    this.loadCheckins(); this.renderMarkers(); this.computeReportData();
  },

  onHide() { if (this.data.tracking) this.stopTracking() },
  onUnload() { if (this.data.tracking) this.stopTracking() },

  loadCheckins() {
    const rawCheckins = app.globalData.appData.checkins || [];
    const checkins = rawCheckins.map(c => ({ ...c, createdAt: app.formatDateCN(c.createdAt) }));
    this.setData({ checkins });
  },

  renderMarkers() {
    const checkins = app.globalData.appData.checkins || [];
    const markers = checkins.map((c, i) => ({ id: i, latitude: c.lat, longitude: c.lng, title: c.place, width: 32, height: 32, callout: { content: c.place, color: '#1E293B', fontSize: 13, borderRadius: 8, padding: 8, display: 'BYCLICK' } }));
    this.setData({ markers });
    if (checkins.length === 1) this.setData({ mapCenter: { lat: checkins[0].lat, lng: checkins[0].lng }, mapScale: 14 });
  },

  locateUser() {
    wx.getLocation({ type: 'gcj02', isHighAccuracy: true, success: (res) => {
      this._currentLocation = { lat: res.latitude, lng: res.longitude };
      this.setData({ mapCenter: { lat: res.latitude, lng: res.longitude }, mapScale: 15, circles: [{ latitude: res.latitude, longitude: res.longitude, radius: 50, color: '#6366F180', fillColor: '#6366F130' }] });
    }, fail: (err) => { wx.showToast({ title: '定位失败', icon: 'none' }) } });
  },

  toggleList() { this.setData({ showList: !this.data.showList }) },
  focusCheckin(e) {
    const c = app.globalData.appData.checkins.find(x => x.id === e.currentTarget.dataset.id);
    if (c) this.setData({ mapCenter: { lat: c.lat, lng: c.lng }, mapScale: 15 });
  },

  openCheckinModal() { this.setData({ showModal: true, form: { place: '', city: '', province: '', photo: '', note: '', transport: '' }, selectedPhoto: '', linkedJourneyId: '', linkedDayDate: '', linkedDays: [] }) },
  closeModal() { this.setData({ showModal: false }) },
  noop() {},

  onFieldInput(e) { this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value }) },
  selectTransport(e) { const v = e.currentTarget.dataset.value; this.setData({ 'form.transport': this.data.form.transport === v ? '' : v }) },

  choosePhoto() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => { this.setData({ 'form.photo': res.tempFilePaths[0], selectedPhoto: res.tempFilePaths[0] }) } });
  },

  saveCheckin() {
    if (this.data._saving) return
    const { form } = this.data;
    if (!form.place.trim()) { wx.showToast({ title: '请输入地点名称', icon: 'error' }); return }
    this.setData({ _saving: true }); wx.showLoading({ title: '保存中...', mask: true });
    const self = this
    wx.nextTick(() => {
      try {
        const coords = getCoordsByLocation(form.province.trim(), form.city.trim());
        const checkin = { id: app.generateId('c'), place: form.place.trim(), city: form.city.trim(), province: form.province.trim(), lat: coords.lat, lng: coords.lng, photo: form.photo || null, note: form.note.trim(), transport: form.transport || undefined, createdAt: new Date().toISOString() };
        app.globalData.appData.checkins.unshift(checkin);
        app.saveData(app.globalData.appData);
        wx.hideLoading(); self.setData({ _saving: false });
        self.closeModal(); self.loadCheckins(); self.renderMarkers(); self.computeReportData();
        wx.showToast({ title: '打卡成功！', icon: 'success' });
        self.checkMedal(form.province.trim(), form.city.trim(), form.place.trim());
      } catch (e) { wx.hideLoading(); self.setData({ _saving: false }); wx.showToast({ title: '保存失败', icon: 'none' }) }
    })
  },

  deleteCheckin(e) {
    wx.showModal({ title: '确认删除', content: '确定删除这个打卡记录吗？', success: (res) => {
      if (!res.confirm) return;
      app.globalData.appData.checkins = app.globalData.appData.checkins.filter(c => c.id !== e.currentTarget.dataset.id);
      app.saveData(app.globalData.appData);
      this.loadCheckins(); this.renderMarkers(); this.computeReportData();
      wx.showToast({ title: '打卡已删除', icon: 'success' });
    }})
  },

  checkMedal(province, city, place) {
    const loc = (province || city).replace(/[省市自治区特别行政区]/g, '').trim();
    const medals = app.globalData.provinceMedals;
    const unlocked = [];
    medals.forEach(m => { if (!m.lit) { const mName = m.name.replace(/[省市自治区特别行政区]/g, ''); if (loc.includes(mName) || mName.includes(loc)) { m.lit = true; unlocked.push(m) } } });
    if (unlocked.length > 0) { app.saveMedals(); const medal = unlocked[0]; this.setData({ showMedalPopup: true, medalPopupData: { icon: medal.icon, name: medal.name, building: medal.building, place: place || loc, total: unlocked.length } }) }
  },

  closeMedalPopup() { this.setData({ showMedalPopup: false }) },
  goToMedalsFromPopup() { this.setData({ showMedalPopup: false }); wx.navigateTo({ url: '/pages/medals/medals' }) },

  toggleTracking() { this.data.tracking ? this.stopTracking() : this.startTracking() },
  startTracking() {
    this._footprintPoints = [];
    this.setData({ tracking: true, footprintCount: 0, polylines: [] });
    wx.startLocationUpdate({ success: () => { wx.onLocationChange((res) => { if (!this.data.tracking) return; this._footprintPoints.push({ lat: res.latitude, lng: res.longitude }); this.setData({ footprintCount: this._footprintPoints.length, mapCenter: { lat: res.latitude, lng: res.longitude } }) }) }, fail: () => { this.setData({ tracking: false }); wx.showToast({ title: '无法获取位置', icon: 'none' }) } });
  },
  stopTracking() { this.setData({ tracking: false }); wx.stopLocationUpdate(); wx.offLocationChange(); this._footprintPoints = []; this.setData({ polylines: [] }) },

  toggleReport() { if (this.data.showReport) { this.setData({ showReport: false }) } else { this.computeReportData(); this.setData({ showReport: true, reportTab: 'overview' }) } },
  switchReportTab(e) { this.setData({ reportTab: e.currentTarget.dataset.tab }) },

  computeReportData() {
    const checkins = (app.globalData.appData.checkins || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const cityMap = {}, provinceMap = {};
    checkins.forEach(c => { if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1; if (c.province) provinceMap[c.province] = (provinceMap[c.province] || 0) + 1 });
    const cityStats = Object.entries(cityMap).map(([name, count]) => ({ name, count, pct: 0 })).sort((a, b) => b.count - a.count);
    const maxCity = Math.max(1, ...cityStats.map(s => s.count));
    cityStats.forEach(s => { s.pct = Math.round(s.count / maxCity * 100) });
    const medals = app.globalData.provinceMedals || [];
    const provinceLit = medals.filter(m => m.lit).length;
    this.setData({ reportData: { totalCheckins: checkins.length, cityCount: Object.keys(cityMap).length, provinceLit, provinceTotal: 34, trackCount: (app.globalData.appData.footprintTracks || []).length, provinceStats: [], provinceStatsFull: [], cityStats, flightSegments: [], favCity: cityStats[0]?.name || '', favMonth: '', favTransport: '', favTransportIcon: '' } })
  }
})