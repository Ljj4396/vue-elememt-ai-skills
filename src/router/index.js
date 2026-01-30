import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/plugins/axios'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/users',
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/Users.vue'),
    meta: { requiresAuth: true, title: '用户管理' },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true, title: '仪表盘' },
  },
  {
    path: '/fortune',
    name: 'Fortune',
    component: () => import('@/views/FortuneCards.vue'),
    meta: { requiresAuth: true, title: '每日运势' },
  },
  {
    path: '/ai',
    name: 'AIChat',
    component: () => import('@/views/AIChat.vue'),
    meta: { requiresAuth: true, title: '智能助手' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

// 全局路由守卫
router.beforeEach((to, from, next) => {
  const token = getToken()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else {
    next()
  }
})

export default router
