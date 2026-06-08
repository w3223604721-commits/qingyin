<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-10">
      <div class="flex items-center gap-4">
        <div
          class="w-16 h-16 rounded-full border-2 border-white/30 overflow-hidden bg-white/10 flex items-center justify-center cursor-pointer"
          @click="pickAvatar"
        >
          <img v-if="profile.avatar" :src="profile.avatar" class="w-full h-full object-cover" alt="" />
          <span v-else class="text-3xl text-white">👤</span>
        </div>
        <div class="flex-1 min-w-0">
          <h2 class="text-xl font-bold text-white truncate">{{ profile.name }}</h2>
          <p class="text-white/70 text-sm truncate">{{ profile.bio }}</p>
          <span class="inline-block mt-1.5 px-2.5 py-0.5 bg-white/20 rounded-full text-white text-xs">
            {{ personality.emoji }} {{ personality.type }}
          </span>
        </div>
        <button class="text-white/80 text-sm border border-white/30 rounded-full px-3 py-1.5"
          @click="showEditModal = true">编辑</button>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="px-4 -mt-6">
      <div class="card px-5 py-4">
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.journeys }}</p>
            <p class="text-xs text-gray-400 mt-1">旅行日志</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.checkins }}</p>
            <p class="text-xs text-gray-400 mt-1">打卡记录</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.provinces }}</p>
            <p class="text-xs text-gray-400 mt-1">省份探索</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-gray-900">{{ stats.photos }}</p>
            <p class="text-xs text-gray-400 mt-1">旅行照片</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 菜单 -->
    <div class="px-4 mt-5 space-y-2">
      <div class="card px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-50"
        @click="goFootprintReport">
        <div class="flex items-center gap-3">
          <span class="text-2xl">📊</span>
          <span class="text-base text-gray-900">足迹报告</span>
        </div>
        <span class="text-gray-300 text-lg">›</span>
      </div>

      <div class="card px-5 py-4 flex items-center justify-between cursor-pointer active:bg-gray-50"
        @click="goSettings">
        <div class="flex items-center gap-3">
          <span class="text-2xl">⚙️</span>
          <span class="text-base text-gray-900">设置</span>
        </div>
        <span class="text-gray-300 text-lg">›</span>
      </div>
    </div>

    <!-- 关于 -->
    <div class="px-4 mt-8 mb-4 text-center">
      <p class="text-xs text-gray-300">轻印 v1.0 · Powered by CloudBase</p>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="modal-mask" @click.self="closeEditModal">
      <div class="modal-content">
        <h3 class="text-lg font-semibold mb-5">编辑资料</h3>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">昵称</label>
            <input class="form-input" v-model="editForm.name" placeholder="你的昵称" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">简介</label>
            <textarea class="form-textarea" v-model="editForm.bio" placeholder="介绍你自己..." />
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium"
            @click="closeEditModal">取消</button>
          <button class="flex-1 py-3 rounded-full gradient-primary text-white font-medium"
            @click="saveProfile">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const STORAGE_KEY = 'qingyin_data'

interface Profile {
  name: string
  bio: string
  avatar: string
}

const profile = ref<Profile>({ name: '旅行者', bio: '探索世界，记录美好', avatar: '' })
const stats = ref({ journeys: 0, checkins: 0, provinces: 0, photos: 0 })
const showEditModal = ref(false)
const editForm = ref({ name: '', bio: '' })

const personality = computed(() => {
  const { journeys, checkins, provinces } = stats.value
  if (journeys >= 10 && provinces >= 10) return { type: '旅行大师', emoji: '🌍' }
  if (checkins >= 50) return { type: '打卡达人', emoji: '📍' }
  if (journeys >= 5) return { type: '背包客', emoji: '🎒' }
  return { type: '城市漫游者', emoji: '🏙️' }
})

function loadProfile() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    const journeys = data.journeys || []
    const checkins = data.checkins || []

    const provinceSet = new Set<string>()
    checkins.forEach((c: { province: string }) => { if (c.province) provinceSet.add(c.province) })

    let photos = 0
    journeys.forEach((j: { coverPhoto: string; days: { photos: string[] }[] }) => {
      if (j.coverPhoto) photos++
      ;(j.days || []).forEach((d: { photos: string[] }) => { photos += (d.photos || []).length })
    })
    checkins.forEach((c: { photo: string }) => { if (c.photo) photos++ })

    profile.value = data.profile || { name: '旅行者', bio: '探索世界，记录美好', avatar: '' }
    stats.value = {
      journeys: journeys.length,
      checkins: checkins.length,
      provinces: provinceSet.size,
      photos,
    }
  } catch { /* ignore */ }
}

// 全局数据缓存，避免每次saveData都重新读取解析
let cachedData: any = null

function saveData(updatedProfile?: Profile) {
  if (!cachedData) {
    const raw = localStorage.getItem(STORAGE_KEY)
    cachedData = raw ? JSON.parse(raw) : {}
  }
  if (updatedProfile) cachedData.profile = updatedProfile
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData))
}

function pickAvatar() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        profile.value.avatar = reader.result as string
        saveData(profile.value)
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

function saveProfile() {
  profile.value.name = editForm.value.name || '旅行者'
  profile.value.bio = editForm.value.bio || '探索世界，记录美好'
  saveData(profile.value)
  showEditModal.value = false
}

function closeEditModal() {
  showEditModal.value = false
}

function goFootprintReport() {
  router.push('/footprint-report')
}
function goSettings() {
  router.push('/settings')
}

onMounted(() => {
  loadProfile()
})
</script>
