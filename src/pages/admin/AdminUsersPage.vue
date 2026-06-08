<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">👥 用户管理</h1>
        <p class="page-subtitle">查看和管理注册用户</p>
      </div>
      <div class="header-actions">
        <input v-model="searchQuery" class="search-input" placeholder="搜索昵称或手机号..." @keyup.enter="loadUsers(1)" />
        <button class="btn btn-primary" @click="loadUsers(1)">搜索</button>
      </div>
    </div>

    <div class="table-card">
      <div v-if="loading" class="loading-state">加载中...</div>
      <div v-else-if="users.length === 0" class="empty-state"><span class="empty-icon">👥</span><p>暂无用户数据</p></div>
      <div v-else class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:50px;">#</th>
              <th>用户信息</th>
              <th style="width:120px;">角色</th>
              <th style="width:100px;">反馈数</th>
              <th style="width:160px;">注册时间</th>
              <th style="width:100px;">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, i) in users" :key="u._id">
              <td class="td-id">{{ (page - 1) * pageSize + i + 1 }}</td>
              <td>
                <div class="user-info">
                  <div class="user-avatar">{{ (u.nickname || '?')[0] }}</div>
                  <div>
                    <p class="user-name">{{ u.nickname || '未设置昵称' }}</p>
                    <p class="user-meta" v-if="u.phone">📱 {{ u.phone }}</p>
                    <p class="user-meta" v-if="u.userId">ID: {{ u.userId.slice(0, 12) }}...</p>
                  </div>
                </div>
              </td>
              <td>
                <span class="role-tag" :class="'role-' + (u.role || 'user')">
                  {{ u.role === 'admin' ? '管理员' : '用户' }}
                </span>
              </td>
              <td>
                <span class="stat-num">{{ u.feedbackCount || 0 }}</span>
              </td>
              <td class="td-time">{{ formatTime(u.createdAt) }}</td>
              <td>
                <button v-if="u.role !== 'admin'" class="btn btn-sm btn-outline" @click="setAdminRole(u._id, 'admin')">
                  设为管理员
                </button>
                <button v-else class="btn btn-sm btn-warning" @click="setAdminRole(u._id, 'user')">
                  取消管理员
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="total > pageSize" class="pagination">
        <button class="btn btn-sm" :disabled="page <= 1" @click="loadUsers(page - 1)">上一页</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="btn btn-sm" :disabled="page >= totalPages" @click="loadUsers(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { app } from '../../utils/cloudbase'

interface UserItem {
  _id: string
  nickname?: string
  phone?: string
  userId?: string
  role?: string
  feedbackCount?: number
  createdAt: string
}

const users = ref<UserItem[]>([])
const loading = ref(true)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const searchQuery = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function formatTime(t: string) {
  if (!t) return '-'
  const d = new Date(t)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function loadUsers(pg: number) {
  loading.value = true
  page.value = pg
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'getUsers', data: { page: pg, pageSize: pageSize.value, search: searchQuery.value || undefined } }
    })
    const r = (result as { result?: { success?: boolean; data?: { list: UserItem[]; total: number } } }).result
    if (r?.success && r.data) {
      users.value = r.data.list
      total.value = r.data.total
    }
  } catch (err) {
    console.error('加载用户失败:', err)
  } finally {
    loading.value = false
  }
}

async function setAdminRole(userId: string, role: string) {
  try {
    const result = await app.callFunction({
      name: 'qingyin-admin',
      data: { action: 'setAdminRole', data: { userId, role } }
    })
    if ((result as { result?: { success?: boolean } }).result?.success) {
      loadUsers(page.value)
    }
  } catch (err) {
    console.error('设置角色失败:', err)
  }
}

onMounted(() => loadUsers(1))
</script>

<style scoped>
.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
}
.page-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; }
.page-subtitle { color: #94a3b8; font-size: 14px; margin: 4px 0 0; }
.header-actions { display: flex; gap: 8px; }

.search-input {
  padding: 8px 14px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 14px; width: 220px; outline: none;
}
.search-input:focus { border-color: #6366f1; }

.table-card { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden; }
.table-wrapper { overflow-x: auto; }

.data-table { width: 100%; border-collapse: collapse; }
.data-table th {
  text-align: left; padding: 14px 16px; font-size: 12px; font-weight: 600;
  color: #94a3b8; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
}
.data-table td {
  padding: 14px 16px; font-size: 14px; color: #334155; border-bottom: 1px solid #f1f5f9;
}

.td-id { color: #94a3b8; font-size: 13px; }

.user-info { display: flex; align-items: center; gap: 12px; }
.user-avatar {
  width: 40px; height: 40px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a78bfa);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 700; flex-shrink: 0;
}
.user-name { font-weight: 600; margin: 0; }
.user-meta { font-size: 12px; color: #94a3b8; margin: 2px 0 0; font-family: monospace; }

.role-tag {
  display: inline-block; padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 600;
}
.role-user { background: #f1f5f9; color: #64748b; }
.role-admin { background: #fce7f3; color: #db2777; }

.stat-num { font-weight: 700; color: #6366f1; }
.td-time { font-size: 13px; color: #64748b; white-space: nowrap; }

.btn { padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; }
.btn-sm { padding: 5px 10px; font-size: 12px; }
.btn-primary { background: #6366f1; color: #fff; }
.btn-outline { border: 1px solid #6366f1; color: #6366f1; background: #fff; }
.btn-warning { border: 1px solid #f59e0b; color: #f59e0b; background: #fff; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 16px; }
.page-info { font-size: 13px; color: #64748b; }

.loading-state, .empty-state { padding: 80px 20px; text-align: center; color: #94a3b8; }
.empty-icon { font-size: 48px; display: block; margin-bottom: 8px; }
</style>
