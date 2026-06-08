import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { callFunction } from '@/api/cloudbase'

interface AdminInfo {
  username: string
  role: string
  loginTime: string
}

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const adminInfo = ref<AdminInfo | null>(null)

  const username = computed(() => adminInfo.value?.username || '')

  function checkSession() {
    try {
      const stored = localStorage.getItem('admin_token')
      if (stored) {
        // 解码 base64 token 验证有效性
        const decoded = JSON.parse(atob(stored))
        if (decoded.username && decoded.loginTime) {
          // 检查 token 是否过期（7天）
          const tokenAge = Date.now() - new Date(decoded.loginTime).getTime()
          if (tokenAge < 7 * 24 * 3600 * 1000) {
            isLoggedIn.value = true
            adminInfo.value = {
              username: decoded.username,
              role: decoded.role || 'admin',
              loginTime: decoded.loginTime,
            }
            return true
          }
        }
        // Token 过期，清除
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
      }
    } catch (e) {
      console.error('Session check failed:', e)
    }
    isLoggedIn.value = false
    return false
  }

  async function login(username: string, password: string) {
    const data: any = await callFunction('admin-auth', {
      action: 'login',
      username,
      password,
    })

    // 存储 token 到 localStorage（用于持久化登录态）
    localStorage.setItem('admin_token', data.token)
    localStorage.setItem('admin_info', JSON.stringify({
      username: data.username,
      role: data.role || 'admin',
      loginTime: data.loginTime,
    }))

    adminInfo.value = {
      username: data.username,
      role: data.role || 'admin',
      loginTime: data.loginTime,
    }
    isLoggedIn.value = true

    return data
  }

  async function logout() {
    isLoggedIn.value = false
    adminInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_info')
  }

  return {
    isLoggedIn,
    adminInfo,
    username,
    checkSession,
    login,
    logout,
  }
})
