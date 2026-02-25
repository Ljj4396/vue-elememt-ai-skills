import { createRouter, createWebHistory } from 'vue-router'
import {
  getToken,
  getUserPermissions,
  setUserPermissions,
  getIsAdmin,
  setIsAdmin,
  http,
} from '@/plugins/axios'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    redirect: '/dashboard',
  },
  {
    path: '/users',
    name: 'Users',
    component: () => import('@/views/Users.vue'),
    meta: { requiresAuth: true, title: '用户管理', permission: 'users' },
  },
  {
    path: '/permissions',
    name: 'Permissions',
    component: () => import('@/views/Permissions.vue'),
    meta: { requiresAuth: true, title: '权限控制', permission: 'users' },
  },
  {
    path: '/balance',
    name: 'BalanceSheet',
    component: () => import('@/views/BalanceSheet.vue'),
    meta: { requiresAuth: true, title: '余额表' },
  },
  {
    path: '/ai-requests',
    name: 'AIRequests',
    component: () => import('@/views/AIRequests.vue'),
    meta: { requiresAuth: true, title: '权限申请', permission: 'users', adminOnly: true },
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
    meta: { requiresAuth: true, title: '智能助手', permission: 'ai' },
  },
  {
    path: '/theme',
    name: 'ThemeSelector',
    component: () => import('@/views/ThemeSelector.vue'),
    meta: { requiresAuth: true, title: '主题选择' },
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
async function resolveAuth() {
  const cachedPermissions = getUserPermissions()
  const cachedAdmin = getIsAdmin()
  if (cachedPermissions || cachedAdmin) {
    return { permissions: cachedPermissions || {}, isAdmin: cachedAdmin }
  }
  try {
    const { data: res } = await http.get('/user/info')
    if (res.code === 0) {
      setUserPermissions(res.data.permissions || {})
      setIsAdmin(res.data.isAdmin === true)
      return { permissions: res.data.permissions || {}, isAdmin: res.data.isAdmin === true }
    }
  } catch {
    // ignore
  }
  return { permissions: {}, isAdmin: false }
}

// 全局路由守卫
router.beforeEach(async (to, from, next) => {
  const token = getToken()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if (to.name === 'Login' && token) {
    next({ name: 'Dashboard' })
  } else {
    const requiredPermission = to.meta.permission
    if (requiresAuth && requiredPermission) {
      const { permissions, isAdmin } = await resolveAuth()
      if (to.meta.adminOnly && !isAdmin) {
        return next({ name: 'Dashboard' })
      }
      if (!isAdmin && permissions?.[requiredPermission] !== true) {
        return next({ name: 'Dashboard' })
      }
    }
    next()
  }
})

export default router
