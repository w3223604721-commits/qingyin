const app = getApp();

Page({
  data: {
    activeTab: 'export', journeys: [], tplStyle: 'receipt', tplTitle: '', tplPhotos: [], showReceipt: false,
    receiptTitle: '', receiptInfo: '', receiptCount: 0, receiptItems: []
  },

  onShow() {
    if (!app.requireLogin()) { wx.redirectTo({ url: '/pages/login/login' }); return }
    this.loadJourneys();
  },

  loadJourneys() {
    const data = app.globalData.appData;
    const checkins = data.checkins || [];
    const journeys = (data.journeys || []).map(j => {
      const ci = checkins.filter(c => c.journeyId === j.id).length;
      const previewPhotos = [];
      if (j.coverPhoto) previewPhotos.push(j.coverPhoto);
      if (j.days) j.days.forEach(d => { if (d.photos) d.photos.forEach(p => previewPhotos.push(p)) });
      const thumbs = previewPhotos.slice(0, 4);
      return { ...j, dateRange: app.formatDateRange(j.startDate, j.endDate), dayCount: j.days ? j.days.length : 0, checkinCount: ci, photoCount: previewPhotos.length, thumbs, moreCount: Math.max(0, previewPhotos.length - 4) };
    });
    this.setData({ journeys });
  },

  switchTab(e) { this.setData({ activeTab: e.currentTarget.dataset.tab }) },

  selectStyle(e) {
    if (e.currentTarget.dataset.style !== 'receipt') { wx.showToast({ title: '该风格即将上线', icon: 'none' }); return }
    this.setData({ tplStyle: 'receipt' });
  },

  onTplTitleInput(e) { this.setData({ tplTitle: e.detail.value }) },

  addTplPhoto() {
    wx.chooseImage({ count: 9 - this.data.tplPhotos.length, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => {
      const newPhotos = res.tempFilePaths.map(src => ({ src, text: '', place: '', date: '' }));
      this.setData({ tplPhotos: [...this.data.tplPhotos, ...newPhotos] });
    }})
  },

  removeTplPhoto(e) { const photos = [...this.data.tplPhotos]; photos.splice(e.currentTarget.dataset.index, 1); this.setData({ tplPhotos: photos }) },
  onTplPhotoText(e) { const photos = [...this.data.tplPhotos]; photos[e.currentTarget.dataset.index].text = e.detail.value; this.setData({ tplPhotos: photos }) },
  onTplPhotoPlace(e) { const photos = [...this.data.tplPhotos]; photos[e.currentTarget.dataset.index].place = e.detail.value; this.setData({ tplPhotos: photos }) },
  onTplPhotoDate(e) { const photos = [...this.data.tplPhotos]; photos[e.currentTarget.dataset.index].date = e.detail.value; this.setData({ tplPhotos: photos }) },

  exportJourney(e) { wx.showToast({ title: '导出功能开发中...', icon: 'none' }) },

  openReceipt(e) {
    const journey = app.globalData.appData.journeys.find(j => j.id === e.currentTarget.dataset.id);
    if (!journey) return;
    const checkins = app.globalData.appData.checkins.filter(c => c.journeyId === journey.id);
    let photoItems = [];
    checkins.filter(c => c.photo).forEach(c => { photoItems.push({ img: c.photo, time: app.formatTime(c.createdAt) || '00:00', place: c.city || '', title: `PHOTO ${String(photoItems.length + 1).padStart(2, '0')}`, desc: c.note || c.place || '美好时刻' }) });
    photoItems = photoItems.slice(0, 9);
    this.setData({ showReceipt: true, receiptTitle: journey.name, receiptInfo: journey.city ? `${journey.city} · ${app.formatDateRange(journey.startDate, journey.endDate)}` : '', receiptCount: photoItems.length, receiptItems: photoItems });
  },

  generateReceipt() {
    const { tplTitle, tplPhotos } = this.data;
    if (tplPhotos.length < 2) { wx.showToast({ title: '请至少添加2张图片', icon: 'error' }); return }
    const photoItems = tplPhotos.slice(0, 9).map((item, i) => ({ img: item.src, time: item.date ? app.formatDateCN(item.date) : '', place: item.place || '', title: `PHOTO ${String(i + 1).padStart(2, '0')}`, desc: item.text || '美好的一刻' }));
    const places = photoItems.map(p => p.place).filter(Boolean);
    this.setData({ showReceipt: true, receiptTitle: tplTitle.trim() || '这一段生活的小票', receiptInfo: places.length > 0 ? [...new Set(places)].join(' · ') : '', receiptCount: photoItems.length, receiptItems: photoItems });
  },

  closeReceipt() { this.setData({ showReceipt: false }) },
  noop() {},
  saveReceipt() { wx.showToast({ title: '保存功能开发中...', icon: 'none' }) }
})