<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-6">
      <div class="flex items-center gap-3">
        <button class="w-9 h-9 rounded-full bg-white/15 text-white flex items-center justify-center text-lg border-none cursor-pointer"
          @click="$router.back()">‹</button>
        <div>
          <h1 class="text-2xl font-bold text-white">足迹报告</h1>
          <p class="text-white/70 text-sm">✈ 共 {{ checkinsCount }} 个足迹 · {{ provincesCount }} 个省份</p>
        </div>
      </div>
    </div>

    <!-- 统计数据 -->
    <div class="px-4 -mt-4">
      <div class="card px-5 py-4">
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-2xl font-bold text-indigo-600">{{ checkinsCount }}</p>
            <p class="text-xs text-gray-400">打卡点</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-indigo-600">{{ citiesCount }}</p>
            <p class="text-xs text-gray-400">城市</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-indigo-600">{{ provincesCount }}</p>
            <p class="text-xs text-gray-400">省份</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-indigo-600">{{ trackCount }}</p>
            <p class="text-xs text-gray-400">轨迹</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 回忆模式 - 日期选择 -->
    <div class="px-4 mt-5">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-1">🕰 旅行回忆</h3>
        <p class="text-xs text-gray-400 mb-4">选择日期范围，回溯你的旅行轨迹</p>
        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">开始日期</label>
            <input type="date" class="form-input text-sm" v-model="dateStart" />
          </div>
          <div class="flex-1">
            <label class="text-xs text-gray-500 mb-1 block">结束日期</label>
            <input type="date" class="form-input text-sm" v-model="dateEnd" />
          </div>
        </div>
        <button class="w-full py-3 rounded-full gradient-primary text-white font-semibold"
          @click="startMemory">▶ 开始回忆</button>
        <button v-if="memoryActive" class="w-full py-2.5 mt-2 rounded-full border border-gray-200 text-gray-500 text-sm"
          @click="resetMemory">退出回忆模式</button>
      </div>
    </div>

    <!-- 回忆动画区域 -->
    <div v-if="memoryActive && memoryCheckins.length >= 2" class="px-4 mt-4">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-2">
          📺 {{ dateStart }} ~ {{ dateEnd }} · {{ memoryCheckins.length }} 个足迹
        </h3>

        <!-- 动画进度条 -->
        <div class="memory-progress mb-3">
          <div class="memory-progress-bar">
            <div class="memory-progress-fill" :style="{ width: playProgress + '%' }"></div>
          </div>
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>{{ memoryCheckins[0]?.city || '起点' }}</span>
            <span>{{ memoryCheckins[memoryCheckins.length - 1]?.city || '终点' }}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button v-if="!isPlaying" class="flex-1 py-3 rounded-full gradient-primary text-white font-semibold text-sm"
            @click="startPlayRoute">▶ 播放动画</button>
          <button v-else class="flex-1 py-3 rounded-full bg-red-500 text-white font-semibold text-sm"
            @click="stopPlayRoute">⏸ 暂停</button>
          <button class="px-4 py-3 rounded-full border border-gray-200 text-gray-500 text-sm"
            @click="resetMemory">✕</button>
        </div>
      </div>
    </div>

    <!-- 飞行路线列表 -->
    <div class="px-4 mt-5">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-4">✈ 飞行路线</h3>
        <div v-if="flightSegments.length === 0" class="empty-state py-8">
          <span class="empty-state-icon">🛫</span>
          <p class="empty-state-text">至少需要2个打卡点</p>
        </div>
        <div v-for="seg in flightSegments" :key="seg.id" class="flight-segment">
          <div class="flight-point">
            <p class="font-semibold text-sm text-gray-900">{{ seg.fromCity }}</p>
            <p class="text-xs text-gray-400">{{ seg.fromTime }}</p>
          </div>
          <div class="flight-connector">
            <span class="text-lg">{{ seg.transportLabel || '✈️' }}</span>
            <div class="flight-dash"></div>
          </div>
          <div class="flight-point text-right">
            <p class="font-semibold text-sm text-gray-900">{{ seg.toCity }}</p>
            <p class="text-xs text-gray-400">{{ seg.toTime }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 城市排行 -->
    <div class="px-4 mt-4">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-4">🏙 城市排行</h3>
        <div v-for="(city, i) in cityStats" :key="city.name" class="city-rank-item">
          <span class="city-rank-num" :class="'top' + (i + 1)">{{ i + 1 }}</span>
          <span class="text-sm text-gray-700 flex-1">{{ city.name }}</span>
          <div class="city-rank-bar">
            <div class="city-rank-fill" :style="{ width: city.pct + '%' }"></div>
          </div>
          <span class="text-xs text-indigo-500 font-semibold w-10 text-right">{{ city.count }}次</span>
        </div>
      </div>
    </div>

    <!-- 省份统计 -->
    <div class="px-4 mt-4 mb-4">
      <div class="card p-5">
        <h3 class="text-base font-semibold text-gray-900 mb-4">🗺 省份分布</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="p in provinceStats" :key="p.name"
            class="prov-tag" :class="{ lit: p.lit }">
            <span class="text-xs">{{ p.lit ? '🔥' : '○' }}</span>
            <span class="text-xs font-semibold">{{ p.name }}</span>
            <span class="text-xs text-gray-400">{{ p.count }}次</span>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const STORAGE_KEY = 'qingyin_data'

interface Checkin {
  id: string
  place: string
  city: string
  province: string
  note: string
  photo: string
  transport?: string
  lat?: number
  lng?: number
  createdAt: string
  journeyId?: string
  journeyName?: string
  dayDate?: string
  dayTitle?: string
}

interface FlightSegment {
  id: string
  fromCity: string
  fromTime: string
  toCity: string
  toTime: string
  transport: string
  transportLabel: string
}

const checkins = ref<Checkin[]>([])
const dateStart = ref('')
const dateEnd = ref('')
const memoryActive = ref(false)
const memoryCheckins = ref<Checkin[]>([])
const isPlaying = ref(false)
const playProgress = ref(0)
let _playTimer: ReturnType<typeof setInterval> | null = null

const checkinsCount = computed(() => checkins.value.length)
const citiesCount = computed(() => new Set(checkins.value.map(c => c.city).filter(Boolean)).size)
const provincesCount = computed(() => new Set(checkins.value.map(c => c.province).filter(Boolean)).size)
const trackCount = ref(0)

function getTransportLabel(t: string) {
  const map: Record<string, string> = {
    plane: '✈️ 飞机', train: '🚄 高铁', car: '🚗 汽车',
    bus: '🚌 大巴', bike: '🚲 骑行', walk: '🚶 步行', ship: '🚢 轮船'
  }
  return map[t] || ''
}

const cityStats = computed(() => {
  const map: Record<string, number> = {}
  checkins.value.forEach(c => {
    if (c.city) map[c.city] = (map[c.city] || 0) + 1
  })
  const stats = Object.entries(map)
    .map(([name, count]) => ({ name, count, pct: 0 }))
    .sort((a, b) => b.count - a.count)
  const max = Math.max(1, ...stats.map(s => s.count))
  stats.forEach(s => { s.pct = Math.round(s.count / max * 100) })
  return stats
})

const provinceStats = computed(() => {
  const map: Record<string, number> = {}
  checkins.value.forEach(c => {
    if (c.province) map[c.province] = (map[c.province] || 0) + 1
  })
  return Object.entries(map)
    .map(([name, count]) => ({ name: name.replace(/(省|市|自治区|特别行政区)/g, ''), count, lit: true }))
    .sort((a, b) => b.count - a.count)
})

const flightSegments = computed<FlightSegment[]>(() => {
  const sorted = [...checkins.value].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  const segments: FlightSegment[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]
    const curr = sorted[i]
    segments.push({
      id: `seg_${i}`,
      fromCity: prev.city || prev.place,
      fromTime: prev.createdAt?.split('T')[0] || '',
      toCity: curr.city || curr.place,
      toTime: curr.createdAt?.split('T')[0] || '',
      transport: curr.transport || '',
      transportLabel: getTransportLabel(curr.transport || ''),
    })
  }
  return segments.reverse()
})

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      const data = JSON.parse(raw)
      checkins.value = data.checkins || []
      trackCount.value = (data.footprintTracks || []).length
    } catch { /* ignore */ }
  }
}

