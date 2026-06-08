<template>
  <div>
    <div class="page-header">
      <h2>首页仪表盘</h2>
      <p class="text-gray-500 text-sm mt-1">轻印旅行记忆系统数据概览</p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-3 gap-5 mb-6">
      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">旅程总数</p>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.journeyCount }}</p>
          </div>
          <div class="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center">
            <FileText class="w-7 h-7 text-blue-500" />
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-4">所有用户创建的旅程</p>
      </div>

      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">分类总数</p>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.categoryCount }}</p>
          </div>
          <div class="w-14 h-14 bg-green-50 rounded-xl flex items-center justify-center">
            <FolderTree class="w-7 h-7 text-green-500" />
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-4">日志分类标签数量</p>
      </div>

      <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-gray-500 text-sm">用户总数</p>
            <p class="text-3xl font-bold text-gray-800 mt-2">{{ stats.userCount }}</p>
          </div>
          <div class="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center">
            <Users class="w-7 h-7 text-orange-500" />
          </div>
        </div>
        <p class="text-xs text-gray-400 mt-4">注册用户数量</p>
      </div>
    </div>

    <!-- Quick Actions -->
    <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 class="text-base font-semibold text-gray-800 mb-4">快捷操作</h3>
      <div class="grid grid-cols-3 gap-4">
        <router-link
          to="/categories"
          class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
        >
          <div class="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
            <FolderTree class="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700">日志分类管理</p>
            <p class="text-xs text-gray-400">新增、编辑、删除分类</p>
          </div>
        </router-link>

        <router-link
          to="/journeys"
          class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
        >
          <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
            <ScrollText class="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700">旅程信息维护</p>
            <p class="text-xs text-gray-400">查看和编辑所有旅程</p>
          </div>
        </router-link>

        <router-link
          to="/categories"
          class="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group"
        >
          <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
            <BarChart class="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p class="text-sm font-medium text-gray-700">数据洞察</p>
            <p class="text-xs text-gray-400">查看系统统计报表</p>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { callFunction } from '@/api/cloudbase'
import { FileText, FolderTree, Users, ScrollText, BarChart } from 'lucide-vue-next'

const stats = ref({
  journeyCount: 0,
  categoryCount: 0,
  userCount: 0,
})

onMounted(async () => {
  try {
    const data = await callFunction('admin-journeys', { action: 'stats' })
    if (data) {
      stats.value = {
        journeyCount: data.journeyCount || 0,
        categoryCount: data.categoryCount || 0,
        userCount: data.userCount || 0,
      }
    }
  } catch (e) {
    console.error('获取统计数据失败:', e)
  }
})
</script>
