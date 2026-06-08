import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { tcbAuth } from '@/api/cloudbase'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresAuth: false },
    },
    {
      path: '/',
      component: () => import('@/views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/dashboard',
        },
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '首页' },
        },
        {
          path: 'categories',
          name: 'CategoryManage',
          component: () => import('@/views/categories/CategoryManage.vue'),
          meta: { title: '日志分类管理' },
        },
        {
          path: 'journeys',
          name: 'JourneyManage',
          component: () => import('@/views/journeys/JourneyManage.vue'),
          meta: { title: '旅程信息维护' },
        },
      ],
    },
  ],
})

router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth === false) {
    if (to.path === '/login' && authStore.isLoggedIn) {
      return next('/dashboard')
    }
    return next()
  }

  if (!authStore.isLoggedIn) {
    const hasSession = await authStore.checkSession()
    if (!hasSession) {
      return next('/login')
    }
  }

  next()
})

export default router