function formatTime(t: string) {
  if (!t) return ''
  return t.split('T')[0]
}

function startMemory() {
  if (!dateStart.value || !dateEnd.value) {
    alert('请选择完整的日期范围')
    return
  }
  const start = new Date(dateStart.value + 'T00:00:00')
  const end = new Date(dateEnd.value + 'T23:59:59')

  if (start > end) {
    alert('开始日期不能晚于结束日期')
    return
  }

  const filtered = checkins.value
    .filter(c => {
      if (!c.createdAt) return false
      const d = new Date(c.createdAt)
      return d >= start && d <= end
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  if (filtered.length < 2) {
    alert('该日期范围内至少需要2个打卡点')
    return
  }

  memoryCheckins.value = filtered
  memoryActive.value = true
  playProgress.value = 0
  stopPlayRoute()
}

function resetMemory() {
  stopPlayRoute()
  memoryActive.value = false
  memoryCheckins.value = []
  playProgress.value = 0
}

function startPlayRoute() {
  if (memoryCheckins.value.length < 2) return
  isPlaying.value = true
  playProgress.value = 0
  let idx = 0
  const total = memoryCheckins.value.length - 1

  _playTimer = setInterval(() => {
    idx++
    if (idx >= total) {
      stopPlayRoute()
      playProgress.value = 100
      return
    }
    playProgress.value = Math.round(idx / total * 100)
  }, 800)
}

function stopPlayRoute() {
  if (_playTimer) {
    clearInterval(_playTimer)
    _playTimer = null
  }
  isPlaying.value = false
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.flight-segment {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 8px;
  border-bottom: 1px solid #f5f5f5;
}
.flight-segment:last-child { border-bottom: none; }
.flight-point { min-width: 100px; }
.flight-connector {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.flight-dash {
  width: 100%;
  height: 2px;
  background: repeating-linear-gradient(to right, #6366F1 0, #6366F1 12px, transparent 12px, transparent 20px);
}
.city-rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}
.city-rank-item:last-child { border-bottom: none; }
.city-rank-num {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  color: #999;
  flex-shrink: 0;
}
.city-rank-num.top1 { background: #FFF7E6; color: #FA8C16; }
.city-rank-num.top2 { background: #E6F7FF; color: #1890FF; }
.city-rank-num.top3 { background: #F6FFED; color: #52C41A; }
.city-rank-bar {
  flex: 1;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
}
.city-rank-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366F1, #A78BFA);
  border-radius: 4px;
  transition: width 0.4s;
}
.prov-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: #f5f5f5;
  border-radius: 10px;
  border: 1px solid transparent;
}
.prov-tag.lit {
  background: linear-gradient(135deg, #FFFBE6, #FFF7E6);
  border-color: #FFE58F;
}
.memory-progress-bar {
  width: 100%;
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}
.memory-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366F1, #A78BFA);
  border-radius: 4px;
  transition: width 0.3s;
}
</style>
