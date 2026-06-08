const app = getApp();

Page({
  data: {
    activeTab: 'monthly',
    monthlyData: [],
    monthlyMax: 0,
    footprintData: [],
    footprintTotal: 0,
    seasonData: [],
    topSeason: '--',
    topSeasonPct: 0,
    tagData: []
  },

  onShow() {
    this.loadInsights();
    this.switchTab({ currentTarget: { dataset: { tab: this.data.activeTab } } });
  },

  loadInsights() {
    const data = app.globalData.appData;
    const journeys = data.journeys || [];
    const checkins = data.checkins || [];
    const now = new Date();

    // 月度活跃数据
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: `${d.getMonth() + 1}月`, count: 0, year: d.getFullYear(), month: d.getMonth() + 1 });
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
    const maxCount = Math.max(1, ...months.map(m => m.count));
    const monthlyData = months.map(m => ({ ...m, pct: Math.round(m.count / maxCount * 100) }));

    // 足迹增长
    const footDays = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      footDays.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, date: app.formatDate(d), count: 0 });
    }
    checkins.forEach(c => {
      if (!c.createdAt) return;
      const cd = app.formatDate(c.createdAt);
      const fd = footDays.find(f => f.date === cd);
      if (fd) fd.count++;
    });
    const footprintMax = Math.max(1, ...footDays.map(f => f.count));
    const footprintData = footDays.map(f => ({ ...f, pct: Math.round(f.count / footprintMax * 100) }));
    const footprintTotal = footDays.reduce((s, f) => s + f.count, 0);

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
    const totalSeason = Object.values(seasonCount).reduce((a, b) => a + b, 0) || 1;
    const topEntry = Object.entries(seasonCount).sort((a, b) => b[1] - a[1])[0];
    const seasonNames = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
    const seasonIcons = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
    const seasonData = Object.entries(seasonCount).map(([key, count]) => ({
      name: seasonNames[key],
      icon: seasonIcons[key],
      count,
      pct: Math.round(count / totalSeason * 100)
    }));

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
    const tagEntries = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
    const tagMax = Math.max(1, ...tagEntries.map(([, c]) => c));
    const tagData = tagEntries.map(([name, count]) => ({ name, count, pct: Math.round(count / tagMax * 100) }));

    this.setData({
      monthlyData,
      monthlyMax: maxCount,
      footprintData,
      footprintTotal,
      seasonData,
      topSeason: `${seasonIcons[topEntry[0]]} ${seasonNames[topEntry[0]]}`,
      topSeasonPct: Math.round(topEntry[1] / totalSeason * 100),
      tagData
    });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  goBack() {
    wx.navigateBack();
  }
});