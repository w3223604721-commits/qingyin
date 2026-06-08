Component({
  properties: {
    selected: {
      type: Number,
      value: 0
    }
  },
  data: {
    list: [
      { pagePath: '/pages/journal/journal', text: '📔 日志', key: 'journal' },
      { pagePath: '/pages/checkin/checkin', text: '📍 打卡', key: 'checkin' },
      { pagePath: '/pages/share/share', text: '📤 分享', key: 'share' },
      { pagePath: '/pages/profile/profile', text: '👤 我的', key: 'profile' }
    ]
  },
  methods: {
    switchTab(e) {
      const index = e.currentTarget.dataset.index;
      const url = this.data.list[index].pagePath;
      wx.switchTab({ url });
    }
  }
});
