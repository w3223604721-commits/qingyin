const app = getApp();

Page({
  data: {
    activeTab: 'export',
    journeys: [],
    tplStyle: 'receipt',
    tplTitle: '',
    tplPhotos: [],
    showReceipt: false,
    receiptTitle: '',
    receiptInfo: '',
    receiptCount: 0,
    receiptItems: []
  },

  onShow() {
    // 登录检查
    if (!app.requireLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadJourneys();
  },

  loadJourneys() {
    const data = app.globalData.appData;
    const checkins = data.checkins || [];
    const journeys = (data.journeys || []).map(j => {
      const ci = checkins.filter(c => c.journeyId === j.id).length;
      const pc = checkins.filter(c => c.journeyId === j.id && c.photo).length;
      const dc = j.days ? j.days.length : 0;
      const previewPhotos = [];
      if (j.coverPhoto) previewPhotos.push(j.coverPhoto);
      if (j.days) j.days.forEach(d => { if (d.photos) d.photos.forEach(p => previewPhotos.push(p)); });
      const thumbs = previewPhotos.slice(0, 4);
      return {
        ...j,
        dateRange: app.formatDateRange(j.startDate, j.endDate),
        dayCount: dc,
        checkinCount: ci,
        photoCount: pc,
        thumbs,
        moreCount: Math.max(0, previewPhotos.length - 4)
      };
    });
    this.setData({ journeys });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  selectStyle(e) {
    const style = e.currentTarget.dataset.style;
    if (style !== 'receipt') {
      wx.showToast({ title: '该风格即将上线', icon: 'none' });
      return;
    }
    this.setData({ tplStyle: style });
  },

  // 自定义模板
  onTplTitleInput(e) {
    this.setData({ tplTitle: e.detail.value });
  },

  addTplPhoto() {
    const that = this;
    wx.chooseImage({
      count: 9 - that.data.tplPhotos.length,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const newPhotos = res.tempFilePaths.map(src => ({
          src,
          text: '',
          place: '',
          date: ''
        }));
        that.setData({ tplPhotos: [...that.data.tplPhotos, ...newPhotos] });
      }
    });
  },

  removeTplPhoto(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.tplPhotos];
    photos.splice(index, 1);
    this.setData({ tplPhotos: photos });
  },

  onTplPhotoText(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.tplPhotos];
    photos[index].text = e.detail.value;
    this.setData({ tplPhotos: photos });
  },

  onTplPhotoPlace(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.tplPhotos];
    photos[index].place = e.detail.value;
    this.setData({ tplPhotos: photos });
  },

  onTplPhotoDate(e) {
    const index = e.currentTarget.dataset.index;
    const photos = [...this.data.tplPhotos];
    photos[index].date = e.detail.value;
    this.setData({ tplPhotos: photos });
  },

  // 日志导出
  exportJourney(e) {
    const id = e.currentTarget.dataset.id;
    const data = app.globalData.appData;
    const journey = data.journeys.find(j => j.id === id);
    if (!journey) {
      wx.showToast({ title: '旅程不存在', icon: 'error' });
      return;
    }
    wx.showToast({ title: '导出功能开发中...', icon: 'none' });
  },

  // 小票分享
  openReceipt(e) {
    const id = e.currentTarget.dataset.id;
    const data = app.globalData.appData;
    const journey = data.journeys.find(j => j.id === id);
    if (!journey) return;

    const checkins = data.checkins.filter(c => c.journeyId === id);
    let photoItems = [];
    checkins.filter(c => c.photo).forEach(c => {
      photoItems.push({
        img: c.photo,
        time: app.formatTime(c.createdAt) || '00:00',
        place: c.city || '',
        title: `PHOTO ${String(photoItems.length + 1).padStart(2, '0')}`,
        desc: c.note || c.place || '美好时刻'
      });
    });
    if (journey.days) journey.days.forEach(day => {
      if (day.photos) day.photos.forEach(p => {
        photoItems.push({
          img: p,
          time: app.formatDate(day.date) || '',
          place: day.title || '',
          title: `PHOTO ${String(photoItems.length + 1).padStart(2, '0')}`,
          desc: day.content ? day.content.slice(0, 30) : '美好时刻'
        });
      });
    });
    photoItems = photoItems.slice(0, 9);

    this.setData({
      showReceipt: true,
      receiptTitle: journey.name,
      receiptInfo: journey.city ? `${journey.city} · ${app.formatDateRange(journey.startDate, journey.endDate)}` : '',
      receiptCount: photoItems.length,
      receiptItems: photoItems
    });
  },

  // 自定义小票生成
  generateReceipt() {
    const { tplTitle, tplPhotos } = this.data;
    const customTitle = tplTitle.trim() || '这一段生活的小票';

    if (tplPhotos.length < 2) {
      wx.showToast({ title: '请至少添加2张图片', icon: 'error' });
      return;
    }

    const photoItems = tplPhotos.slice(0, 9).map((item, i) => ({
      img: item.src,
      time: item.date ? app.formatDateCN(item.date) : '',
      place: item.place || '',
      title: `PHOTO ${String(i + 1).padStart(2, '0')}`,
      desc: item.text || '美好的一刻'
    }));

    const places = photoItems.map(p => p.place).filter(Boolean);
    const info = places.length > 0 ? [...new Set(places)].join(' · ') : '';

    this.setData({
      showReceipt: true,
      receiptTitle: customTitle,
      receiptInfo: info,
      receiptCount: photoItems.length,
      receiptItems: photoItems
    });
  },

  closeReceipt() {
    this.setData({ showReceipt: false });
  },

  noop() {},

  saveReceipt() {
    wx.showToast({ title: '保存功能开发中...', icon: 'none' });
  }
});
