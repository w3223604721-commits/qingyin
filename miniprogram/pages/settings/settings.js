const app = getApp();

Page({
  data: {
    showAccount: false,
    showTrash: false,
    showPermissions: false,
    showFeedback: false,
    deviceId: '',
    createdTime: '',
    trashItems: [],
    feedbackTypes: ['功能建议', 'Bug报告', '使用问题', '其他'],
    feedbackType: '功能建议',
    feedbackContent: '',
    feedbackContact: '',
    // 权限状态列表
    permissions: [
      { key: 'scope.userLocation', name: '📍 位置信息', desc: '用于打卡记录定位和足迹追踪', granted: false, denied: false },
      { key: 'scope.camera', name: '📸 相机', desc: '用于拍摄打卡照片和旅程封面', granted: false, denied: false },
      { key: 'scope.writePhotosAlbum', name: '🖼️ 保存到相册', desc: '用于导出分享图片到相册', granted: false, denied: false },
      { key: 'scope.record', name: '🎤 录音', desc: '用于未来语音笔记功能', granted: false, denied: false },
      { key: 'scope.userInfo', name: '👤 用户信息', desc: '获取微信昵称和头像', granted: false, denied: false },
    ],
  },

  onShow() {
    if (!app.requireLogin()) {
      wx.navigateBack();
      return;
    }
    this.loadData();
  },

  loadData() {
    const data = app.globalData.appData;
    const trash = (data.trash || []).map(item => ({
      ...item,
      deletedAt: item.deletedAt ? app.formatDate(item.deletedAt) : ''
    }));

    let createdTime = '';
    if (data.journeys && data.journeys.length > 0) {
      const last = data.journeys[data.journeys.length - 1];
      createdTime = app.formatDate(last.createdAt);
    } else {
      createdTime = app.formatDate(new Date().toISOString());
    }

    this.setData({ trashItems: trash, createdTime });
  },

  goBack() {
    wx.navigateBack();
  },

  // 账号与安全
  openAccount() {
    let deviceId = wx.getStorageSync('qingyin_device_id');
    if (!deviceId) {
      deviceId = 'DEV_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      wx.setStorageSync('qingyin_device_id', deviceId);
    }
    this.setData({ showAccount: true, deviceId });
  },

  // 回收站
  openTrash() {
    this.loadData();
    this.setData({ showTrash: true });
  },

  restoreTrash(e) {
    const index = e.currentTarget.dataset.index;
    const data = app.globalData.appData;
    const item = data.trash[index];
    if (!item) return;

    delete item.type;
    delete item.deletedAt;
    data.journeys.push(item);
    data.trash.splice(index, 1);
    app.saveData(data);
    this.loadData();
    wx.showToast({ title: '已恢复旅程', icon: 'success' });
  },

  permanentDelete(e) {
    const index = e.currentTarget.dataset.index;
    const that = this;
    wx.showModal({
      title: '确认删除',
      content: '永久删除此旅程？不可恢复',
      success(res) {
        if (!res.confirm) return;
        const data = app.globalData.appData;
        data.trash.splice(index, 1);
        app.saveData(data);
        that.loadData();
        wx.showToast({ title: '已永久删除', icon: 'success' });
      }
    });
  },

  // ── 权限管理（增强版）──
  openPermissions() {
    this.queryPermissionStatus();
    this.setData({ showPermissions: true });
  },

  // 查询真实权限状态
  queryPermissionStatus() {
    const that = this;
    wx.getSetting({
      success(res) {
        const authSetting = res.authSetting;
        const updatedPermissions = that.data.permissions.map(p => ({
          ...p,
          granted: authSetting[p.key] === true,
          denied: authSetting[p.key] === false,
        }));
        that.setData({ permissions: updatedPermissions });
      },
      fail() {
        // 降级：使用现有数据
      }
    });
  },

  // 切换权限（请求或打开设置）
  togglePermission(e) {
    const key = e.currentTarget.dataset.key;
    const perm = this.data.permissions.find(p => p.key === key);
    if (!perm) return;

    if (perm.granted) {
      // 已授权 → 引导用户去设置页关闭
      wx.showModal({
        title: '管理权限',
        content: `已授权「${perm.name}」权限。如需关闭，请前往系统设置。`,
        confirmText: '去设置',
        success(res) {
          if (res.confirm) wx.openSetting();
        }
      });
      return;
    }

    // 未授权 → 请求授权
    const that = this;
    wx.authorize({ scope: key })
      .then(() => {
        wx.showToast({ title: '权限已开启', icon: 'success' });
        that.queryPermissionStatus();
      })
      .catch((err) => {
        console.error('授权失败:', err);
        // 引导去设置页
        wx.showModal({
          title: '需要授权',
          content: `「${perm.name}」权限被拒绝。请在设置中手动开启。`,
          confirmText: '去设置',
          success(res) {
            if (res.confirm) wx.openSetting();
          }
        });
        that.queryPermissionStatus();
      });
  },

  resetPermission(e) {
    const key = e.currentTarget.dataset.key;
    const perm = this.data.permissions.find(p => p.key === key);
    if (!perm) return;

    wx.showModal({
      title: '重置权限',
      content: `确定要重置「${perm.name}」权限吗？下次使用时会重新询问。`,
      confirmText: '去设置管理',
      success(res) {
        if (res.confirm) wx.openSetting();
      }
    });
  },

  // 打开系统设置
  openSystemSetting() {
    wx.openSetting();
  },

  // 反馈
  openFeedback() {
    this.setData({
      showFeedback: true,
      feedbackType: '功能建议',
      feedbackContent: '',
      feedbackContact: ''
    });
  },

  onFeedbackType(e) {
    this.setData({ feedbackType: this.data.feedbackTypes[e.detail.value] });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackContent: e.detail.value });
  },

  onFeedbackContact(e) {
    this.setData({ feedbackContact: e.detail.value });
  },

  async submitFeedback() {
    if (!this.data.feedbackContent.trim()) {
      wx.showToast({ title: '请输入反馈内容', icon: 'error' });
      return;
    }
    try {
      // 保存到本地
      const data = app.globalData.appData;
      if (!data.feedbacks) data.feedbacks = [];
      data.feedbacks.push({
        id: 'fb_' + Date.now(),
        type: this.data.feedbackType,
        content: this.data.feedbackContent.trim(),
        contact: this.data.feedbackContact.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending'
      });
      app.saveData(data);

      // 同步到云端
      try {
        await wx.cloud.callFunction({
          name: 'qingyin-admin',
          data: {
            action: 'syncFeedback',
            data: {
              type: this.data.feedbackType,
              content: this.data.feedbackContent.trim(),
              contact: this.data.feedbackContact.trim(),
            }
          }
        });
      } catch (cloudErr) {
        console.warn('云端反馈同步失败（本地已保存）:', cloudErr);
      }

      wx.showToast({ title: '感谢你的反馈！我们会尽快处理 🙏', icon: 'success' });
      this.setData({ feedbackContent: '', feedbackContact: '' });
    } catch (err) {
      console.error('提交反馈失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'error' });
    }
  },

  // 版本信息
  showVersion() {
    wx.showModal({
      title: '关于轻印',
      content: '轻印 v2.0.0\nBuild 2026.06\n\nMap + Memory = 记录每一段旅程\n\n愿每一次出发，都能被温柔记录。',
      showCancel: false
    });
  },

  // 清除所有数据
  clearAllData() {
    const that = this;
    wx.showModal({
      title: '⚠️ 警告',
      content: '确定要清除所有数据吗？此操作不可恢复！',
      success(res) {
        if (!res.confirm) return;
        wx.showModal({
          title: '再次确认',
          content: '所有旅程、打卡、日记将被永久删除！',
          success(res2) {
            if (!res2.confirm) return;
            wx.removeStorageSync('qingyin_data');
            wx.removeStorageSync('qingyin_medals');
            app.globalData.appData = {
              journeys: [],
              checkins: [],
              footprintTracks: [],
              profile: { name: '旅行者', bio: '探索世界，记录美好', avatar: null },
              currentJourneyId: null,
              trash: [],
              carouselIndex: {}
            };
            app.globalData.provinceMedals = [];
            app.saveMedals();
            that.loadData();
            wx.showToast({ title: '所有数据已清除', icon: 'success' });
          }
        });
      }
    });
  },

  closeSubPage() {
    this.setData({
      showAccount: false,
      showTrash: false,
      showPermissions: false,
      showFeedback: false
    });
  }
});
