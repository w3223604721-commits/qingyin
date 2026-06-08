<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">💬 反馈管理</h1>
        <p class="page-subtitle">查看和处理用户提交的反馈和建议</p>
      </div>
      <div class="header-actions">
        <select v-model="statusFilter" class="filter-select" @change="loadFeedback(1)">
          <option value="">全部状态</option>
          <option value="pending">待处理</option>
          <option value="read">已读</option>
          <option value="resolved">已解决</option>
          <option value="closed">已关闭</option>
        </select>
      </div>
    </div>

    <!-- 反馈列表 -->
    <div class="table-card">
      <div v-if="loading" class="loading-state">
        <span>加载中...</span>
      </div>

      <div v-else-if="feedbacks.length === 0" class="empty-state">
        <span class="empty-icon">📭</span>
        <p>暂无反馈数据</p>
      </div>

      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>内容</th>
              <th style="width:120px;">用户</th>
              <th style="width:100px;">状态</th>
              <th style="width:160px;">提交时间</th>
              <th style="width:120px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(fb, i) in feedbacks" :key="fb._id" :class="{ 'row-unread': fb.status === 'pending' }">
              <td class="td-id">{{ (page - 1) * pageSize + i + 1 }}</td>
              <td>
                <div class="feedback-content">
                  <p class="fb-text">{{ fb.content || '(空)' }}</p>
                  <p v-if="fb.adminNote" class="fb-note">📝 {{ fb.adminNote }}</p>
                </div>
              </td>
              <td>
                <span class="user-tag">{{ fb.nickName || '匿名用户' }}</span>
                <p class="user-id" v-if="fb.userId">{{ fb.userId.slice(-8) }}</p>
              </td>
              <td>
                <span class="status-tag" :class="'status-' + (fb.status || 'pending')">
                  {{ statusLabel(fb.status) }}
                </span>
              </td>
              <td class="td-time">{{ formatTime(fb.createdAt) }}</td>
              <td class="td-actions">
                <button 
                  v-if="fb.status === 'pending'"
                  class="btn btn-sm btn-primary"
                  @click="updateStatus(fb._id, 'read')">
                  标记已读
                </button>
                <button 
                  v-if="fb.status !== 'resolved'"
                  class="btn btn-sm btn-success"
                  @click="updateStatus(fb._id, 'resolved')">
                  解决
                </button>
                <button class="btn btn-sm btn-danger" @click="deleteFeedback(fb._id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="pagination">
        <button class="btn btn-sm" :disabled="page <= 1" @click="loadFeedback(page - 1)">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="page >= totalPages" @click="loadFeedback(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { app } from '../../utils/cloudbase'

interface FeedbackItem {
  _id: string
  content: string
  nickName?: string
  userId?: string
  status: string
  adminNote?: string
  createdAt: string
}

const feedbacks = ref<FeedbackItem[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(15)
const total = ref(0)
const statusFilter = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function statusLabel(s: string) {
  const map: Record<string, string> = { pending: '待处理', read: '已读', resolved: '已解决', closed: '已关闭' }
  return map[s] || s
}

function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadFeedback(pg: number) {
  loading.value = true
  page.value = pg
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'getFeedback', data: { page: pg, pageSize: pageSize.value, status: statusFilter.value || undefined } }
    })
    const r = (result as { result?: { success?: boolean; data?: { list: FeedbackItem[]; total: number; page: number } } }).result
    if (r?.success && r.data) {
      feedbacks.value = r.data.list
      total.value = r.data.total
    }
  } catch (err) {
    console.error('加载反馈失败:', err)
  } finally {
    loading.value = false
  }
}

async function updateStatus(feedbackId: string, status: string) {
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'updateFeedback', data: { feedbackId, status } }
    })
    if ((result as { result?: { success?: boolean } }).result?.success) {
      loadFeedback(page.value)
    }
  } catch (err) {
    console.error('更新状态失败:', err)
  }
}

async function deleteFeedback(feedbackId: string) {
  if (!confirm('确定删除这条反馈吗？')) return
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'deleteFeedback', data: { feedbackId } }
    })
    if ((result as { result?: { success?: boolean } }).result?.success) {
      loadFeedback(page.value)
    }
  } catch (err) {
    console.error('删除反馈失败:', err)
  }
}

onMounted(() => loadFeedback(1))
</script>

<style scoped>
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }

.filter-select {
  padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; color: #475569; background: #fff; cursor: pointer;
}

.table-card {
  background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  overflow: hidden;
}

.table-wrapper { overflow-x: auto; }

.data-table {
  width: 100%; border-collapse: collapse;
}
.data-table th {
  text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 600;
  color: #94a3b8; text-transform: uppercase; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
}

.row-unread { background: #fefce8; }
.row-unread td:first-child { font-weight: 800; color: #6366f1; }

.td-id { color: #94a3b8; font-size: 13px; }

.feedback-content { max-width: 400px; }
.fb-text { margin: 0; line-height: 1.6; word-break: break-word; }
.fb-note { margin: 4px 0 0; font-size: 12px; color: #6366f1; }

.user-tag {
  display: inline-block; padding: 2px 8px; background: #f1f5f9; border-radius: 6px;
  font-size: 12px; color: #475569;
}
.user-id { font-size: 10px; color: #cbd5e1; margin: 2px 0 0; font-family: monospace; }

.status-tag {
  display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;
}
.status-pending { background: #fef3c7; color: #d97706; }
.status-read { background: #dbeafe; color: #2563eb; }
.status-resolved { background: #d1fae5; color: #059669; }
.status-closed { background: #f1f5f9; color: #64748b; }

.td-time { font-size: 13px; color: #64748b; white-space: nowrap; }

.td-actions { display: flex; gap: 6px; flex-wrap: wrap; }

.btn {
  padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600;
  border: none; cursor: pointer; transition: all 0.15s;
}
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-primary:hover { background: #4f46e5; }
.btn-success { background: #10b981; color: #fff; }
.btn-success:hover { background: #059669; }
.btn-danger { background: #f1f5f9; color: #ef4444; }
.btn-danger:hover { background: #fef2f2; }

.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 16px; padding: 16px;
}
.page-info { font-size: 13px; color: #64748b; }

.loading-state, .empty-state {
  padding: 80px 20px; text-align: center; color: #94a3b8;
}
.empty-icon { font-size: 48px; display: block; margin-bottom: 8px; }
</style>
