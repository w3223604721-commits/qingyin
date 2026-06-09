<template>
  <div class="login-page">
    <!-- 顶部返回 -->
    <div class="top-bar">
      <button class="back-btn" @click="$router.back()">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span class="top-title">{{ currentView === 'login' ? '登录' : '注册' }}</span>
      <div style="width:22px"></div>
    </div>

    <!-- 品牌Logo区域：图标左 + 品牌名右 -->
    <div class="brand-area">
      <div class="brand-row">
        <!-- 足迹Logo图标 -->
        <svg class="brand-logo-icon" viewBox="0 0 64 64" fill="none">
          <!-- 左脚印 -->
          <g transform="translate(8,18) rotate(-15)">
            <ellipse cx="10" cy="22" rx="7" ry="11" fill="#4A90D9"/>
            <circle cx="5" cy="8" r="3.5" fill="#4A90D9"/>
            <circle cx="10" cy="5" r="3" fill="#4A90D9"/>
            <circle cx="15" cy="4" r="2.5" fill="#4A90D9"/>
          </g>
          <!-- 右脚印 -->
          <g transform="translate(30,12) rotate(15)">
            <ellipse cx="10" cy="24" rx="7" ry="11" fill="#5BA0E9"/>
            <circle cx="5" cy="9" r="3.5" fill="#5BA0E9"/>
            <circle cx="10" cy="6" r="3" fill="#5BA0E9"/>
            <circle cx="15" cy="5" r="2.5" fill="#5BA0E9"/>
          </g>
          <!-- 底部装饰弧线 -->
          <path d="M16 52 Q32 56 48 52" stroke="#4A90D9" stroke-width="2.5" stroke-linecap="round" fill="none"/>
        </svg>
        <h1 class="brand-name">轻印</h1>
      </div>
      <p class="brand-slogan">记录我的足迹</p>
    </div>

    <!-- 登录视图 -->
    <div v-if="currentView === 'login'" class="form-section">
      <div class="input-field">
        <input
          type="text"
          v-model="pwdForm.username"
          placeholder="请输入用户名或手机号"
          autocomplete="username"
        />
      </div>

      <div class="input-field">
        <input
          :type="showPwd ? 'text' : 'password'"
          v-model="pwdForm.password"
          placeholder="请输入密码"
          autocomplete="current-password"
        />
        <button class="eye-btn" @click="showPwd = !showPwd">
          <svg v-if="!showPwd" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>

      <button
        class="btn-submit"
        :disabled="!pwdForm.username || !pwdForm.password || loading"
        @click="handleLogin"
      >
        {{ loading ? '登录中...' : '登录' }}
      </button>

      <div class="action-links">
        <span class="link-text">忘记密码</span>
        <span class="link-text link-green" @click="switchTo('register')">创建账号</span>
      </div>

      <div class="agreement-row">
        <label class="checkbox-wrap">
          <input type="checkbox" v-model="agreed" />
          <span class="custom-check"></span>
        </label>
        <p class="agree-text">
          已阅读并同意<span class="link-inline" @click.stop="$router.push('/agreement')">《轻印用户协议》</span>和<span class="link-inline" @click.stop="$router.push('/privacy')">《轻印隐私声明》</span>
        </p>
      </div>

      <!-- 第三方登录 -->
      <div class="social-login">
        <div class="social-icons">
          <button class="social-btn idcard">
            <span>身份<br/>认证</span>
          </button>
          <button class="social-btn alipay">
            <svg viewBox="0 0 1024 1024" width="24" height="24" fill="#1677FF"><path d="M661.333 618.667c-53.333 17.066-112 37.333-160 58.666-42.667 19.2-78.933 42.667-98.133 64-25.6 29.867-23.467 57.6-10.667 74.667 14.933 19.2 49.067 27.733 89.6 17.067 51.2-12.8 91.733-55.467 106.667-104.534 8.533-29.866 10.666-70.4 10.666-96v-13.866l61.867-23.467c0 85.333-4.266 147.2-29.866 196.267-25.6 49.066-72.534 83.2-138.667 93.866-59.733 10.667-115.2-4.266-142.933-40.533-29.867-38.4-27.734-93.867 6.4-136.533 29.866-36.267 81.066-66.134 145.066-91.734 42.667-17.066 87.467-32 128-44.8l32-10.666zM512 85.333c235.647 0 426.667 191.02 426.667 426.667S747.647 938.667 512 938.667 85.333 747.647 85.333 512 276.353 85.333 512 85.333z"/></svg>
          </button>
          <button class="social-btn wechat">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="#07C160"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.139.045c.134 0 .24-.111.24-.246 0-.06-.023-.118-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088-.182-.013-.365-.027-.555-.034h-.351zm-2.77 2.875c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982z"/></svg>
          </button>
          <button class="social-btn weibo">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#E6162D"><path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zm-1.409-6.996c-2.082.207-3.643 1.673-3.487 3.273.155 1.6 1.957 2.73 4.038 2.524 2.079-.206 3.64-1.672 3.484-3.272-.154-1.601-1.956-2.731-4.035-2.525zm1.09 3.945c-.418.166-.92.007-1.121-.356-.198-.361-.063-.802.303-1.001.417-.222.908-.073 1.113.292.199.364.068.812-.295 1.065zm.856-1.576c-.165.084-.37.028-.458-.124-.086-.153-.036-.344.111-.428.164-.086.37-.03.458.123.087.152.036.344-.111.429zM17.1 12.62c-.393-.117-.66-.195-.456-.703.44-1.107.486-2.063.009-2.742-.888-1.27-3.315-1.204-6.083-.034 0 0-.871.38-.649-.308.427-1.37.363-2.518-.301-3.179-1.509-1.505.137-4.39 3.316-5.944 3.012-1.516 6.63-1.693 9.255-.596 3.318 1.39 4.197 5.022 2.918 8.537-.095.256-.017.402.208.335l-.217.134z"/></svg>
          </button>
          <button class="social-btn qq">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#12B7F5"><path d="M12.003 2c-2.265 0-6.29 1.364-6.29 7.325v1.195S3.55 14.96 3.55 17.474c0 .665.17 1.025.281 1.025.114 0 .897-.432 1.746-1.83.011.032.021.063.033.094-.228 1.395-.07 2.68.434 3.622.05.094.103.184.158.272-.514.216-1.122.54-1.122.828 0 .414.983.414.983.414s-.514.414-.514.71c0 .413.985.29.985.29s-.456.47.028.71c.514.264 1.745-.234 2.316-.832.514.148 1.143.245 1.914.245 1.186 0 2.093-.264 2.738-.623.6.568 1.746 1.025 2.232.776.484-.24.028-.71.028-.71s.985.123.985-.29c0-.296-.514-.71-.514-.71s.983 0 .983-.414c0-.305-.657-.64-1.172-.85.06-.093.116-.188.169-.29.504-.94.66-2.225.433-3.618.012-.032.023-.065.035-.098.848 1.398 1.632 1.83 1.746 1.83.111 0 .281-.36.281-1.025 0-2.514-2.163-6.954-2.163-6.954V9.325C18.293 3.364 14.268 2 12.003 2z"/></svg>
          </button>
          <button class="social-btn apple">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#000"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.08zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- 注册视图 -->
    <div v-if="currentView === 'register'" class="form-section">
      <div class="input-field">
        <input
          type="text"
          v-model="regForm.username"
          placeholder="请设置用户名（5-24位字母/数字/下划线）"
          autocomplete="username"
        />
      </div>

      <div class="input-field">
        <input
          type="tel"
          v-model="regForm.phone"
          placeholder="请输入手机号（选填）"
          autocomplete="tel"
        />
      </div>

      <div class="input-field">
        <input
          :type="showRegPwd ? 'text' : 'password'"
          v-model="regForm.password"
          placeholder="请设置密码（至少6位）"
          autocomplete="new-password"
        />
        <button class="eye-btn" @click="showRegPwd = !showRegPwd">
          <svg v-if="!showRegPwd" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
          <svg v-else viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#999" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
        </button>
      </div>

      <button
        class="btn-submit"
        :disabled="!regForm.username || !regForm.password || regForm.password.length < 6 || loading"
        @click="handleRegister"
      >
        {{ loading ? '注册中...' : '注册并登录' }}
      </button>

      <div class="action-links">
        <span></span>
        <span class="link-text link-green" @click="switchTo('login')">已有账号？去登录</span>
      </div>

      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
    </div>

    <p v-if="errorMsg && currentView === 'login'" class="error-msg">{{ errorMsg }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const currentView = ref<'login' | 'register'>('login')
const loading = ref(false)
const errorMsg = ref('')
const showPwd = ref(false)
const showRegPwd = ref(false)
const agreed = ref(true)

// 密码表单
const pwdForm = ref({ username: '', password: '' })

// 注册表单
const regForm = ref({ username: '', phone: '', password: '' })

function switchTo(view: 'login' | 'register') {
  currentView.value = view
  errorMsg.value = ''
}

// ── API 配置（部署后替换为实际 Worker 地址）──
const API_BASE = (import.meta.env.VITE_API_URL || 'https://qingyin-api.w3223604721.workers.dev').replace(/\/$/, '')

async function api(path: string, body?: object) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function handleLogin() {
  const { username, password } = pwdForm.value
  if (!username || !password) return

  if (!agreed.value) {
    errorMsg.value = '请先阅读并同意用户协议和隐私声明'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await api('/api/login', { username, password })
    if (data.ok) {
      localStorage.setItem('qingyin_token', data.token)
      localStorage.setItem('qingyin_user', JSON.stringify(data.user))
      router.replace('/journal')
    } else {
      errorMsg.value = data.error || '用户名或密码错误'
    }
  } catch {
    errorMsg.value = '网络连接失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const { username, phone, password } = regForm.value
  if (!username || !password) return
  if (username.length < 5 || username.length > 24) {
    errorMsg.value = '用户名需要5-24位'
    return
  }
  if (password.length < 6) {
    errorMsg.value = '密码至少需要6位'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const data = await api('/api/register', { username, phone: phone || null, password })
    if (data.ok) {
      localStorage.setItem('qingyin_token', data.token)
      localStorage.setItem('qingyin_user', JSON.stringify(data.user))
      router.replace('/journal')
    } else {
      errorMsg.value = data.error || '注册失败，用户名可能已存在'
    }
  } catch {
    errorMsg.value = '网络连接失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #FFFFFF;
  padding: 0 28px;
  display: flex;
  flex-direction: column;
}

/* ── 顶部导航 ── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: max(12px, env(safe-area-inset-top));
  margin-bottom: 24px;
}
.back-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}
.top-title {
  font-size: 17px;
  font-weight: 600;
  color: #333;
  font-family: -apple-system, 'SF Pro Text', sans-serif;
}

/* ── 品牌 Logo ── */
.brand-area {
  text-align: center;
  padding: 32px 0 36px;
}
.brand-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}
.brand-logo-icon {
  width: 56px;
  height: 56px;
}
.brand-name {
  font-size: 30px;
  font-weight: 700;
  color: #4A90D9;
  letter-spacing: 6px;
  font-family: 'PingFang SC', 'Noto Sans SC', sans-serif;
}
.brand-slogan {
  margin-top: 6px;
  font-size: 13px;
  color: #AAA;
  letter-spacing: 2px;
}

/* ── 表单区域 ── */
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-field {
  position: relative;
  margin-bottom: 18px;
}
.input-field input {
  width: 100%;
  height: 48px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: #F5F6FA;
  font-size: 15px;
  color: #333;
  outline: none;
  box-sizing: border-box;
  transition: box-shadow 0.2s;
  font-family: inherit;
}
.input-field input::placeholder {
  color: #BBB;
}
.input-field input:focus {
  box-shadow: 0 0 0 2px rgba(74, 144, 217, 0.2);
  background: #fff;
}

.eye-btn {
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

/* ── 提交按钮 ── */
.btn-submit {
  width: 100%;
  height: 48px;
  border: none;
  border-radius: 24px;
  background: linear-gradient(135deg, #5BA0E9 0%, #4A90D9 100%);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.2s, transform 0.1s;
  font-family: inherit;
}
.btn-submit:hover:not(:disabled) {
  opacity: 0.9;
}
.btn-submit:active:not(:disabled) {
  transform: scale(0.98);
}
.btn-submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* ── 操作链接 ── */
.action-links {
  display: flex;
  justify-content: space-between;
  margin-top: 18px;
  padding: 0 4px;
}
.link-text {
  font-size: 14px;
  color: #999;
  cursor: pointer;
}
.link-green {
  color: #4A90D9;
}

/* ── 协议勾选 ── */
.agreement-row {
  display: flex;
  align-items: flex-start;
  margin-top: 20px;
  gap: 8px;
  padding: 0 4px;
}
.checkbox-wrap {
  position: relative;
  flex-shrink: 0;
  margin-top: 2px;
}
.checkbox-wrap input {
  position: absolute;
  opacity: 0;
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.custom-check {
  display: block;
  width: 16px;
  height: 16px;
  border: 1.5px solid #CCC;
  border-radius: 3px;
  transition: all 0.15s;
}
.checkbox-wrap input:checked + .custom-check {
  background: #4A90D9;
  border-color: #4A90D9;
}
.checkbox-wrap input:checked + .custom-check::after {
  content: '';
  position: absolute;
  left: 4.5px;
  top: 1.5px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
.agree-text {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
  flex: 1;
}
.link-inline {
  color: #4A90D9;
  cursor: pointer;
}

/* ── 第三方登录 ── */
.social-login {
  margin-top: auto;
  padding-bottom: max(32px, env(safe-area-inset-bottom) + 20px);
}
.social-icons {
  display: flex;
  justify-content: center;
  gap: 28px;
  padding: 16px 0 0;
}
.social-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  transition: transform 0.15s, background-color 0.15s;
}
.social-btn:active {
  transform: scale(0.92);
}
.social-btn.idcard {
  background: linear-gradient(135deg, #E74C3C, #C0392B);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.2;
  text-align: center;
  width: auto;
  padding: 0 10px;
  border-radius: 8px;
  height: 36px;
}
.social-btn.alipay {
  background: #EBF4FF;
}
.social-btn.wechat {
  background: #EDFAF1;
}
.social-btn.weibo {
  background: #FDEEEE;
}
.social-btn.qq {
  background: #EAF6FF;
}
.social-btn.apple {
  background: #F5F5F5;
}

/* ── 错误提示 ── */
.error-msg {
  margin-top: 16px;
  padding: 10px 16px;
  background: #FFF0F0;
  color: #E74C3C;
  border-radius: 10px;
  font-size: 13px;
  text-align: center;
  line-height: 1.4;
}
</style>
