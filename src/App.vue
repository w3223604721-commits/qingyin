<template>
  <div class="container-app">
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 底部 Tab 导航（后台页面不显示） -->
    <nav v-if="!isAdminRoute" class="tab-bar">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        class="tab-item"
        :class="{ active: currentPath === tab.path }"
        @click="switchTab(tab.path)"
      >
        <span class="tab-item-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const tabs = [
  { path: '/journal', label: '日志', icon: '📔' },
  { path: '/checkin', label: '打卡', icon: '📍' },
  { path: '/share', label: '分享', icon: '📤' },
  { path: '/profile', label: '我的', icon: '👤' },
]

const currentPath = computed(() => route.path)
const isAdminRoute = computed(() => route.path.startsWith('/admin'))

function switchTab(path: string) {
  if (currentPath.value !== path) {
    router.push(path)
  }
}
</script>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
