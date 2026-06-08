const app = getApp();

Page({
  data: {
    profile: { name: '旅行者', bio: '探索世界，记录美好', avatar: '', initial: '旅' },
    journeyCount: 0,
    checkinCount: 0,
    photoCount: 0,
    provinceCount: 0,
    medalLitCount: 0,
    medalTotalCount: 34,
    insights: { monthly: '--', monthlySub: '', footprint: '--', footprintSub: '', season: '--', seasonSub: '', tags: '--', tagsSub: '' },
    showProfileModal: false,
    editProfile: { name: '', bio: '', avatar: '', initial: '旅' }
  },

  onShow() {
    // 登录检查
    if (!app.requireLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadProfile();
  },

  loadProfile() {
    const data = app.globalData.appData;
    const p = data.profile || { name: '旅行者', bio: '探索世界，记录美好', avatar: null };
    const journeys = data.journeys || [];
    const checkins = data.checkins || [];

    // 照片数：打卡照片 + 旅程封面 + 日记照片
    let photoCount = checkins.filter(c => c.photo).length;
    journeys.forEach(j => {
      if (j.coverPhoto) photoCount++;
      (j.days || []).forEach(d => { photoCount += (d.photos || []).length });
    });
    const provinces = new Set(checkins.map(c => c.province || c.city).filter(Boolean));

    const medals = app.globalData.provinceMedals || [];
    const litCount = medals.filter(m => m.lit).length;

    this.setData({
      profile: {
        name: p.name || '旅行者',
        bio: p.bio || '探索世界，记录美好',
        avatar: p.avatar || '',
        initial: (p.name || '旅').charAt(0)
      },
      journeyCount: journeys.length,
      checkinCount: checkins.length,
      photoCount,
      provinceCount: provinces.size,
      medalLitCount: litCount,
      medalTotalCount: medals.length || 34
    });

    this.updateInsights();
  },

  updateInsights() {
    const data = app.globalData.appData;
    const journeys = data.journeys || [];
    const checkins = data.checkins || [];
    const now = new Date();

    // 月度活跃
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth() + 1, label: `${d.getMonth() + 1}月`, count: 0 });
    }
    journeys.forEach(j => {
      if (!j.startDate) return;
      const start = new Date(j.startDate);
      const end = j.endDate ? new Date(j.endDate) : new Date(j.startDate);
      months.forEach(m => {
        const mStart = new Date(m.year, m.month - 1, 1);
        const mEnd = new Date(m.year, m.month, 0);
        if (start <= mEnd && end >= mStart) m.count++;
      });
    });
    checkins.forEach(c => {
      if (!c.createdAt) return;
      const cd = new Date(c.createdAt);
      months.forEach(m => {
        if (cd.getFullYear() === m.year && (cd.getMonth() + 1) === m.month) m.count++;
      });
    });
    const activeMonths = months.filter(m => m.count > 0).length;
    const maxCount = Math.max(1, ...months.map(m => m.count));

    // 足迹增长
    const footDays = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      footDays.push({ date: app.formatDate(d), count: 0 });
    }
    checkins.forEach(c => {
      if (!c.createdAt) return;
      const cd = app.formatDate(c.createdAt);
      const fd = footDays.find(f => f.date === cd);
      if (fd) fd.count++;
    });
    const totalRecent = footDays.reduce((s, f) => s + f.count, 0);
    const daysWithFootprint = footDays.filter(f => f.count > 0).length;

    // 季节分布
    const seasonCount = { spring: 0, summer: 0, autumn: 0, winter: 0 };
    const allDates = [];
    journeys.forEach(j => {
      if (j.startDate) allDates.push(new Date(j.startDate));
      if (j.endDate) allDates.push(new Date(j.endDate));
    });
    checkins.forEach(c => { if (c.createdAt) allDates.push(new Date(c.createdAt)); });
    allDates.forEach(d => {
      const m = d.getMonth() + 1;
      if (m >= 3 && m <= 5) seasonCount.spring++;
      else if (m >= 6 && m <= 8) seasonCount.summer++;
      else if (m >= 9 && m <= 11) seasonCount.autumn++;
      else seasonCount.winter++;
    });
    const totalSeason = seasonCount.spring + seasonCount.summer + seasonCount.autumn + seasonCount.winter || 1;
    const topSeason = Object.entries(seasonCount).sort((a, b) => b[1] - a[1])[0];
    const seasonNames = { spring: '🌸 春', summer: '☀️ 夏', autumn: '🍂 秋', winter: '❄️ 冬' };
    const pct = Math.round(topSeason[1] / totalSeason * 100);

    // 标签统计
    const tagMap = {};
    journeys.forEach(j => {
      if (j.city) {
        j.city.split(/[,，、]/).forEach(t => {
          const tag = t.trim();
          if (tag) tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
      }
    });
    const totalTags = Object.keys(tagMap).length;
    const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

    this.setData({
      insights: {
        monthly: `${activeMonths}/12 月`,
        monthlySub: `近12个月活跃${activeMonths}个月，最高${maxCount}次/月`,
        footprint: `${totalRecent} 个点`,
        footprintSub: `近12天新增足迹，覆盖${daysWithFootprint}天`,
        season: seasonNames[topSeason[0]] || '--',
        seasonSub: `偏好${seasonNames[topSeason[0]]}季（${pct}%）`,
        tags: `${totalTags} 个标签`,
        tagsSub: topTags.length > 0 ? `常用：${topTags.map(t => t[0]).join('、')}` : '暂无标签数据'
      }
    });
  },

  // 编辑资料
  openProfileModal() {
    const p = this.data.profile;
    this.setData({
      showProfileModal: true,
      editProfile: {
        name: p.name,
        bio: p.bio,
        avatar: p.avatar,
        initial: p.initial
      }
    });
  },

  closeProfileModal() {
    this.setData({ showProfileModal: false });
  },

  noop() {},

  onProfileField(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editProfile.${field}`]: e.detail.value });
  },

  chooseAvatar() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        that.setData({
          'editProfile.avatar': res.tempFilePaths[0]
        });
      }
    });
  },

  saveProfile() {
    const { editProfile } = this.data;
    const name = editProfile.name.trim() || '旅行者';
    const bio = editProfile.bio.trim() || '探索世界，记录美好';
    const avatar = editProfile.avatar || '';

    const data = app.globalData.appData;
    data.profile = { name, bio, avatar };
    app.saveData(data);

    this.setData({ showProfileModal: false });
    this.loadProfile();
    wx.showToast({ title: '资料已更新', icon: 'success' });
  },

  // 导航
  goMedals() {
    wx.navigateTo({ url: '/pages/medals/medals' });
  },

  goInsights() {
    wx.navigateTo({ url: '/pages/insights/insights' });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },

  switchToCheckin() {
    wx.switchTab({ url: '/pages/checkin/checkin' });
  },

  goFootprintReport() {
    wx.navigateTo({ url: '/pages/footprint-report/footprint-report' });
  },

  goAbout() {
    wx.showModal({
      title: '关于轻印',
      content: '轻印v2.1\nMap + Memory = 记录每一段旅程\n\n在地图上留下脚印，用照片和文字珍藏记忆。愿每一次出发，都能被温柔记录。\n\n© 2026 轻印团队',
      showCancel: false
    });
  },

  // 数据导入导出
  exportData() {
    const data = app.globalData.appData;
    const medals = app.globalData.provinceMedals || [];
    const exportObj = { ...data, medals };
    const jsonStr = JSON.stringify(exportObj, null, 2);

    wx.showToast({ title: '导出功能需在云函数中实现', icon: 'none' });
  },

  importData() {
    wx.showToast({ title: '导入功能需在云函数中实现', icon: 'none' });
  }
});
