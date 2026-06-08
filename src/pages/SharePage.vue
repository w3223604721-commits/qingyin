<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-6">
      <h1 class="text-3xl font-bold text-white">分享旅行</h1>
      <p class="text-white/70 text-sm mt-1">生成你的专属旅行记忆</p>
    </div>

    <!-- 分享方式 Tab -->
    <div class="flex bg-white border-b border-gray-100 sticky top-0 z-10">
      <button
        v-for="tab in shareTabs"
        :key="tab.key"
        class="flex-1 py-3 text-sm font-medium transition-colors relative"
        :class="activeTab === tab.key ? 'text-indigo-600' : 'text-gray-400'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <div v-if="activeTab === tab.key" class="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-indigo-600 rounded-full" />
      </button>
    </div>

    <!-- 旅程选择 -->
    <div class="px-4 py-4">
      <p class="text-sm text-gray-500 mb-3">选择要分享的旅程</p>

      <div v-if="journeys.length === 0" class="empty-state">
        <span class="empty-state-icon">📔</span>
        <p class="empty-state-text">还没有旅行日志</p>
      </div>

      <div v-else class="grid grid-cols-2 gap-3">
        <div
          v-for="j in journeys"
          :key="j.id"
          class="card p-3 cursor-pointer border-2 transition-colors relative"
          :class="selectedJourneyId === j.id ? 'border-indigo-500 bg-indigo-50' : 'border-transparent'"
          @click="selectJourney(j.id)"
        >
          <div v-if="j.coverPhoto" class="h-24 rounded-xl overflow-hidden mb-2 bg-gray-100">
            <img :src="j.coverPhoto" class="w-full h-full object-cover" alt="" />
          </div>
          <div v-else class="h-24 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
            <span class="text-3xl">✈️</span>
          </div>
          <p class="text-sm font-medium text-gray-900 truncate">{{ j.name }}</p>
          <p class="text-xs text-gray-400">{{ j.city }}</p>
          <div v-if="selectedJourneyId === j.id" class="absolute top-2 right-2 w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
            <span class="text-white text-xs">✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览区 -->
    <div v-if="selectedJourney" class="px-4 pb-6">
      <p class="text-sm text-gray-500 mb-3">预览效果</p>

      <!-- 小票风格 -->
      <div v-if="activeTab === 'receipt'" class="card p-6" style="background:#FFFBEB;font-family:'Courier New',monospace;">
        <div class="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
          <p class="text-xl font-bold text-gray-800">轻印</p>
          <p class="text-xs text-gray-500 mt-1">旅行记忆小票</p>
          <p class="text-xs text-gray-400 mt-0.5">{{ new Date().toLocaleDateString('zh-CN') }}</p>
        </div>
        <div class="space-y-2 text-sm text-gray-700">
          <div class="flex justify-between">
            <span>目的地</span>
            <span class="font-bold">{{ selectedJourney.name }}</span>
          </div>
          <div class="flex justify-between">
            <span>城市</span>
            <span>{{ selectedJourney.city || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>日期</span>
            <span>{{ selectedJourney.startDate || '-' }} ~ {{ selectedJourney.endDate || '-' }}</span>
          </div>
          <div class="flex justify-between">
            <span>天数</span>
            <span>{{ (selectedJourney.days || []).length }} 天</span>
          </div>
          <div class="flex justify-between">
            <span>照片</span>
            <span>{{ getPhotoCount(selectedJourney) }} 张</span>
          </div>
        </div>
        <div class="text-center border-t-2 border-dashed border-gray-300 pt-4 mt-4">
          <p class="text-xs text-gray-400">感谢使用 轻印</p>
          <p class="text-xs text-gray-400">qingyin.app</p>
        </div>
      </div>

      <!-- 卡片风格 -->
      <div v-if="activeTab === 'card'" class="card overflow-hidden">
        <div v-if="selectedJourney.coverPhoto" class="h-48 overflow-hidden">
          <img :src="selectedJourney.coverPhoto" class="w-full h-full object-cover" alt="" />
        </div>
        <div v-else class="h-36 gradient-primary flex items-center justify-center">
          <span class="text-5xl">✈️</span>
        </div>
        <div class="p-5">
          <h3 class="text-xl font-bold text-gray-900">{{ selectedJourney.name }}</h3>
          <p class="text-sm text-gray-500 mt-1">{{ selectedJourney.city }} · {{ selectedJourney.startDate }} ~ {{ selectedJourney.endDate }}</p>
          <p v-if="selectedJourney.desc" class="text-sm text-gray-600 mt-3">{{ selectedJourney.desc }}</p>
          <div class="flex gap-3 mt-4 text-xs text-gray-400">
            <span>📅 {{ (selectedJourney.days || []).length }} 天</span>
            <span>📸 {{ getPhotoCount(selectedJourney) }} 张</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 导出按钮 -->
    <div class="px-4 pb-20" v-if="selectedJourney">
      <button class="w-full py-3.5 rounded-full gradient-primary text-white font-semibold text-base"
        @click="exportImage">
        导出图片
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'qingyin_data'

interface Journey {
  id: string
  name: string
  city: string
  startDate: string
  endDate: string
  desc: string
  coverPhoto: string
  tags: string[]
  days: { photos: string[] }[]
}

const journeys = ref<Journey[]>([])
const selectedJourneyId = ref('')
const activeTab = ref('receipt')

const shareTabs = [
  { key: 'receipt', label: '小票风格' },
  { key: 'card', label: '卡片风格' },
]

const selectedJourney = computed(() =>
  journeys.value.find(j => j.id === selectedJourneyId.value) || null
)

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const data = JSON.parse(raw)
      journeys.value = data.journeys || []
    } catch { /* ignore */ }
  }
}

function selectJourney(id: string) {
  selectedJourneyId.value = selectedJourneyId.value === id ? '' : id
}

function getPhotoCount(j: Journey) {
  let count = j.coverPhoto ? 1 : 0
  ;(j.days || []).forEach(d => { count += (d.photos || []).length })
  return count
}

function exportImage() {
  alert('导出功能开发中，敬请期待！\n\n提示：可通过截图保存当前预览效果。')
}

onMounted(loadData)
</script>
