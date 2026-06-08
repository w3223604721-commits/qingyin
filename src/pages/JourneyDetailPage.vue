<template>
  <div class="page-content">
    <!-- 返回按钮 -->
    <div class="fixed top-6 left-4 z-10">
      <button class="w-10 h-10 rounded-full bg-white/80 backdrop-blur flex items-center justify-center shadow"
        @click="$router.back()">
        <span class="text-xl">←</span>
      </button>
    </div>

    <template v-if="journey">
      <!-- 封面轮播（可滑动 + 自动播放） -->
      <div class="relative">
        <div v-if="allPhotos.length > 0" class="h-64 bg-gray-900 relative overflow-hidden"
          @touchstart="onCarouselTouchStart" @touchend="onCarouselTouchEnd">
          <div class="carousel-scroll" ref="carouselScrollRef">
            <div
              v-for="(photo, idx) in allPhotos"
              :key="idx"
              class="carousel-item"
            >
              <img :src="photo" class="w-full h-full object-cover" alt="" />
            </div>
          </div>
          <div class="absolute bottom-4 right-4 bg-black/50 text-white px-3 py-1 rounded-full text-xs">
            {{ carouselIndex + 1 }} / {{ allPhotos.length }}
          </div>
        </div>
        <div v-else class="h-48 gradient-primary flex items-center justify-center">
          <span class="text-6xl">✈️</span>
        </div>
      </div>

      <!-- 旅程信息 -->
      <div class="px-5 -mt-6 relative z-10">
        <div class="card p-5">
          <h1 class="text-xl font-bold text-gray-900">{{ journey.name }}</h1>
          <p class="text-sm text-gray-500 mt-1">📍 {{ journey.city || '未知城市' }}</p>
          <p class="text-xs text-gray-400 mt-1">{{ journey.startDate || '?' }} ~ {{ journey.endDate || '?' }}</p>
          <p v-if="journey.desc" class="text-sm text-gray-600 mt-3">{{ journey.desc }}</p>
          <div v-if="journey.tags?.length" class="flex flex-wrap gap-1 mt-3">
            <span v-for="tag in journey.tags" :key="tag" class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">
              {{ tag }}
            </span>
          </div>
        </div>
      </div>

      <!-- 日记列表 -->
      <div class="px-4 mt-5">
        <h3 class="text-lg font-semibold text-gray-900 mb-3">旅行日记</h3>

        <div v-if="sortedDays.length === 0" class="empty-state">
          <span class="empty-state-icon">📝</span>
          <p class="empty-state-text">还没有日记</p>
        </div>

        <div v-for="(day, idx) in sortedDays" :key="idx" class="card p-4 mb-3">
          <div class="flex items-start justify-between mb-2">
            <div>
              <span class="text-xs text-indigo-500 font-medium">第 {{ day.dayNumber }} 天</span>
              <p class="text-sm font-semibold text-gray-900 mt-1">{{ day.title }}</p>
            </div>
            <div class="flex gap-1">
              <button class="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs"
                @click="editDay(idx)">✏️</button>
              <button class="w-7 h-7 rounded-full bg-red-50 flex items-center justify-center text-xs"
                @click="deleteDay(idx)">🗑️</button>
            </div>
          </div>
          <p class="text-xs text-gray-400 mb-2">{{ day.date }}</p>
          <p v-if="day.content" class="text-sm text-gray-600 mb-3">{{ day.content }}</p>
          <!-- 照片 -->
          <div v-if="day.photos?.length" class="photo-grid">
            <div v-for="(photo, pidx) in day.photos" :key="pidx" class="photo-item">
              <img :src="photo" alt="" />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 加载中 -->
    <div v-else class="flex items-center justify-center h-screen">
      <p class="text-gray-400">旅程不存在</p>
    </div>

    <!-- FAB -->
    <button v-if="journey" class="fab" @click="showDiaryModal = true">+</button>

    <!-- 日记编辑弹窗 -->
    <div v-if="showDiaryModal" class="modal-mask" @click.self="closeDiaryModal">
      <div class="modal-content">
        <h3 class="text-lg font-semibold mb-5">{{ editIndex >= 0 ? '编辑日记' : '添加日记' }}</h3>

        <div class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">日期</label>
            <input class="form-input" type="date" v-model="diaryForm.date" />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">标题 *</label>
            <input class="form-input" v-model="diaryForm.title" placeholder="今天的心情..." />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">内容</label>
            <textarea class="form-textarea" v-model="diaryForm.content" placeholder="记录今天的旅行故事..." />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">照片（{{ diaryForm.photos.length }}/9）</label>
            <div class="photo-grid">
              <div v-for="(photo, pidx) in diaryForm.photos" :key="pidx" class="photo-item">
                <img :src="photo" alt="" />
                <div class="photo-remove" @click="removePhoto(pidx)">✕</div>
              </div>
              <div v-if="diaryForm.photos.length < 9" class="photo-add" @click="addPhotos">
                <span class="text-3xl">+</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium"
            @click="closeDiaryModal">取消</button>
          <button class="flex-1 py-3 rounded-full gradient-primary text-white font-medium"
            @click="saveDiary">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
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

const journey = ref<Journey | null>(null)
const carouselIndex = ref(0)
const allPhotos = ref<string[]>([])
const showDiaryModal = ref(false)
const editIndex = ref(-1)
const carouselScrollRef = ref<HTMLElement | null>(null)
let autoPlayTimer: ReturnType<typeof setInterval> | null = null
let isDragging = ref(false)

