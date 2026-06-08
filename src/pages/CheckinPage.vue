<template>
  <div class="page-content">
    <!-- 头部 -->
    <div class="gradient-primary px-5 pt-14 pb-6">
      <h1 class="text-3xl font-bold text-white">打卡记录</h1>
      <p class="text-white/70 text-sm mt-1">{{ checkins.length }} 个足迹 · {{ uniquePlaces.length }} 个地点</p>
    </div>

    <!-- 足迹报告切换按钮 -->
    <div v-if="checkins.length > 0" class="px-4 mt-2">
      <button class="w-full py-3 rounded-2xl border-2 border-indigo-100 bg-indigo-50/50 text-indigo-600 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors"
        @click="showReport = !showReport">
        <span>{{ showReport ? '📊 收起报告' : '📊 查看足迹报告' }}</span>
        <span class="text-xs text-indigo-400">({{ checkins.length }}个足迹 · {{ reportData.cityCount }}城 · {{ reportData.provinceLit }}/34省)</span>
      </button>
    </div>

    <!-- 足迹报告详情 -->
    <div v-if="showReport" class="px-4 mt-4">
      <!-- 核心数据 -->
      <div class="card p-4 mb-4">
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p class="text-xl font-bold text-indigo-600">{{ reportData.totalCheckins }}</p>
            <p class="text-xs text-gray-400">打卡点</p>
          </div>
          <div>
            <p class="text-xl font-bold text-indigo-600">{{ reportData.cityCount }}</p>
            <p class="text-xs text-gray-400">城市</p>
          </div>
          <div>
            <p class="text-xl font-bold text-indigo-600">{{ reportData.provinceLit }}/{{ reportData.provinceTotal }}</p>
            <p class="text-xs text-gray-400">点亮省份</p>
          </div>
          <div>
            <p class="text-xl font-bold text-indigo-600">{{ reportData.trackCount }}</p>
            <p class="text-xs text-gray-400">轨迹数</p>
          </div>
        </div>
      </div>

      <!-- 旅行偏好 -->
      <div class="card p-4 mb-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">🎯 旅行偏好</h4>
        <div class="grid grid-cols-3 gap-3">
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <span class="text-2xl">🏙</span>
            <p class="text-xs text-gray-400 mt-1">最爱城市</p>
            <p class="text-sm font-bold text-gray-800">{{ reportData.favCity || '暂无' }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <span class="text-2xl">🗓</span>
            <p class="text-xs text-gray-400 mt-1">最活跃月</p>
            <p class="text-sm font-bold text-gray-800">{{ reportData.favMonth || '暂无' }}</p>
          </div>
          <div class="bg-gray-50 rounded-xl p-3 text-center">
            <span class="text-2xl">{{ reportData.favTransportIcon || '🚗' }}</span>
            <p class="text-xs text-gray-400 mt-1">最爱出行方式</p>
            <p class="text-sm font-bold text-gray-800">{{ reportData.favTransport || '暂无' }}</p>
          </div>
        </div>
      </div>

      <!-- 省份点亮网格 -->
      <div class="card p-4 mb-4">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">🗺 省份点亮</h4>
        <div class="flex flex-wrap gap-1.5">
          <span v-for="p in reportData.provinceStats" :key="p.name"
            class="inline-flex flex-col items-center px-2 py-1.5 rounded-lg text-xs"
            :class="p.lit ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-100'">
            <span>{{ p.lit ? '🔥' : '○' }}</span>
            <span class="font-semibold mt-0.5">{{ p.name }}</span>
            <span v-if="p.count > 0" class="text-indigo-500 font-bold text-[10px]">{{ p.count }}次</span>
          </span>
        </div>
      </div>

      <!-- 城市排行 -->
      <div class="card p-4 mb-4" v-if="reportData.cityStats.length > 0">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">🏙 城市排行 TOP10</h4>
        <div v-for="(city, i) in reportData.cityStats.slice(0, 10)" :key="city.name"
          class="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
          <span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            :class="i === 0 ? 'bg-amber-100 text-amber-600' : i === 1 ? 'bg-blue-50 text-blue-500' : i === 2 ? 'bg-green-50 text-green-500' : 'bg-gray-100 text-gray-400'">
            {{ i + 1 }}
          </span>
          <span class="text-sm text-gray-700 flex-1">{{ city.name }}</span>
          <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
            <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all"
              :style="{ width: city.pct + '%' }"></div>
          </div>
          <span class="text-xs text-indigo-500 font-bold w-10 text-right">{{ city.count }}次</span>
        </div>
      </div>

      <!-- 旅行路线 -->
      <div class="card p-4 mb-4" v-if="reportData.flightSegments.length > 0">
        <h4 class="text-sm font-semibold text-gray-700 mb-3">✈ 旅行路线</h4>
        <div v-for="seg in reportData.flightSegments" :key="seg.id"
          class="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
          <div class="min-w-[80px]">
            <p class="text-sm font-bold text-gray-800">{{ seg.fromCity }}</p>
            <p class="text-xs text-gray-400">{{ seg.fromTime }}</p>
          </div>
          <div class="flex-1 flex flex-col items-center">
            <span class="text-lg">{{ seg.transportLabel || '✈️' }}</span>
            <div class="w-full h-px my-1" style="background:repeating-linear-gradient(to right, #6366F1 0, #6366F1 8px, transparent 8px, transparent 14px);"></div>
          </div>
          <div class="min-w-[80px] text-right">
            <p class="text-sm font-bold text-gray-800">{{ seg.toCity }}</p>
            <p class="text-xs text-gray-400">{{ seg.toTime }}</p>
          </div>
        </div>
      </div>
    </div>
    <div class="px-4 py-4">
      <!-- 空状态 -->
      <div v-if="checkins.length === 0" class="empty-state">
        <span class="empty-state-icon">📍</span>
        <p class="empty-state-text">还没有打卡记录</p>
        <p class="text-xs text-gray-400 mt-1">点击右下角 + 添加打卡</p>
      </div>

      <!-- 打卡项 -->
      <div v-for="item in sortedCheckins" :key="item.id" class="card mb-3 p-4">
        <div class="flex gap-3">
          <!-- 照片缩略图 -->
          <div v-if="item.photo" class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
            <img :src="item.photo" class="w-full h-full object-cover" alt="" />
          </div>
          <div v-else class="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
            <span class="text-2xl">📍</span>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <h3 class="font-semibold text-gray-900 truncate">{{ item.place }}</h3>
                <!-- 打卡次数徽标 -->
                <span v-if="getPlaceCount(item.place) > 1" class="visit-count-badge">
                  第{{ getVisitIndex(item) }}次
                </span>
              </div>
              <button class="text-gray-300 hover:text-red-500 ml-1 flex-shrink-0"
                @click="deleteCheckin(item)">✕</button>
            </div>
            <p class="text-xs text-gray-400 mt-0.5">{{ item.city }} {{ item.province }}</p>
            <p v-if="item.note" class="text-sm text-gray-600 mt-1 line-clamp-1">{{ item.note }}</p>
            <!-- 关联日志 -->
            <div v-if="item.journeyId && item.journeyName" class="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs">
              <span>🔗</span>
              <span>{{ item.journeyName }}</span>
              <span v-if="item.dayDate">· 第{{ getDayLabel(item) }}天</span>
            </div>
            <!-- 运输工具 -->
            <span v-if="item.transport" class="inline-block mt-1 text-xs text-gray-400">🚗 {{ getTransportLabel(item.transport) }}</span>
            <p class="text-xs text-gray-300 mt-2">{{ formatTime(item.createdAt) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="openAddModal">+</button>

    <!-- 添加弹窗 -->
    <div v-if="showModal" class="modal-mask" @click.self="closeModal">
      <div class="modal-content">
        <h3 class="text-lg font-semibold mb-5">添加打卡</h3>

        <div class="space-y-4">
          <!-- 地点名称 + 二次打卡快捷提示 -->
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">地点名称 *</label>
            <input
              class="form-input"
              v-model="form.place"
              placeholder="如：故宫博物院"
              @input="onPlaceInput"
              list="place-suggestions"
            />
            <datalist id="place-suggestions">
              <option v-for="p in uniquePlaces" :key="p" :value="p" />
            </datalist>
            <!-- 二次打卡提示 -->
            <p v-if="placeHint" class="text-xs text-indigo-500 mt-1 flex items-center gap-1">
              <span>🔄</span>{{ placeHint }}
            </p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-sm font-medium text-gray-700 mb-1 block">城市</label>
              <input class="form-input" v-model="form.city" placeholder="如：北京" />
            </div>
            <div>
              <label class="text-sm font-medium text-gray-700 mb-1 block">省份</label>
              <input class="form-input" v-model="form.province" placeholder="如：北京" />
            </div>
          </div>
          <!-- 交通工具选择 -->
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">交通工具</label>
            <div class="transport-selector">
              <button
                v-for="t in transportOptions"
                :key="t.value"
                class="transport-btn"
                :class="{ active: form.transport === t.value }"
                @click="form.transport = form.transport === t.value ? '' : t.value"
                type="button"
              >
                <span class="text-lg">{{ t.emoji }}</span>
                <span class="text-xs">{{ t.label }}</span>
              </button>
            </div>
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">备注</label>
            <textarea class="form-textarea" v-model="form.note" placeholder="记录此刻的感受..." />
          </div>
          <div>
            <label class="text-sm font-medium text-gray-700 mb-1 block">照片</label>
            <div class="flex items-center gap-3">
              <div v-if="form.photo" class="w-20 h-20 rounded-xl overflow-hidden bg-gray-100">
                <img :src="form.photo" class="w-full h-full object-cover" alt="" />
              </div>
              <button class="btn-primary text-sm py-2 px-4" @click="pickPhoto">
                {{ form.photo ? '更换' : '拍照/选择' }}
              </button>
            </div>
          </div>

          <!-- 获取位置 -->
          <button class="w-full py-2.5 rounded-full border border-indigo-200 text-indigo-600 text-sm font-medium hover:bg-indigo-50"
            @click="getLocation">
            📍 获取当前位置
          </button>

          <!-- 关联日志 -->
          <div class="border-t pt-4">
            <label class="text-sm font-medium text-gray-700 mb-2 block">🔗 关联旅程日志（可选）</label>
            <div v-if="journeys.length === 0" class="text-xs text-gray-400 py-2">
              暂无旅程，请先在「日志」中创建旅程
            </div>
            <div v-else class="space-y-2">
              <!-- 选择旅程 -->
              <select
                class="form-select"
                v-model="form.journeyId"
                @change="onJourneyChange"
              >
                <option value="">不关联</option>
                <option v-for="j in journeys" :key="j.id" :value="j.id">
                  {{ j.name }} ({{ j.city || '未知' }})
                </option>
              </select>

              <!-- 选择具体某一天（若该旅程有 days） -->
              <select
                v-if="linkedDays.length > 0"
                class="form-select"
                v-model="form.dayDate"
              >
                <option value="">不指定具体日期</option>
                <option v-for="d in linkedDays" :key="d.date" :value="d.date">
                  第{{ d.dayNumber }}天 · {{ d.date }} · {{ d.title }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button class="flex-1 py-3 rounded-full border border-gray-200 text-gray-600 font-medium"
            @click="closeModal">取消</button>
          <button class="flex-1 py-3 rounded-full gradient-primary text-white font-medium"
            @click="saveCheckin">保存</button>
        </div>
      </div>
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

interface Checkin {
  id: string
  place: string
  city: string
  province: string
  note: string
  photo: string
  lat?: number
  lng?: number
  transport?: string
  createdAt: string
  journeyId?: string
  journeyName?: string
  dayDate?: string
  dayTitle?: string
}

const checkins = ref<Checkin[]>([])
const journeys = ref<Journey[]>([])
const showModal = ref(false)
const showReport = ref(false)

const form = ref({
  place: '',
  city: '',
  province: '',
  note: '',
  photo: '',
  transport: '' as string,
  lat: undefined as number | undefined,
  lng: undefined as number | undefined,
  journeyId: '' as string,
  journeyName: '' as string,
  dayDate: '' as string,
  dayTitle: '' as string,
})

// 交通工具选项
const transportOptions = [
  { value: 'plane', emoji: '✈️', label: '飞机' },
  { value: 'train', emoji: '🚄', label: '高铁' },
  { value: 'car', emoji: '🚗', label: '汽车' },
  { value: 'bus', emoji: '🚌', label: '大巴' },
  { value: 'bike', emoji: '🚲', label: '骑行' },
  { value: 'walk', emoji: '🚶', label: '步行' },
  { value: 'ship', emoji: '🚢', label: '轮船' },
]

function getTransportLabel(v: string) {
  const t = transportOptions.find(o => o.value === v)
  return t ? `${t.emoji} ${t.label}` : v
}

const sortedCheckins = computed(() =>
  [...checkins.value].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
)

// 去重地点列表（用于dataList建议）
const uniquePlaces = computed(() => {
  const seen = new Set<string>()
  return checkins.value
    .map(c => c.place)
    .filter(p => {
      if (seen.has(p)) return false
      seen.add(p)
      return true
    })
})

// 获取某地点的总打卡次数
function getPlaceCount(place: string) {
  return checkins.value.filter(c => c.place === place).length
}

// 获取该打卡记录是该地点的第几次（按时间排序）
function getVisitIndex(item: Checkin) {
  const samePlace = checkins.value
    .filter(c => c.place === item.place)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  return samePlace.findIndex(c => c.id === item.id) + 1
}

// 地点输入提示
const placeHint = computed(() => {
  const name = form.value.place.trim()
  if (!name) return ''
  const count = getPlaceCount(name)
  if (count > 0) {
    return `你已在此打过 ${count} 次卡，这将是第 ${count + 1} 次`
  }
  return ''
})

function onPlaceInput() { /* reactive, hint updates automatically */ }

// 选中旅程后，列出该旅程的所有日记天数
const linkedDays = computed(() => {
  if (!form.value.journeyId) return []
  const journey = journeys.value.find(j => j.id === form.value.journeyId)
  if (!journey?.days) return []
  return [...journey.days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
})

// 全局数据缓存
let cachedData: any = null

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try {
      cachedData = JSON.parse(raw)
      checkins.value = cachedData.checkins || []
      journeys.value = cachedData.journeys || []
    } catch { /* ignore */ }
  }
}

function saveData() {
  if (!cachedData) cachedData = {}
  cachedData.checkins = checkins.value
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData))
}

// 足迹报告数据
const reportData = computed(() => {
  const sorted = [...checkins.value].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  const cityMap: Record<string, number> = {}
  const provinceMap: Record<string, number> = {}
  const monthMap: Record<number, number> = {}
  const transportMap: Record<string, number> = {}

  sorted.forEach(c => {
    if (c.city) cityMap[c.city] = (cityMap[c.city] || 0) + 1
    if (c.province) provinceMap[c.province] = (provinceMap[c.province] || 0) + 1
    if (c.createdAt) {
      const m = new Date(c.createdAt).getMonth() + 1
      monthMap[m] = (monthMap[m] || 0) + 1
    }
    if (c.transport) transportMap[c.transport] = (transportMap[c.transport] || 0) + 1
  })

  const cityStats = Object.entries(cityMap)
    .map(([name, count]) => ({ name, count, pct: 0 }))
    .sort((a, b) => b.count - a.count)
  const maxCity = Math.max(1, ...cityStats.map(s => s.count))
  cityStats.forEach(s => { s.pct = Math.round(s.count / maxCity * 100) })

  // 34个省份（使用静态列表）
  const allProvinceNames = [
    '北京','天津','上海','重庆','河北','山西','内蒙古','辽宁','吉林','黑龙江',
    '江苏','浙江','安徽','福建','江西','山东','河南','湖北','湖南','广东',
    '广西','海南','四川','贵州','云南','西藏','陕西','甘肃','青海','宁夏',
    '新疆','香港','澳门','台湾'
  ]
  const provinceStats = allProvinceNames.map(n => ({
    name: n,
    count: provinceMap[n] || 0,
    lit: !!provinceMap[n]
  }))
  const provinceLit = provinceStats.filter(p => p.lit).length

  // 飞行段
  const flightSegments: { id: string; fromCity: string; fromTime: string; toCity: string; toTime: string; transport: string; transportLabel: string }[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!
    const curr = sorted[i]!
    flightSegments.push({
      id: `s_${i}`,
      fromCity: prev.city || prev.place,
      fromTime: prev.createdAt?.split('T')[0] || '',
      toCity: curr.city || curr.place,
      toTime: curr.createdAt?.split('T')[0] || '',
      transport: curr.transport || '',
      transportLabel: getTransportLabel(curr.transport || '')
    })
  }

  let favCity = '', favMonth = '', favTransport = '', favTransportIcon = ''
  if (cityStats.length > 0) favCity = cityStats[0]!.name
  if (Object.keys(monthMap).length > 0) {
    const top = Object.entries(monthMap).sort((a, b) => b[1] - a[1])[0]!
    favMonth = `${top[0]}月 (${top[1]}次)`
  }
  if (Object.keys(transportMap).length > 0) {
    const top = Object.entries(transportMap).sort((a, b) => b[1] - a[1])[0]!
    favTransport = getTransportLabel(top[0]) || top[0]
    const iconMap: Record<string, string> = { plane: '✈️', train: '🚄', car: '🚗', bus: '🚌', bike: '🚲', walk: '🚶', ship: '🚢' }
    favTransportIcon = iconMap[top[0]] || '🚗'
  }

  return {
    totalCheckins: sorted.length,
    cityCount: Object.keys(cityMap).length,
    provinceLit,
    provinceTotal: 34,
    trackCount: 0,
    provinceStats,
    cityStats,
    flightSegments: flightSegments.reverse(),
    favCity, favMonth, favTransport, favTransportIcon
  }
})

function formatTime(t: string) {
  if (!t) return ''
  return t.split('T')[0] + ' ' + t.split('T')[1]?.slice(0, 5) || ''
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function resetForm() {
  form.value = {
    place: '', city: '', province: '', note: '', photo: '',
    transport: '',
    lat: undefined, lng: undefined,
    journeyId: '', journeyName: '', dayDate: '', dayTitle: '',
  }
}

function onJourneyChange() {
  const journey = journeys.value.find(j => j.id === form.value.journeyId)
  form.value.journeyName = journey?.name || ''
  form.value.dayDate = ''
  form.value.dayTitle = ''
}

function getDayLabel(item: Checkin) {
  if (!item.journeyId || !item.dayDate) return ''
  const journey = journeys.value.find(j => j.id === item.journeyId)
  const day = journey?.days?.find(d => d.date === item.dayDate)
  return day ? String(day.dayNumber) : '?'
}

function openAddModal() {
  loadData() // 刷新旅程列表
  showModal.value = true
}

function pickPhoto() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        form.value.photo = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }
  input.click()
}

function getLocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.value.lat = pos.coords.latitude
        form.value.lng = pos.coords.longitude
        alert(`已获取位置: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`)
      },
      () => alert('无法获取位置，请检查定位权限')
    )
  } else {
    alert('浏览器不支持定位功能')
  }
}

function deleteCheckin(item: Checkin) {
  if (confirm(`确定删除「${item.place}」的打卡记录？`)) {
    checkins.value = checkins.value.filter(c => c.id !== item.id)
    saveData()
  }
}

function saveCheckin() {
  if (!form.value.place.trim()) {
    alert('请输入地点名称')
    return
  }

  // 关联日志时，获取选中天的标题
  if (form.value.journeyId && form.value.dayDate) {
    const journey = journeys.value.find(j => j.id === form.value.journeyId)
    const day = journey?.days?.find(d => d.date === form.value.dayDate)
    form.value.journeyName = journey?.name || ''
    form.value.dayTitle = day?.title || ''
  }

  checkins.value.push({
    id: generateId(),
    place: form.value.place,
    city: form.value.city,
    province: form.value.province,
    note: form.value.note,
    photo: form.value.photo,
    transport: form.value.transport || undefined,
    lat: form.value.lat,
    lng: form.value.lng,
    createdAt: new Date().toISOString(),
    journeyId: form.value.journeyId || undefined,
    journeyName: form.value.journeyName || undefined,
    dayDate: form.value.dayDate || undefined,
    dayTitle: form.value.dayTitle || undefined,
  })

  saveData()
  closeModal()
}

function closeModal() {
  showModal.value = false
  resetForm()
}

onMounted(loadData)
</script>

<style scoped>
.visit-count-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 8px;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  color: #6366f1;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.transport-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.transport-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 12px;
  border-radius: 12px;
  border: 1.5px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 52px;
}

.transport-btn:hover {
  border-color: #c7d2fe;
  background: #eef2ff;
}

.transport-btn.active {
  border-color: #6366f1;
  background: linear-gradient(135deg, #eef2ff, #e0e7ff);
  box-shadow: 0 0 0 2px rgba(99,102,241,0.15);
}
</style>
