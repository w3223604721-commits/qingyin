<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-10">
      <div class="flex items-center gap-3">
        <button class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
          @click="$router.back()">
          <span class="text-white text-lg">←</span>
        </button>
        <h1 class="text-2xl font-bold text-white">设置</h1>
      </div>
    </div>

    <!-- 账号信息 -->
    <div class="px-4 mt-5">
      <h3 class="text-sm font-semibold text-gray-400 uppercase mb-2">账号</h3>
      <div class="card px-5 py-4 mb-2">
        <div class="settings-row" @click="showAccountInfo = !showAccountInfo">
          <div class="settings-row-info">
            <span class="settings-row-icon">👤</span>
            <div>
              <p class="settings-row-label">账号信息</p>
              <p class="settings-row-desc">{{ userDisplay || '未登录' }}</p>
            </div>
          </div>
          <span class="menu-arrow">›</span>
        </div>

        <div v-if="showAccountInfo" class="account-detail">
          <div class="detail-item">
            <span class="detail-label">用户 ID</span>
            <span class="detail-value text-xs font-mono">{{ userId || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">登录方式</span>
            <span class="detail-value">{{ loginType || '-' }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">存储方式</span>
            <span class="detail-value">本地存储 + 云端同步</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限管理 -->
    <div class="px-4 mt-5">
      <h3 class="text-sm font-semibold text-gray-400 uppercase mb-2">权限管理</h3>
      <div class="card">
        <div
          v-for="perm in permissions"
          :key="perm.key"
          class="perm-row"
        >
          <div class="perm-info">
            <span class="perm-icon">{{ perm.icon }}</span>
            <div>
              <p class="perm-name">{{ perm.name }}</p>
              <p class="perm-desc">{{ getPermStatusText(perm) }}</p>
            </div>
          </div>
          <label class="toggle">
            <input
              type="checkbox"
              :checked="perm.granted"
              @change="togglePermission(perm)"
            />
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>
      <p class="perm-hint">
        💡 权限开关可随时在浏览器设置中管理。某些权限可能需要重新加载页面后生效。
      </p>
    </div>

    <!-- 通用 -->
    <div class="px-4 mt-5">
      <h3 class="text-sm font-semibold text-gray-400 uppercase mb-2">通用</h3>
      <div class="card">
        <div class="settings-row" @click="showFeedback = !showFeedback">
          <div class="settings-row-info">
            <span class="settings-row-icon">💬</span>
            <div>
              <p class="settings-row-label">开发者反馈</p>
              <p class="settings-row-desc">问题反馈和功能建议</p>
            </div>
          </div>
          <span class="menu-arrow">›</span>
        </div>

        <div v-if="showFeedback" class="feedback-form">
          <div class="form-group">
            <label class="form-label">反馈类型</label>
            <select v-model="feedbackType" class="form-select">
              <option value="功能建议">功能建议</option>
              <option value="Bug报告">Bug报告</option>
              <option value="使用问题">使用问题</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">反馈内容 <span class="text-red-400">*</span></label>
            <textarea v-model="feedbackContent" class="form-textarea" placeholder="请详细描述你的问题或建议..."
              maxlength="500" rows="4"></textarea>
            <p class="form-hint">{{ feedbackContent.length }}/500</p>
          </div>
          <div class="form-group">
            <label class="form-label">联系方式（选填）</label>
            <input v-model="feedbackContact" class="form-input" placeholder="手机号或微信号，方便我们联系你" />
          </div>
          <button class="btn-submit" @click="submitFeedback" :disabled="submitting">
            {{ submitting ? '提交中...' : '提交反馈' }}
          </button>
          <p v-if="feedbackSuccess" class="feedback-success">✅ 感谢你的反馈！我们会尽快处理 🙏</p>
        </div>

        <div class="settings-row" @click="showVersion">
          <div class="settings-row-info">
            <span class="settings-row-icon">ℹ️</span>
            <div>
              <p class="settings-row-label">版本信息</p>
              <p class="settings-row-desc">v2.0.0 Build 2026.06</p>
            </div>
          </div>
          <span class="menu-arrow">›</span>
        </div>

        <div class="settings-row danger-row" @click="clearAllData">
          <div class="settings-row-info">
            <span class="settings-row-icon">⚠️</span>
            <div>
              <p class="settings-row-label text-red-500">清除所有数据</p>
              <p class="settings-row-desc">此操作不可恢复</p>
            </div>
          </div>
          <span class="menu-arrow">›</span>
        </div>
      </div>
    </div>

    <!-- 退出登录 -->
    <div class="px-4 mt-5" v-if="isLoggedIn">
      <button class="btn-logout" @click="handleLogout">退出登录</button>
    </div>

    <div class="px-4 mt-8 mb-4 text-center">
      <p class="text-xs text-gray-300">轻印 v2.0 · Powered by CloudBase</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { checkLogin, logout, getCurrentUser, app } from '../utils/cloudbase'

const router = useRouter()

const isLoggedIn = ref(false)
const userId = ref('')
const userDisplay = ref('')
const loginType = ref('')
const showAccountInfo = ref(false)

// 反馈表单
const showFeedback = ref(false)
const feedbackType = ref('功能建议')
const feedbackContent = ref('')
const feedbackContact = ref('')
const submitting = ref(false)
const feedbackSuccess = ref(false)

// 权限列表
interface PermissionItem {
  key: string
  name: string
  icon: string
  apiName: PermissionName | null
  granted: boolean
  denied: boolean
}

const permissions = reactive<PermissionItem[]>([
  { key: 'location', name: '位置信息', icon: '📍', apiName: 'geolocation', granted: false, denied: false },
  { key: 'camera', name: '相机', icon: '📸', apiName: 'camera', granted: false, denied: false },
  { key: 'microphone', name: '麦克风', icon: '🎤', apiName: 'microphone', granted: false, denied: false },
  { key: 'notifications', name: '通知', icon: '🔔', apiName: 'notifications', granted: false, denied: false },
  { key: 'clipboard', name: '剪贴板', icon: '📋', apiName: 'clipboard-read' as PermissionName, granted: false, denied: false },
])

function getPermStatusText(perm: PermissionItem): string {
  if (perm.granted) return '已授权'
  if (perm.denied) return '已拒绝'
  return '未请求'
}

async function queryPermissions() {
  if (!navigator.permissions) return

  for (const perm of permissions) {
    if (!perm.apiName) continue
    try {
      const result = await navigator.permissions.query({ name: perm.apiName })
      perm.granted = result.state === 'granted'
      perm.denied = result.state === 'denied'
      // 监听变化
      result.addEventListener('change', () => {
        perm.granted = result.state === 'granted'
        perm.denied = result.state === 'denied'
      })
    } catch {
      // 某些权限可能不被浏览器支持
    }
  }

  // 地理位置单独检测（使用 Permissions API 可能不支持，用 getCurrentPosition 探测）
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      () => {
        const p = permissions.find(x => x.key === 'location')
        if (p) { p.granted = true; p.denied = false }
      },
      (err) => {
        const p = permissions.find(x => x.key === 'location')
        if (p) {
          if (err.code === 1) { p.granted = false; p.denied = true }
        }
      }
    )
  }
}

async function togglePermission(perm: PermissionItem) {
  if (perm.granted) {
    // 已授权 → 无法直接通过代码撤销，引导用户去浏览器设置
    alert(`请在浏览器设置中管理"${perm.name}"权限。\n\nChrome: 地址栏左侧锁图标 → 网站设置\nEdge: 地址栏左侧锁图标 → 此网站的权限`)
    return
  }

  // 尝试请求权限
  try {
    switch (perm.key) {
      case 'location':
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            () => {
              perm.granted = true
              perm.denied = false
            },
            () => {
              perm.denied = true
              perm.granted = false
            }
          )
        }
        break
      case 'camera':
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true })
          stream.getTracks().forEach(t => t.stop())
          perm.granted = true
          perm.denied = false
        }
        break
      case 'microphone':
        if (navigator.mediaDevices?.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          stream.getTracks().forEach(t => t.stop())
          perm.granted = true
          perm.denied = false
        }
        break
      case 'notifications':
        if ('Notification' in window) {
          const result = await Notification.requestPermission()
          perm.granted = result === 'granted'
          perm.denied = result === 'denied'
        }
        break
      case 'clipboard':
        try {
          await navigator.clipboard.readText()
          perm.granted = true
          perm.denied = false
        } catch {
          perm.denied = true
          perm.granted = false
        }
        break
    }
  } catch {
    perm.denied = true
    perm.granted = false
  }
}

