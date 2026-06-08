<template>
  <div class="login-page">
    <!-- 背景装饰 -->
    <div class="login-bg">
      <div class="bg-circle bg-circle-1"></div>
      <div class="bg-circle bg-circle-2"></div>
    </div>

    <div class="login-container">
      <!-- Logo -->
      <div class="login-brand">
        <span class="brand-icon">✈️</span>
        <h1 class="brand-name">轻印</h1>
        <p class="brand-desc">旅行记忆 · 记录每一段旅程</p>
      </div>

      <!-- Tab 切换 -->
      <div class="login-tabs">
        <button
          class="tab-btn"
          :class="{ active: loginMode === 'phone' }"
          @click="switchMode('phone')"
        >手机号登录</button>
        <button
          class="tab-btn"
          :class="{ active: loginMode === 'password' }"
          @click="switchMode('password')"
        >账号密码</button>
      </div>

      <!-- 手机号验证码登录 -->
      <div v-if="loginMode === 'phone'" class="login-form">
        <div class="input-group">
          <label class="input-label">手机号</label>
          <input
            class="form-input-lg"
            type="tel"
            maxlength="11"
            v-model="phoneForm.phone"
            placeholder="请输入手机号"
          />
        </div>

        <div class="input-group">
          <label class="input-label">验证码</label>
          <div class="code-row">
            <input
              class="form-input-lg code-input"
              type="text"
              maxlength="6"
              v-model="phoneForm.code"
              placeholder="请输入验证码"
            />
            <button
              class="btn-send-code"
              :disabled="codeSending || !isValidPhone"
              @click="sendCode"
            >
              {{ codeSending ? `${countdown}s` : '获取验证码' }}
            </button>
          </div>
        </div>

        <button
          class="btn-login"
          :disabled="!phoneForm.phone || !phoneForm.code || loading"
          @click="handlePhoneLogin"
        >
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </div>

      <!-- 用户名密码登录 -->
      <div v-if="loginMode === 'password'" class="login-form">
        <div class="input-group">
          <label class="input-label">用户名</label>
          <input
            class="form-input-lg"
            type="text"
            v-model="pwdForm.username"
            placeholder="请输入用户名（5-24位字母/数字/下划线）"
          />
        </div>

        <div class="input-group">
          <label class="input-label">密码</label>
          <div class="pwd-wrap">
            <input
              class="form-input-lg pwd-input"
              :type="showPwd ? 'text' : 'password'"
              v-model="pwdForm.password"
              placeholder="请输入密码"
            />
            <button class="pwd-toggle" @click="showPwd = !showPwd">
              {{ showPwd ? '🙈' : '👁️' }}
            </button>
          </div>
        </div>

        <div class="login-actions">
          <button
            class="btn-login"
            :disabled="!pwdForm.username || !pwdForm.password || loading"
            @click="handlePwdLogin"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
          <button class="btn-register-link" @click="showRegister = true">
            没有账号？去注册
          </button>
        </div>
      </div>

      <!-- 注册弹窗 -->
      <div v-if="showRegister" class="modal-mask" @click.self="showRegister = false">
        <div class="modal-content register-modal">
          <h3 class="modal-title">创建账号</h3>

          <div class="input-group">
            <label class="input-label">用户名（5-24位字母/数字/下划线）</label>
            <input
              class="form-input-lg"
              type="text"
              v-model="regForm.username"
              placeholder="请设置用户名"
            />
          </div>
          <div class="input-group">
            <label class="input-label">密码</label>
            <input
              class="form-input-lg"
              type="password"
              v-model="regForm.password"
              placeholder="请设置密码（至少6位）"
            />
          </div>

          <div class="flex gap-3 mt-4">
            <button class="btn-cancel flex-1" @click="showRegister = false">取消</button>
            <button
              class="btn-login flex-1"
              :disabled="!regForm.username || !regForm.password || loading"
              @click="handleRegister"
            >
              {{ loading ? '注册中...' : '注册并登录' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 错误提示 -->
      <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>

      <!-- 协议 -->
      <p class="agreement-text">
        登录即表示您已同意
        <span class="link">《轻印用户协议》</span>和<span class="link">《轻印隐私声明》</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { phoneLogin, passwordLogin, usernameRegister } from '../utils/cloudbase'

const router = useRouter()

const loginMode = ref<'phone' | 'password'>('phone')
const loading = ref(false)
const errorMsg = ref('')
const showPwd = ref(false)
const showRegister = ref(false)

// 手机号表单
const phoneForm = ref({ phone: '', code: '' })
const codeSending = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null
let verifyOtpFn: ((params: { token: string }) => Promise<unknown>) | null = null

const isValidPhone = computed(() => /^1\d{10}$/.test(phoneForm.value.phone))

// 密码表单
const pwdForm = ref({ username: '', password: '' })

// 注册表单
const regForm = ref({ username: '', password: '' })

function switchMode(mode: 'phone' | 'password') {
  loginMode.value = mode
  errorMsg.value = ''
}

// ── 手机验证码登录 ──
async function sendCode() {
  if (!isValidPhone.value) return
  codeSending.value = true
  errorMsg.value = ''

  try {
    const data = await phoneLogin(phoneForm.value.phone)
    verifyOtpFn = data.verifyOtp as (params: { token: string }) => Promise<unknown>

    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(countdownTimer!)
        codeSending.value = false
      }
    }, 1000)
  } catch (e: unknown) {
    codeSending.value = false
    errorMsg.value = e instanceof Error ? e.message : '发送验证码失败'
  }
}

