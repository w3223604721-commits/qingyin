<template>
  <el-container class="h-full">
    <!-- Sidebar -->
    <el-aside width="220px" class="!bg-[#304156] flex flex-col">
      <!-- Logo -->
      <div class="h-16 flex items-center gap-3 px-5 border-b border-white/10">
        <div class="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
          <MapPin class="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 class="text-white font-semibold text-base">轻印</h1>
          <p class="text-gray-400 text-xs">后台管理系统</p>
        </div>
      </div>

      <!-- Menu -->
      <el-menu
        :default-active="activeMenu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
        class="flex-1 overflow-y-auto"
        router
      >
        <el-menu-item index="/dashboard">
          <LayoutDashboard class="w-4 h-4 mr-2" />
          <span>首页仪表盘</span>
        </el-menu-item>

        <el-sub-menu index="log">
          <template #title>
            <FileText class="w-4 h-4 mr-2" />
            <span>日志管理</span>
          </template>
          <el-menu-item index="/categories">
            <FolderTree class="w-4 h-4 mr-2" />
            <span>日志分类管理</span>
          </el-menu-item>
          <el-menu-item index="/journeys">
            <ScrollText class="w-4 h-4 mr-2" />
            <span>旅程信息维护</span>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>

    <!-- Main Area -->
    <el-container>
      <!-- Top Bar -->
      <el-header class="!bg-white !border-b !border-gray-200 flex items-center justify-between !px-6">
        <div class="flex items-center gap-3">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="currentTitle">{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="flex items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <div class="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center">
              <User class="w-4 h-4 text-indigo-500" />
            </div>
            <span>{{ authStore.username }}</span>
          </div>
          <el-button type="danger" text size="small" @click="handleLogout">
            退出登录
          </el-button>
        </div>
      </el-header>

      <!-- Content -->
      <el-main class="!bg-[#f0f2f5] !p-5">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { MapPin, LayoutDashboard, FileText, FolderTree, ScrollText, User } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const activeMenu = computed(() => route.path)
const currentTitle = computed(() => route.meta.title as string || '')

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>