const diaryForm = ref({
  date: '',
  title: '',
  content: '',
  photos: [] as string[],
})

const sortedDays = computed(() => {
  if (!journey.value?.days) return []
  return [...journey.value.days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

function loadJourney() {
  const id = route.params.id as string
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return
  try {
    const data = JSON.parse(raw)
    const j = (data.journeys || []).find((item: Journey) => item.id === id)
    if (j) {
      journey.value = j
      const photos: string[] = []
      ;(j.days || []).forEach((d: Day) => {
        (d.photos || []).forEach((p: string) => photos.push(p))
      })
      allPhotos.value = photos
      carouselIndex.value = 0
      startAutoPlay()
    }
  } catch { /* ignore */ }
}

function saveData() {
  if (!journey.value) return
  const raw = localStorage.getItem(STORAGE_KEY)
  const data = raw ? JSON.parse(raw) : {}
  const idx = (data.journeys || []).findIndex((j: Journey) => j.id === journey.value!.id)
  if (idx >= 0) {
    data.journeys[idx] = journey.value
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function resetDiaryForm() {
  diaryForm.value = { date: '', title: '', content: '', photos: [] }
  editIndex.value = -1
}

function editDay(idx: number) {
  const day = sortedDays.value[idx]
  if (!day) return
  editIndex.value = idx
  diaryForm.value = {
    date: day.date,
    title: day.title,
    content: day.content,
    photos: [...(day.photos || [])],
  }
  showDiaryModal.value = true
}

function deleteDay(idx: number) {
  if (!confirm('确定删除这篇日记？')) return
  if (!journey.value) return
  const actualIdx = journey.value.days.indexOf(sortedDays.value[idx])
  if (actualIdx >= 0) {
    journey.value.days.splice(actualIdx, 1)
    saveData()
    loadJourney()
  }
}

function addPhotos() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = (e: Event) => {
    const files = (e.target as HTMLInputElement).files
    if (!files) return
    const remaining = 9 - diaryForm.value.photos.length
    let loaded = 0
    Array.from(files).slice(0, remaining).forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        diaryForm.value.photos.push(reader.result as string)
        loaded++
      }
      reader.readAsDataURL(file)
    })
  }
  input.click()
}

function removePhoto(idx: number) {
  diaryForm.value.photos.splice(idx, 1)
}

function saveDiary() {
  if (!diaryForm.value.title.trim()) {
    alert('请输入标题')
    return
  }
  if (!journey.value) return
  if (!journey.value.days) journey.value.days = []

  const newDay: Day = {
    dayNumber: editIndex.value >= 0
      ? journey.value.days[editIndex.value].dayNumber
      : journey.value.days.length + 1,
    date: diaryForm.value.date || new Date().toISOString().split('T')[0],
    title: diaryForm.value.title,
    content: diaryForm.value.content,
    photos: diaryForm.value.photos,
    createdAt: new Date().toISOString(),
  }

  if (editIndex.value >= 0) {
    const actualIdx = journey.value.days.indexOf(sortedDays.value[editIndex.value])
    if (actualIdx >= 0) {
      journey.value.days[actualIdx] = { ...journey.value.days[actualIdx], ...newDay, dayNumber: journey.value.days[actualIdx].dayNumber }
    }
  } else {
    journey.value.days.push(newDay)
  }

  saveData()
  closeDiaryModal()
  loadJourney()
}

function closeDiaryModal() {
  showDiaryModal.value = false
  resetDiaryForm()
}

function startAutoPlay() {
  stopAutoPlay()
  if (allPhotos.value.length <= 1) return
  autoPlayTimer = setInterval(() => {
    if (!isDragging.value && allPhotos.value.length > 0) {
      const nextIndex = (carouselIndex.value + 1) % allPhotos.value.length
      carouselIndex.value = nextIndex
      scrollToIndex(nextIndex)
    }
  }, 3000)
}

function stopAutoPlay() {
  if (autoPlayTimer) {
    clearInterval(autoPlayTimer)
    autoPlayTimer = null
  }
}

function scrollToIndex(index: number) {
  const container = carouselScrollRef.value
  if (!container) return
  const itemWidth = container.clientWidth
  container.scrollTo({ left: itemWidth * index, behavior: 'smooth' })
}

function onCarouselTouchStart() {
  isDragging.value = true
  stopAutoPlay()
}

function onCarouselTouchEnd(e: TouchEvent) {
  isDragging.value = false
  const container = e.currentTarget as HTMLElement
  const scrollLeft = container.scrollLeft
  const itemWidth = container.clientWidth
  const newIndex = Math.round(scrollLeft / itemWidth)
  if (newIndex >= 0 && newIndex < allPhotos.value.length) {
    carouselIndex.value = newIndex
  }
  // 用户交互后重新启动自动轮播
  startAutoPlay()
}

onMounted(() => {
  loadJourney()
  startAutoPlay()
})

onUnmounted(() => {
  stopAutoPlay()
})
</script>

<style scoped>
.carousel-scroll {
  display: flex;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  height: 100%;
}
.carousel-scroll::-webkit-scrollbar {
  display: none;
}
.carousel-item {
  scroll-snap-align: start;
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}
</style>