async function loadUserInfo() {
  const result = await checkLogin()
  isLoggedIn.value = result.isLoggedIn
  if (result.user) {
    userId.value = result.user.id || ''
    userDisplay.value = result.user.user_metadata?.nickName || result.user.user_metadata?.username || result.user.phone || '已登录'
    if (result.user.phone) {
      loginType.value = '手机号'
    } else if (result.user.user_metadata?.username) {
      loginType.value = '用户名密码'
    } else {
      loginType.value = 'CloudBase 登录'
    }
  }
}

function showVersion() {
  alert('轻印 v2.0.0\nBuild 2026.06\n\nMap + Memory = 记录每一段旅程\n\n愿每一次出发，都能被温柔记录。')
}

function clearAllData() {
  if (!confirm('⚠️ 警告：确定要清除所有数据吗？此操作不可恢复！')) return
  if (!confirm('再次确认：所有旅程、打卡、日记将被永久删除！')) return
  localStorage.removeItem('qingyin_data')
  alert('所有数据已清除')
  window.location.reload()
}

async function submitFeedback() {
  if (!feedbackContent.value.trim()) {
    alert('请输入反馈内容')
    return
  }
  submitting.value = true
  try {
    // 保存到本地
    const data = JSON.parse(localStorage.getItem('qingyin_data') || '{}')
    if (!data.feedbacks) data.feedbacks = []
    data.feedbacks.push({
      id: 'fb_' + Date.now(),
      type: feedbackType.value,
      content: feedbackContent.value.trim(),
      contact: feedbackContact.value.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending'
    })
    localStorage.setItem('qingyin_data', JSON.stringify(data))

    // 同步到云端
    try {
      const user = await checkLogin()
      await app.callFunction({
        name: 'qingyin-admin',
        data: {
          action: 'syncFeedback',
          data: {
            type: feedbackType.value,
            content: feedbackContent.value.trim(),
            contact: feedbackContact.value.trim(),
            nickname: user.user?.user_metadata?.nickName || userDisplay.value || '',
            userId: user.user?.id || ''
          }
        }
      })
    } catch (cloudErr) {
      console.warn('云端反馈同步失败（本地已保存）:', cloudErr)
    }

    feedbackSuccess.value = true
    feedbackContent.value = ''
    feedbackContact.value = ''
    setTimeout(() => { feedbackSuccess.value = false }, 4000)
  } catch (err) {
    console.error('提交反馈失败:', err)
    alert('提交失败，请重试')
  } finally {
    submitting.value = false
  }
}

