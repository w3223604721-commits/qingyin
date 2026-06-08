<template>
  <div>
    <h1 class="page-title">📊 数据看板</h1>
    <p class="page-subtitle">轻印应用运行概览</p>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-card-icon" style="background:#eef2ff;color:#6366f1;">💬</div>
        <div class="stat-card-info">
          <p class="stat-card-num">{{ stats.feedbackTotal }}</p>
          <p class="stat-card-label">反馈总数</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:#fef3c7;color:#f59e0b;">🕐</div>
        <div class="stat-card-info">
          <p class="stat-card-num">{{ stats.feedbackPending }}</p>
          <p class="stat-card-label">待处理反馈</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:#d1fae5;color:#10b981;">👥</div>
        <div class="stat-card-info">
          <p class="stat-card-num">{{ stats.userTotal }}</p>
          <p class="stat-card-label">注册用户</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-card-icon" style="background:#fce7f3;color:#ec4899;">📈</div>
        <div class="stat-card-info">
          <p class="stat-card-num">{{ stats.analyticsTotal }}</p>
          <p class="stat-card-label">分析事件</p>
        </div>
      </div>
    </div>

    <!-- 反馈趋势图表 -->
    <div class="chart-card">
      <h3 class="chart-title">📅 近14天反馈趋势</h3>
      <div v-if="stats.trend.length > 0" class="chart-wrapper">
        <div class="bar-chart">
          <div v-for="t in stats.trend" :key="t.date" class="bar-col">
            <div class="bar-fill" :style="{ height: getBarHeight(t.count) }" :title="`${t.date}: ${t.count}条`">
              <span class="bar-label">{{ t.count }}</span>
            </div>
            <span class="bar-date">{{ formatDateLabel(t.date) }}</span>
          </div>
        </div>
      </div>
      <p v-else class="empty-text">暂无数据</p>
    </div>

    <!-- 快捷入口 -->
    <div class="quick-links">
      <h3 class="chart-title">🚀 快捷入口</h3>
      <div class="quick-grid">
        <router-link to="/admin/feedback" class="quick-card">
          <span class="quick-icon">💬</span>
          <span class="quick-label">反馈管理</span>
          <span class="quick-desc">查看和处理用户反馈</span>
        </router-link>
        <router-link to="/admin/users" class="quick-card">
          <span class="quick-icon">👥</span>
          <span class="quick-label">用户管理</span>
          <span class="quick-desc">查看注册用户列表</span>
        </router-link>
        <router-link to="/admin/analytics" class="quick-card">
          <span class="quick-icon">📈</span>
          <span class="quick-label">数据分析</span>
          <span class="quick-desc">查看应用使用数据</span>
        </router-link>
        <a :href="'https://tcb.cloud.tencent.com/dev?envId=' + envId + '#/db/doc/collection/qingyin_feedback'" target="_blank" class="quick-card">
          <span class="quick-icon">🗄</span>
          <span class="quick-label">数据库管理</span>
          <span class="quick-desc">直接管理 CloudBase 数据库</span>
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { app, ENV_ID } from '../../utils/cloudbase'

const envId = ENV_ID

interface StatData {
  feedbackTotal: number
  feedbackPending: number
  userTotal: number
  analyticsTotal: number
  trend: { date: string; count: number }[]
}

const stats = ref<StatData>({
  feedbackTotal: 0, feedbackPending: 0,
  userTotal: 0, analyticsTotal: 0, trend: []
})

const maxCount = ref(1)

async function loadStats() {
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'getDashboardStats' }
    })
    if ((result as { result?: { success?: boolean; data?: StatData } }).result?.success) {
      const d = (result as { result: { data: StatData } }).result.data
      stats.value = d
      maxCount.value = Math.max(1, ...d.trend.map(t => t.count))
    }
  } catch (err) {
    console.error('加载数据失败:', err)
  }
}

function getBarHeight(count: number) {
  return Math.max(4, (count / maxCount.value) * 200) + 'px'
}

function formatDateLabel(dateStr: string) {
  const parts = dateStr.split('-')
  return `${parts[1] || ''}/${parts[2] || ''}`
}

onMounted(() => loadStats())
</script>

<style scoped>
.page-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #94a3b8; font-size: 14px; margin: 4px 0 24px; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-card-icon {
  width: 48px; height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.stat-card-num {
  font-size: 28px; font-weight: 800; color: #1e293b; margin: 0;
}

.stat-card-label {
  font-size: 13px; color: #94a3b8; margin: 2px 0 0;
}

.chart-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.chart-title {
  font-size: 16px; font-weight: 700; color: #1e293b; margin: 0 0 20px;
}

.chart-wrapper { overflow-x: auto; padding-bottom: 8px; }

.bar-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  min-height: 220px;
  padding-top: 8px;
}

.bar-col {
  flex: 1;
  min-width: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.bar-fill {
  width: 100%;
  max-width: 48px;
  background: linear-gradient(180deg, #818cf8, #6366f1);
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 6px;
  transition: height 0.4s ease;
}

.bar-label {
  font-size: 11px; color: #fff; font-weight: 600;
}

.bar-date {
  font-size: 11px; color: #94a3b8;
  writing-mode: horizontal-tb;
}

.empty-text {
  text-align: center; color: #cbd5e1; padding: 40px 0;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.quick-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-decoration: none;
  transition: all 0.2s;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
}

.quick-card:hover {
  border-color: #818cf8;
  box-shadow: 0 4px 12px rgba(99,102,241,0.12);
  transform: translateY(-2px);
}

.quick-icon { font-size: 28px; }
.quick-label { font-size: 15px; font-weight: 700; color: #1e293b; }
.quick-desc { font-size: 12px; color: #94a3b8; }

@media (max-width: 1024px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .quick-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