async function handlePhoneLogin() {
  if (!verifyOtpFn) {
    errorMsg.value = '请先获取验证码'
    return
  }
  loading.value = true
  errorMsg.value = ''

  try {
    await verifyOtpFn({ token: phoneForm.value.code })
    // 登录成功 → 同步本地数据并跳转
    router.replace('/journal')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '验证码错误，请重试'
  } finally {
    loading.value = false
  }
}

// ── 用户名密码登录 ──
async function handlePwdLogin() {
  loading.value = true
  errorMsg.value = ''

  try {
    await passwordLogin(pwdForm.value.username, pwdForm.value.password)
    router.replace('/journal')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '用户名或密码错误'
  } finally {
    loading.value = false
  }
}

// ── 注册 ──
async function handleRegister() {
  const { username, password } = regForm.value
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
    await usernameRegister(username, password, username)
    showRegister.value = false
    router.replace('/journal')
  } catch (e: unknown) {
    errorMsg.value = e instanceof Error ? e.message : '注册失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  position: relative;
  overflow: hidden;
}
.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.bg-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
}
.bg-circle-1 {
  width: 300px; height: 300px;
  top: -100px; left: -80px;
}
.bg-circle-2 {
  width: 200px; height: 200px;
  bottom: -60px; right: -60px;
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  padding: 0 24px;
}

.login-brand {
  text-align: center;
  margin-bottom: 36px;
}
.brand-icon { font-size: 48px; display: block; margin-bottom: 8px; }
.brand-name {
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 4px;
}
.brand-desc {
  font-size: 14px;
  color: rgba(255,255,255,0.7);
  margin-top: 6px;
}

.login-tabs {
  display: flex;
  background: rgba(255,255,255,0.15);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}
.tab-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.7);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn.active {
  background: #fff;
  color: #667eea;
}

.login-form {
  background: rgba(255,255,255,0.95);
  border-radius: 16px;
  padding: 24px;
}

.input-group { margin-bottom: 16px; }
.input-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
}

.form-input-lg {
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  color: #1e293b;
  background: #f8fafc;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-input-lg:focus {
  border-color: #667eea;
  background: #fff;
}

.code-row {
  display: flex;
  gap: 10px;
}
.code-input { flex: 1; }
.btn-send-code {
  flex-shrink: 0;
  padding: 0 16px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.btn-send-code:disabled {
  background: #cbd5e1;
  cursor: not-allowed;
}

.pwd-wrap {
  position: relative;
}
.pwd-input { flex: 1; }
.pwd-toggle {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
}

.btn-login {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: opacity 0.2s;
}
.btn-login:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-login:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-cancel {
  padding: 14px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.login-actions {
  margin-top: 8px;
}
.btn-register-link {
  display: block;
  width: 100%;
  padding: 12px 0;
  background: none;
  border: none;
  color: #667eea;
  font-size: 14px;
  cursor: pointer;
}

.error-msg {
  margin-top: 16px;
  padding: 10px 16px;
  background: rgba(254,226,226,0.9);
  color: #dc2626;
  border-radius: 10px;
  font-size: 13px;
  text-align: center;
}

.agreement-text {
  text-align: center;
  color: rgba(255,255,255,0.6);
  font-size: 12px;
  margin-top: 24px;
}
.link { color: rgba(255,255,255,0.9); text-decoration: underline; cursor: pointer; }

/* 注册弹窗 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 24px;
}
.modal-content {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  width: 100%;
  max-width: 400px;
}
.register-modal {
  max-width: 360px;
}
.modal-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 20px;
  text-align: center;
}

.flex { display: flex; }
.gap-3 { gap: 12px; }
.flex-1 { flex: 1; }
.mt-4 { margin-top: 16px; }
</style>
