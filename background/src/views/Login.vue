<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-indigo-50">
    <div class="w-full max-w-md mx-4">
      <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
        <!-- Header -->
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-10 text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-2xl mb-4 backdrop-blur">
            <MapPin class="w-8 h-8 text-white" />
          </div>
          <h1 class="text-2xl font-bold text-white">轻印后台管理</h1>
          <p class="text-indigo-100 text-sm mt-1">旅行记忆管理系统</p>
        </div>

        <!-- Form -->
        <div class="px-8 py-8">
          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            @submit.prevent="handleLogin"
          >
            <el-form-item label="管理员账号" prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入管理员账号"
                :prefix-icon="User"
                size="large"
              />
            </el-form-item>

            <el-form-item label="密码" prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                :prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="w-full !bg-indigo-500 !border-indigo-500 hover:!bg-indigo-600 !rounded-lg !h-12 !text-base !font-medium"
                :loading="loading"
                @click="handleLogin"
              >
                {{ loading ? '登录中...' : '登 录' }}
              </el-button>
            </el-form-item>
          </el-form>

          <div v-if="errorMsg" class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle class="w-4 h-4 text-red-500 shrink-0" />
            <span class="text-sm text-red-600">{{ errorMsg }}</span>
          </div>
        </div>
      </div>

      <p class="text-center text-xs text-gray-400 mt-6">
        轻印 Admin System v1.0.0
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MapPin, User, Lock, AlertCircle } from 'lucide-vue-next'
import type { FormInstance, FormRules } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const errorMsg = ref('')

const form = reactive({
  username: '',
  password: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入管理员账号', trigger: 'blur' },
    { min: 3, max: 24, message: '账号长度为 3-24 位', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码不能少于 6 位', trigger: 'blur' },
  ],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  errorMsg.value = ''

  try {
    await authStore.login(form.username, form.password)
    router.push('/dashboard')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '登录失败，请检查账号密码'
    errorMsg.value = msg
  } finally {
    loading.value = false
  }
}
</script>
