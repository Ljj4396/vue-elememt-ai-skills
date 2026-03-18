import { createRouter, createWebHistory } from 'vue-router'
import { ElMessage } from 'element-plus'
import { setUnauthorizedHandler } from '@/plugins/axios'
import { getToken } from '@/services/auth-storage'
import { fetchAndCacheUserInfo, getCachedAuth } from '@/services/auth-service'

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

setUnauthorizedHandler(() => {
  const currentRoute = router.currentRoute.value
  if (currentRoute.name === 'Login') {
    return
  }
  ElMessage.error('Session expired, please login again')
  return router.replace({
    name: 'Login',
    query: { redirect: currentRoute.fullPath },
  })
})

async function resolveAuth() {
  const cached = getCachedAuth()
  if (Object.keys(cached.permissions || {}).length > 0 || cached.isAdmin) {
    return { ok: true, ...cached }
  }
  try {
    const userInfo = await fetchAndCacheUserInfo()
    return {
      ok: true,
      permissions: userInfo.permissions || {},
      isAdmin: userInfo.isAdmin === true,
    }
  } catch (e) {
    // 401 表示 token 已过期或无效，需要重新登录
    if (e?.response?.status === 401) {
      return { ok: false }
    }
  }
  return { ok: true, permissions: {}, isAdmin: false }
}

router.beforeEach(async (to, from, next) => {
  const token = getToken()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }

  if (to.name === 'Login' && token) {
    return next({ name: 'Dashboard' })
  }

  const requiredPermission = to.meta.permission
  const requiresPermissionCheck = requiresAuth && (requiredPermission || to.meta.adminOnly)
  if (!requiresPermissionCheck) {
    return next()
  }

  const auth = await resolveAuth()
  // token 已过期，axios 拦截器会清除 session 并跳转登录，守卫直接中止
  if (!auth.ok) {
    return next({ name: 'Login', query: { redirect: to.fullPath } })
  }
  const { permissions, isAdmin } = auth
  if (to.meta.adminOnly && !isAdmin) {
    return next({ name: 'Dashboard' })
  }
  if (requiredPermission && !isAdmin && permissions?.[requiredPermission] !== true) {
    return next({ name: 'Dashboard' })
  }

  return next()
})

export default router