async function handleLogout() {
  if (!confirm('确定退出登录？')) return
  try {
    await logout()
    router.replace('/login')
  } catch (e) {
    alert('退出登录失败')
  }
}

onMounted(() => {
  loadUserInfo()
  queryPermissions()
})
</script>

<style scoped>
.flex { display: flex; }
.items-center { align-items: center; }
.gap-3 { gap: 12px; }

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.15s;
}
.settings-row:last-child { border-bottom: none; }
.settings-row:active { background: #f8fafc; margin: 0 -20px; padding: 14px 20px; }
.settings-row-info {
  display: flex;
  align-items: center;
  gap: 14px;
}
.settings-row-icon { font-size: 22px; }
.settings-row-label { font-size: 15px; font-weight: 500; color: #1e293b; }
.settings-row-desc { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.menu-arrow { font-size: 22px; color: #cbd5e1; }

/* 账号详情 */
.account-detail {
  padding: 12px 0 16px 52px;
  border-top: 1px solid #f1f5f9;
}
.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
}
.detail-label { font-size: 13px; color: #64748b; }
.detail-value { font-size: 13px; color: #1e293b; font-weight: 500; }

/* 权限行 */
.perm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid #f1f5f9;
}
.perm-row:last-child { border-bottom: none; }
.perm-info {
  display: flex;
  align-items: center;
  gap: 12px;
}
.perm-icon { font-size: 22px; }
.perm-name { font-size: 15px; font-weight: 500; color: #1e293b; }
.perm-desc { font-size: 12px; color: #94a3b8; margin-top: 2px; }

/* Toggle 开关 */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 28px;
  cursor: pointer;
}
.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}
.toggle-slider {
  position: absolute;
  inset: 0;
  background: #cbd5e1;
  border-radius: 28px;
  transition: background 0.25s;
}
.toggle-slider::before {
  content: '';
  position: absolute;
  height: 22px;
  width: 22px;
  left: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.25s;
}
.toggle input:checked + .toggle-slider {
  background: #667eea;
}
.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.perm-hint {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 12px;
  line-height: 1.5;
}

/* 退出登录 */
.btn-logout {
  width: 100%;
  padding: 14px;
  border: 1.5px solid #ef4444;
  color: #ef4444;
  background: #fff;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-logout:hover {
  background: #fef2f2;
}

.danger-row {
  cursor: pointer;
}
.danger-row .settings-row-label {
  color: #ef4444;
}

/* 反馈表单 */
.feedback-form {
  padding: 0 0 16px 52px;
  border-top: 1px solid #f1f5f9;
}

.form-group { margin-top: 12px; }
.form-label { font-size: 13px; color: #475569; font-weight: 500; display: block; margin-bottom: 6px; }

.form-select, .form-input, .form-textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  color: #334155;
  background: #f8fafc;
  outline: none;
  box-sizing: border-box;
}
.form-select:focus, .form-input:focus, .form-textarea:focus {
  border-color: #818cf8; background: #fff;
}
.form-textarea { resize: vertical; min-height: 80px; }
.form-hint { font-size: 11px; color: #cbd5e1; text-align: right; margin: 4px 0 0; }

.btn-submit {
  width: 100%;
  padding: 12px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-top: 14px;
}
.btn-submit:hover:not(:disabled) { background: #4f46e5; }
.btn-submit:disabled { background: #c7d2fe; cursor: not-allowed; }

.feedback-success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #10b981;
  font-weight: 500;
}
</style>
