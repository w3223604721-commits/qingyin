<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-10">
      <h1 class="text-3xl font-bold text-white">旅行日志</h1>
      <p class="text-white/70 text-sm mt-1">记录你的每一次旅程</p>
    </div>

    <!-- 搜索栏 -->
    <div class="px-4 -mt-6 relative z-10">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input
          class="search-input"
          v-model="searchQuery"
          placeholder="搜索旅程名称、城市、描述..."
          @input="onSearch"
        />
        <button v-if="searchQuery" class="search-clear" @click="clearSearch">✕</button>
      </div>
    </div>

    <!-- 旅程列表 -->
    <div class="px-4 py-4">
      <!-- 搜索无结果 -->
      <div v-if="filteredJourneys.length === 0 && journeys.length > 0" class="empty-state">
        <span class="empty-state-icon">🔍</span>
        <p class="empty-state-text">未找到匹配的旅程</p>
        <p class="text-xs text-gray-400 mt-1">尝试更换关键词</p>
      </div>
      <!-- 空状态 -->
      <div v-else-if="journeys.length === 0" class="empty-state">
        <span class="empty-state-icon">🗺️</span>
        <p class="empty-state-text">还没有旅行日志</p>
        <p class="text-xs text-gray-400 mt-1">点击右下角 + 开始记录</p>
      </div>

      <!-- 旅程卡片 -->
      <div
        v-for="journey in filteredJourneys"
        :key="journey.id"
        class="card mb-4 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
        @click="goDetail(journey.id)"
      >
        <!-- 封面 -->
        <div v-if="journey.coverPhoto" class="h-40 overflow-hidden">
          <img :src="journey.coverPhoto" class="w-full h-full object-cover" alt="" />
        </div>
        <div v-else class="h-32 gradient-primary flex items-center justify-center">
          <span class="text-5xl">✈️</span>
        </div>

        <div class="p-4">
          <div class="flex items-start justify-between mb-2">
            <div class="flex-1 min-w-0">
              <h3 class="text-lg font-semibold text-gray-900 truncate">{{ journey.name }}</h3>
              <p class="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <span>📍</span>
                <span>{{ journey.city || '未知城市' }}</span>
              </p>
            </div>
            <div class="flex gap-1 ml-2">
              <button class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm hover:bg-gray-200"
                @click.stop="editJourney(journey)">✏️</button>
              <button class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-sm hover:bg-red-100"
                @click.stop="deleteJourney(journey)">🗑️</button>
            </div>
          </div>

          <!-- 日期 -->
          <p class="text-xs text-gray-400 mb-2">
            {{ formatDate(journey.startDate) }} - {{ formatDate(journey.endDate) }}
          </p>

          <!-- 描述 -->
          <p v-if="journey.desc" class="text-sm text-gray-600 mb-3 line-clamp-2">{{ journey.desc }}</p>

          <!-- 标签 -->
          <div v-if="journey.tags?.length" class="flex flex-wrap gap-1 mb-3">
            <span v-for="tag in journey.tags" :key="tag" class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">
              {{ tag }}
            </span>
          </div>

          <!-- 统计 -->
          <div class="flex gap-4 text-xs text-gray-400 pt-2 border-t border-gray-50">
            <span>📅 {{ (journey.days || []).length }} 天</span>
            <span>📸 {{ getPhotoCount(journey) }} 张照片</span>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="showCreateModal = true">+</button>

    <!-- 创建/编辑弹窗 -->
    <div v-if="showCreateModal" class="modal-mask" @click.self="closeModal">
      <div class="modal-content" @click.stop>
        <h3 class="text-lg font-semibold mb-5">{{ editingJourney ? '编辑旅程' : '创建新旅程' }}</h3>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">旅程名称 *</label>
            <input class="form-input" v-model="form.name" placeholder="如：夏日冲绳之旅" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">城市</label>
            <input class="form-input" v-model="form.city" placeholder="如：冲绳" />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="text-sm font-medium text-gray-700 mb-1 block">开始日期</label>
              <input class="form-input w-full" type="date" v-model="form.startDate" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 mb-1 block">结束日期</label>
              <input class="form-input w-full" type="date" v-model="form.endDate" />
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">描述</label>
            <textarea class="form-textarea" v-model="form.desc" placeholder="记录这次旅行的故事..." />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">标签（逗号分隔）</label>
            <input class="form-input" v-model="form.tagsStr" placeholder="如：海滩,美食,自驾" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">封面照片</label>
            <div class="flex items-center gap-3">
              <div v-if="form.coverPhoto" class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                <img :src="form.coverPhoto" class="w-full h-full object-cover" alt="" />
              </div>
              <button class="btn-primary text-sm py-2 px-4" @click="pickCover">
                {{ form.coverPhoto ? '更换' : '选择照片' }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium"
            @click="closeModal">取消</button>
          <button class="flex-1 py-3 rounded-full gradient-primary text-white font-medium"
            @click="saveJourney">保存</button>
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

interface Journey {
  id: string
  name: string
  city: string
  startDate: string
  endDate: string
  desc: string
  coverPhoto: string
  tags: string[]
  days: Day[]
  createdAt: string
}

interface Day {
  dayNumber: number
  date: string
  title: string
  content: string
  photos: string[]
  createdAt: string
}

const journeys = ref<Journey[]>([])
const searchQuery = ref('')
const showCreateModal = ref(false)
const editingJourney = ref<Journey | null>(null)

const form = ref({
  name: '',
  city: '',
  startDate: '',
  endDate: '',
  desc: '',
  coverPhoto: '',
  tagsStr: '',
})

const sortedJourneys = computed(() =>
  [...journeys.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

const filteredJourneys = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sortedJourneys.value
  return sortedJourneys.value.filter(j => {
    return (
      j.name.toLowerCase().includes(q) ||
      (j.city && j.city.toLowerCase().includes(q)) ||
      (j.desc && j.desc.toLowerCase().includes(q)) ||
      (j.tags || []).some(t => t.toLowerCase().includes(q))
    )
  })
})

function onSearch() { /* reactive, no-op */ }
function clearSearch() {
  searchQuery.value = ''
}

// 全局数据缓存，避免每次saveData都重新读取解析
let cachedData: any = null

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      cachedData = JSON.parse(raw)
      journeys.value = cachedData.journeys || []
    } catch { /* ignore */ }
  }
}

