const app = getApp();

Page({
  data: {
    litCount: 0,
    totalCount: 34,
    percent: 0,
    filter: 'all',
    displayMedals: []
  },

  onShow() {
    this.loadMedals();
  },

  loadMedals() {
    const medals = app.globalData.provinceMedals || [];
    const litCount = medals.filter(m => m.lit).length;
    const totalCount = medals.length || 34;
    const percent = Math.round(litCount / totalCount * 100);

    this.setData({
      litCount,
      totalCount,
      percent
    });

    this.filterMedals(this.data.filter);
  },

  setFilter(e) {
    const filter = e.currentTarget.dataset.filter;
    this.setData({ filter });
    this.filterMedals(filter);
  },

  filterMedals(filter) {
    const medals = app.globalData.provinceMedals || [];
    let display = [...medals];

    if (filter === 'lit') display = medals.filter(m => m.lit);
    else if (filter === 'unlit') display = medals.filter(m => !m.lit);

    this.setData({ displayMedals: display });
  },

  goBack() {
    wx.navigateBack();
  }
});
