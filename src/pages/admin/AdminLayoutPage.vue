<template>
  <div class="admin-shell">
    <!-- 侧边栏 -->
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">轻印 · 后台</h2>
        <p class="sidebar-env">CloudBase {{ envId.slice(0, 8) }}...</p>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/admin" class="sidebar-link" :class="{ active: route.path === '/admin' }">
          <span class="nav-icon">📊</span>
          <span>数据看板</span>
        </router-link>
        <router-link to="/admin/feedback" class="sidebar-link" :class="{ active: route.path.startsWith('/admin/feedback') }">
          <span class="nav-icon">💬</span>
          <span>反馈管理</span>
        </router-link>
        <router-link to="/admin/users" class="sidebar-link" :class="{ active: route.path.startsWith('/admin/users') }">
          <span class="nav-icon">👥</span>
          <span>用户管理</span>
        </router-link>
        <router-link to="/admin/analytics" class="sidebar-link" :class="{ active: route.path.startsWith('/admin/analytics') }">
          <span class="nav-icon">📈</span>
          <span>数据分析</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <a :href="'https://ai-native-d5gv1bzqle900971e-1439954016.tcloudbaseapp.com/#/' + redirectPath" class="sidebar-link exit-link">
          <span class="nav-icon">🏠</span>
          <span>返回首页</span>
        </a>
        <a :href="'https://tcb.cloud.tencent.com/dev?envId=' + envId + '#/overview'" target="_blank" class="sidebar-link console-link">
          <span class="nav-icon">☁️</span>
          <span>CloudBase 控制台</span>
        </a>
      </div>
    </aside>

    <!-- 内容区 -->
    <main class="admin-main">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { ENV_ID } from '../../utils/cloudbase'

const route = useRoute()
const envId = ENV_ID
const redirectPath = ''
</script>

<style scoped>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #f1f5f9;
}

.admin-sidebar {
  width: 240px;
  background: linear-gradient(180deg, #1e1b4b 0%, #312e81 100%);
  color: #e0e7ff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0; left: 0; bottom: 0;
  z-index: 100;
  overflow-y: auto;
}

.sidebar-header {
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.sidebar-title {
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  margin: 0;
}
.sidebar-env {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  margin: 4px 0 0;
  font-family: monospace;
}

.sidebar-nav {
  flex: 1;
  padding: 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: #c7d2fe;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.15s;
}
.sidebar-link:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.sidebar-link.active {
  background: rgba(255,255,255,0.15);
  color: #fff;
  font-weight: 700;
}

.nav-icon { font-size: 18px; width: 24px; text-align: center; }

.sidebar-footer {
  padding: 12px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.exit-link, .console-link {
  font-size: 12px !important;
}

.admin-main {
  flex: 1;
  margin-left: 240px;
  padding: 24px;
  min-height: 100vh;
}

@media (max-width: 768px) {
  .admin-sidebar {
    width: 200px;
  }
  .admin-main {
    margin-left: 200px;
    padding: 16px;
  }
}
</style>