function saveData() {
  if (!cachedData) cachedData = {}
  cachedData.journeys = journeys.value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData))
}

function formatDate(d: string) {
  return d || '未设置'
}

function getPhotoCount(j: Journey) {
  let count = j.coverPhoto ? 1 : 0
  ;(j.days || []).forEach(d => { count += (d.photos || []).length })
  return count
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function resetForm() {
  form.value = { name: '', city: '', startDate: '', endDate: '', desc: '', coverPhoto: '', tagsStr: '' }
}

function pickCover() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        form.value.coverPhoto = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

function editJourney(j: Journey) {
  editingJourney.value = j
  form.value = {
    name: j.name,
    city: j.city,
    startDate: j.startDate,
    endDate: j.endDate,
    desc: j.desc,
    coverPhoto: j.coverPhoto,
    tagsStr: (j.tags || []).join(','),
  }
  showCreateModal.value = true
}

function deleteJourney(j: Journey) {
  if (confirm(`确定删除「${j.name}」？`)) {
    journeys.value = journeys.value.filter(item => item.id !== j.id)
    saveData()
  }
}

function saveJourney() {
  if (!form.value.name.trim()) {
    alert('请输入旅程名称')
    return
  }

  const tags = form.value.tagsStr.split(',').map(t => t.trim()).filter(Boolean)
  const isEditing = !!editingJourney.value

  if (isEditing && editingJourney.value) {
    // 先关闭弹窗再更新数据，避免响应式冲突
    const jId = editingJourney.value.id
    const updateData = {
      name: form.value.name,
      city: form.value.city,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      desc: form.value.desc,
      coverPhoto: form.value.coverPhoto,
      tags,
    }
    closeModal()
    const target = journeys.value.find(j => j.id === jId)
    if (target) Object.assign(target, updateData)
  } else {
    const newJourney = {
      id: generateId(),
      name: form.value.name,
      city: form.value.city,
      startDate: form.value.startDate,
      endDate: form.value.endDate,
      desc: form.value.desc,
      coverPhoto: form.value.coverPhoto,
      tags,
      days: [],
      createdAt: new Date().toISOString(),
    }
    closeModal()
    journeys.value.push(newJourney)
  }

  saveData()
}

function closeModal() {
  showCreateModal.value = false
  editingJourney.value = null
  resetForm()
  // 强制DOM更新后再允许下次操作
  requestAnimationFrame(() => {
    showCreateModal.value = false
  })
}

function goDetail(id: string) {
  router.push(`/journey/${id}`)
}

onMounted(loadData)
</script>
