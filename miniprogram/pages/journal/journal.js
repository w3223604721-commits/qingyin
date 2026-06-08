const app = getApp()

Page({
  data: {
    journeys: [],
    filteredJourneys: [],
    searchQuery: '',
    showModal: false,
    showMenuModal: false,
    editingId: '',
    menuId: '',
    saving: false,
    form: { name: '', city: '', startDate: '', endDate: '', desc: '', coverPhoto: '' },
    app: app
  },

  onShow() {
    if (!app.requireLogin()) {
      wx.redirectTo({ url: '/pages/login/login' })
      return
    }
    this.loadJourneys()
  },

  loadJourneys() {
    const data = app.globalData.appData
    this.setData({ journeys: data.journeys || [] })
    this.applyFilter()
  },

  onSearchInput(e) { this.setData({ searchQuery: e.detail.value }); this.applyFilter() },
  clearSearch() { this.setData({ searchQuery: '' }); this.applyFilter() },

  applyFilter() {
    const q = (this.data.searchQuery || '').trim().toLowerCase()
    let list = this.data.journeys || []
    if (q) { list = list.filter(j => (j.name || '').toLowerCase().includes(q) || (j.city || '').toLowerCase().includes(q) || (j.desc || '').toLowerCase().includes(q)) }
    this.setData({ filteredJourneys: list })
  },

  openCreate() {
    this.setData({ showModal: true, editingId: '', saving: false, form: { name: '', city: '', startDate: '', endDate: '', desc: '', coverPhoto: '' } })
  },

  closeModal() { if (this.data.saving) return; this.setData({ showModal: false }) },
  onField(e) { const { field } = e.currentTarget.dataset; this.setData({ [`form.${field}`]: e.detail.value }) },
  onDateChange(e) { const { field } = e.currentTarget.dataset; this.setData({ [`form.${field}`]: e.detail.value }) },

  chooseCover() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => { this.setData({ 'form.coverPhoto': res.tempFilePaths[0] }) } })
  },

  saveJourney() {
    if (this.data.saving) return
    const { form, editingId } = this.data
    if (!form.name.trim()) { wx.showToast({ title: '请输入旅程名称', icon: 'none' }); return }
    this.setData({ saving: true })
    wx.showLoading({ title: '保存中...', mask: true })
    const self = this
    wx.nextTick(() => {
      try {
        const data = app.globalData.appData
        if (editingId) {
          const idx = data.journeys.findIndex(j => j.id === editingId)
          if (idx !== -1) { data.journeys[idx] = { ...data.journeys[idx], name: form.name.trim(), city: form.city.trim(), startDate: form.startDate, endDate: form.endDate, desc: form.desc.trim(), coverPhoto: form.coverPhoto } }
        } else {
          data.journeys.unshift({ id: app.generateId('j'), name: form.name.trim(), city: form.city.trim(), startDate: form.startDate, endDate: form.endDate, desc: form.desc.trim(), coverPhoto: form.coverPhoto, days: [], createdAt: new Date().toISOString() })
        }
        app.saveData(data)
        wx.hideLoading()
        self.setData({ showModal: false, saving: false })
        self.loadJourneys()
        wx.showToast({ title: editingId ? '已更新' : '旅程已创建', icon: 'success' })
      } catch (e) { wx.hideLoading(); self.setData({ saving: false }); wx.showToast({ title: '保存失败，请重试', icon: 'none' }) }
    })
  },

  showMenu(e) { this.setData({ showMenuModal: true, menuId: e.currentTarget.dataset.id }) },
  closeMenu() { this.setData({ showMenuModal: false }) },
  editJourney() {
    const journey = app.globalData.appData.journeys.find(j => j.id === this.data.menuId)
    if (journey) { this.setData({ showMenuModal: false, showModal: true, editingId: journey.id, form: { name: journey.name, city: journey.city, startDate: journey.startDate, endDate: journey.endDate, desc: journey.desc, coverPhoto: journey.coverPhoto } }) }
  },
  deleteJourney() {
    const id = this.data.menuId
    wx.showModal({ title: '确认删除', content: '删除后可在回收站恢复', success: (res) => {
      if (res.confirm) {
        const data = app.globalData.appData
        const idx = data.journeys.findIndex(j => j.id === id)
        if (idx !== -1) { const [removed] = data.journeys.splice(idx, 1); data.trash.push(removed); app.saveData(data); this.setData({ showMenuModal: false }); this.loadJourneys(); wx.showToast({ title: '已移入回收站', icon: 'success' }) }
      }
    }})
  },
  goDetail(e) { const { id } = e.currentTarget.dataset; wx.navigateTo({ url: `/pages/journey-detail/journey-detail?id=${id}` }) },
  noop() {}
})