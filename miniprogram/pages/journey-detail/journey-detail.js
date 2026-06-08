const app = getApp()

Page({
  data: {
    journeyId: '',
    journey: { name: '', city: '', startDate: '', endDate: '', desc: '', coverPhoto: '', days: [] },
    sortedDays: [],
    carouselPhotos: [],
    carouselLabels: [],
    carouselIndex: 0,
    app: app
  },

  onLoad(options) {
    const id = options.id
    this.setData({ journeyId: id })
    this.loadJourney()
  },

  onShow() {
    if (this.data.journeyId) this.loadJourney()
  },

  loadJourney() {
    const data = app.globalData.appData
    const journey = data.journeys.find(j => j.id === this.data.journeyId)
    if (!journey) {
      wx.showToast({ title: '旅程不存在', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1000)
      return
    }
    // 按日期排序
    const sortedDays = [...journey.days].sort((a, b) => b.date.localeCompare(a.date))
    // 收集所有照片用于轮播
    const carouselPhotos = []
    const carouselLabels = []
    sortedDays.forEach(d => {
      if (d.photos && d.photos.length) {
        d.photos.forEach(p => {
          carouselPhotos.push(p)
          carouselLabels.push(d.title || app.formatDate(d.date))
        })
      }
    })
    this.setData({ journey, sortedDays, carouselPhotos, carouselLabels })
  },

  onSwiperChange(e) {
    this.setData({ carouselIndex: e.detail.current })
  },

  onSwiperAnimationFinish(e) {
    // 用户手动滑动后同步索引（与 bindchange 配合确保状态一致）
    this.setData({ carouselIndex: e.detail.current })
  },

  // ====== 日记操作 ======
  addDay() {
    wx.navigateTo({ url: `/pages/diary-edit/diary-edit?journeyId=${this.data.journeyId}` })
  },

  editDay(e) {
    const { id } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/diary-edit/diary-edit?journeyId=${this.data.journeyId}&dayId=${id}` })
  },

  deleteDay(e) {
    const { id } = e.currentTarget.dataset
    wx.showModal({
      title: '删除日记',
      content: '确定删除这篇日记吗？',
      success: (res) => {
        if (res.confirm) {
          const data = app.globalData.appData
          const journey = data.journeys.find(j => j.id === this.data.journeyId)
          if (journey) {
            journey.days = journey.days.filter(d => d.id !== id)
            app.saveData()
            this.loadJourney()
            wx.showToast({ title: '已删除', icon: 'success' })
          }
        }
      }
    })
  },

  previewDayPhotos(e) {
    const { photos, current } = e.currentTarget.dataset
    wx.previewImage({ urls: photos, current: photos[current] || photos[0] })
  },

  goBack() { wx.navigateBack() }
})
