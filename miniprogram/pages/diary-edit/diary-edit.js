const app = getApp()

Page({
  data: {
    journeyId: '',
    dayId: '',
    isEdit: false,
    saving: false,
    form: { date: '', title: '', content: '', photos: [] }
  },

  onLoad(options) {
    const { journeyId, dayId } = options
    const today = new Date().toISOString().slice(0, 10)
    this.setData({ journeyId })

    if (dayId) {
      const data = app.globalData.appData
      const journey = data.journeys.find(j => j.id === journeyId)
      if (journey) {
        const day = journey.days.find(d => d.id === dayId)
        if (day) {
          this.setData({
            dayId,
            isEdit: true,
            form: { date: day.date, title: day.title, content: day.content, photos: day.photos || [] }
          })
          return
        }
      }
    }
    this.setData({ 'form.date': today })
  },

  onField(e) {
    const { field } = e.currentTarget.dataset
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onDateChange(e) {
    this.setData({ 'form.date': e.detail.value })
  },

  choosePhotos() {
    const remain = 50 - this.data.form.photos.length
    if (remain <= 0) {
      wx.showToast({ title: '最多50张照片', icon: 'none' })
      return
    }
    wx.chooseImage({
      count: Math.min(remain, 9),
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ 'form.photos': [...this.data.form.photos, ...res.tempFilePaths] })
      }
    })
  },

  removePhoto(e) {
    const { index } = e.currentTarget.dataset
    const photos = [...this.data.form.photos]
    photos.splice(index, 1)
    this.setData({ 'form.photos': photos })
  },

  previewPhoto(e) {
    const { index } = e.currentTarget.dataset
    wx.previewImage({ urls: this.data.form.photos, current: this.data.form.photos[index] })
  },

  saveDay() {
    // 防重复点击
    if (this.data.saving) return

    const { form, journeyId, dayId } = this.data
    if (!form.date) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }

    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })

    const self = this
    wx.nextTick(() => {
      try {
        const data = app.globalData.appData
        const journey = data.journeys.find(j => j.id === journeyId)
        if (!journey) {
          wx.hideLoading()
          self.setData({ saving: false })
          return
        }

        if (dayId) {
          const idx = journey.days.findIndex(d => d.id === dayId)
          if (idx !== -1) {
            journey.days[idx] = { ...journey.days[idx], ...form }
          }
        } else {
          journey.days.push({
            id: app.generateId('d'),
            date: form.date,
            title: form.title.trim(),
            content: form.content.trim(),
            photos: form.photos
          })
        }
        // 按日期倒序
        journey.days.sort((a, b) => b.date.localeCompare(a.date))
        app.saveData()

        wx.hideLoading()
        wx.showToast({ title: '已保存', icon: 'success' })
        setTimeout(() => {
          self.setData({ saving: false })
          wx.navigateBack()
        }, 800)
      } catch (e) {
        console.error('saveDay error:', e)
        wx.hideLoading()
        self.setData({ saving: false })
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    })
  },

  goBack() {
    if (this.data.saving) return
    wx.navigateBack()
  }
})
