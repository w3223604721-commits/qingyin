<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">📈 数据分析</h1>
        <p class="page-subtitle">应用使用数据与行为分析</p>
      </div>
    </div>

    <!-- 事件类型分布 -->
    <div class="two-col">
      <div class="chart-card">
        <h3 class="chart-title">📊 事件类型分布</h3>
        <div v-if="eventTypes.length > 0" class="type-list">
          <div v-for="et in eventTypes" :key="et.type" class="type-row">
            <span class="type-name">{{ eventLabel(et.type) }}</span>
            <div class="type-bar-bg">
              <div class="type-bar-fill" :style="{ width: (et.count / maxEventCount * 100) + '%' }"></div>
            </div>
            <span class="type-count">{{ et.count }}</span>
          </div>
        </div>
        <p v-else class="empty-text">暂无数据</p>
      </div>

      <div class="chart-card">
        <h3 class="chart-title">📅 近30天活跃趋势</h3>
        <div v-if="dailyTrend.length > 0" class="mini-chart">
          <div class="line-chart-bars">
            <div v-for="d in dailyTrend" :key="d.date" class="mini-bar-col" :title="`${d.date}: ${d.count}次`">
              <div class="mini-bar" :style="{ height: Math.max(2, d.count / maxDailyCount * 140) + 'px' }"></div>
            </div>
          </div>
        </div>
        <p v-else class="empty-text">暂无数据</p>
      </div>
    </div>

    <!-- 事件日志表格 -->
    <div class="table-card">
      <h3 class="chart-title" style="padding: 20px 20px 0;">📋 最近事件日志</h3>
      <div v-if="events.length > 0" class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>事件类型</th>
              <th>描述</th>
              <th>用户</th>
              <th style="width:160px;">时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(ev, i) in events" :key="ev._id || i">
              <td class="td-id">{{ i + 1 }}</td>
              <td>
                <span class="event-tag">{{ eventLabel(ev.eventType) }}</span>
              </td>
              <td>
                <span class="event-desc">{{ ev.description || ev.eventData || '-' }}</span>
              </td>
              <td>
                <span class="user-tag">{{ ev.nickname || ev.userId?.slice(-6) || '匿名' }}</span>
              </td>
              <td class="td-time">{{ formatTime(ev.createdAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="empty-text" style="padding: 40px 20px;">暂无事件数据</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { app } from '../../utils/cloudbase'

interface EventItem {
  _id?: string
  eventType: string
  description?: string
  eventData?: string
  nickname?: string
  userId?: string
  createdAt: string
}

const events = ref<EventItem[]>([])
const eventTypes = ref<{ type: string; count: number }[]>([])
const dailyTrend = ref<{ date: string; count: number }[]>([])
const maxEventCount = ref(1)
const maxDailyCount = ref(1)

function eventLabel(t: string) {
  const map: Record<string, string> = {
    page_view: '📄 页面访问', checkin: '📍 打卡', journey_create: '📔 创建旅程',
    share: '📤 分享', login: '🔑 登录', feedback: '💬 反馈',
    report_view: '📊 查看报告', photo_add: '📷 添加照片'
  }
  return map[t] || t
}

function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadData() {
  try {
    // 加载分析摘要
    const summaryResult = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'getAnalyticsSummary' }
    })
    const sr = (summaryResult as { result?: { success?: boolean; data?: any } }).result
    if (sr?.success && sr.data) {
      eventTypes.value = sr.data.eventTypes || []
      dailyTrend.value = (sr.data.dailyTrend || []).slice(-30)
      maxEventCount.value = Math.max(1, ...eventTypes.value.map(e => e.count))
      maxDailyCount.value = Math.max(1, ...dailyTrend.value.map(d => d.count))
    }

    // 加载最近事件
    const eventsResult = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'getAnalytics', data: { page: 1, pageSize: 30 } }
    })
    const er = (eventsResult as { result?: { success?: boolean; data?: { list: EventItem[] } } }).result
    if (er?.success && er.data) {
      events.value = er.data.list
    }
  } catch (err) {
    console.error('加载分析数据失败:', err)
  }
}

onMounted(() => loadData())
</script>

<style scoped>
.page-header { margin-bottom: 24px; }
.page-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }

.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }

.chart-card {
  background: #fff; border-radius: 16px; padding: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.chart-title { font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 20px; }

.type-list { display: flex; flex-direction: column; gap: 12px; }
.type-row { display: flex; align-items: center; gap: 12px; }
.type-name { font-size: 13px; color: #475569; width: 90px; flex-shrink: 0; }
.type-bar-bg { flex: 1; height: 10px; background: #f1f5f9; border-radius: 5px; overflow: hidden; }
.type-bar-fill { height: 100%; background: linear-gradient(90deg, #6366f1, #a78bfa); border-radius: 5px; transition: width 0.5s ease; }
.type-count { font-size: 13px; font-weight: 700; color: #6366f1; width: 40px; text-align: right; }

.mini-chart { overflow-x: auto; padding: 8px 0; }
.line-chart-bars { display: flex; align-items: flex-end; gap: 3px; min-height: 150px; }
.mini-bar-col { flex: 1; min-width: 6px; }
.mini-bar {
  width: 100%;
  background: linear-gradient(180deg, #818cf8, #6366f1);
  border-radius: 2px 2px 0 0;
  transition: height 0.4s ease;
}

.table-card {
  background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
}
.table-wrapper { overflow-x: auto; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600;
  color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 12px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;
}

.td-id { color: #94a3b8; font-size: 13px; }
.td-time { font-size: 13px; color: #64748b; white-space: nowrap; }

.event-tag {
  display: inline-block; padding: 3px 10px; border-radius: 8px;
  background: #eef2ff; color: #6366f1; font-size: 12px; font-weight: 600;
}
.event-desc { font-size: 13px; color: #64748b; }
.user-tag {
  display: inline-block; padding: 2px 8px; background: #f1f5f9;
  border-radius: 6px; font-size: 12px; color: #475569;
}

.empty-text { text-align: center; color: #cbd5e1; }

@media (max-width: 1024px) {
  .two-col { grid-template-columns: 1fr; }
}
</style>
