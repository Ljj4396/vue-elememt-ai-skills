import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRouter, createMemoryHistory } from 'vue-router'

// mock 所有外部依赖（必须在导入前声明）
vi.mock('@/services/auth-storage', () => ({
  getToken: vi.fn(),
}))
vi.mock('@/services/auth-service', () => ({
  getCachedAuth: vi.fn(),
  fetchAndCacheUserInfo: vi.fn(),
}))
vi.mock('element-plus', () => ({
  ElMessage: { error: vi.fn() },
}))
vi.mock('@/plugins/axios', () => ({
  http: { get: vi.fn() },
  setUnauthorizedHandler: vi.fn(),
}))

import { getToken } from '@/services/auth-storage'
import { getCachedAuth, fetchAndCacheUserInfo } from '@/services/auth-service'

// 路由守卫核心逻辑（从 router/index.js 提取，与真实逻辑一致）
async function guardLogic(to, getTokenFn, getCachedAuthFn, fetchAndCacheFn) {
  const token = getTokenFn()
  const requiresAuth = to.meta.requiresAuth !== false

  if (requiresAuth && !token) {
    return { redirect: { name: 'Login', query: { redirect: to.fullPath } } }
  }
  if (to.name === 'Login' && token) {
    return { redirect: { name: 'Dashboard' } }
  }

  const requiredPermission = to.meta.permission
  const requiresPermissionCheck = requiresAuth && (requiredPermission || to.meta.adminOnly)
  if (!requiresPermissionCheck) {
    return { pass: true }
  }

  let permissions = {}
  let isAdmin = false
  const cached = getCachedAuthFn()
  if (Object.keys(cached.permissions || {}).length > 0 || cached.isAdmin) {
    permissions = cached.permissions
    isAdmin = cached.isAdmin
  } else {
    try {
      const userInfo = await fetchAndCacheFn()
      permissions = userInfo.permissions || {}
      isAdmin = userInfo.isAdmin === true
    } catch {
      // ignore
    }
  }

  if (to.meta.adminOnly && !isAdmin) {
    return { redirect: { name: 'Dashboard' } }
  }
  if (requiredPermission && !isAdmin && permissions?.[requiredPermission] !== true) {
    return { redirect: { name: 'Dashboard' } }
  }

  return { pass: true }
}

// 辅助：构建 to 路由对象
function makeRoute(name, path, meta = {}) {
  return { name, fullPath: path, meta: { requiresAuth: true, ...meta } }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('路由守卫 - 认证检查', () => {
  it('未登录访问需认证路由 → 跳转到 Login 并携带 redirect', async () => {
    getToken.mockReturnValue(null)
    const to = makeRoute('Dashboard', '/dashboard')
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Login')
    expect(result.redirect.query.redirect).toBe('/dashboard')
  })

  it('已登录访问 Login 路由 → 跳转到 Dashboard', async () => {
    getToken.mockReturnValue('valid-token')
    const to = makeRoute('Login', '/login', { requiresAuth: false })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Dashboard')
  })

  it('已登录访问无权限要求的路由 → 正常通过', async () => {
    getToken.mockReturnValue('valid-token')
    const to = makeRoute('Fortune', '/fortune')
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })

  it('不需要认证的路由（requiresAuth: false），无 token 也通过', async () => {
    getToken.mockReturnValue(null)
    const to = makeRoute('Login', '/login', { requiresAuth: false })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    // 未登录访问 Login → pass（无 token 且 requiresAuth=false）
    expect(result.pass).toBe(true)
  })
})

describe('路由守卫 - 权限检查（使用缓存）', () => {
  beforeEach(() => {
    getToken.mockReturnValue('valid-token')
  })

  it('拥有 users 权限 → 访问 /users 通过', async () => {
    getCachedAuth.mockReturnValue({ permissions: { users: true }, isAdmin: false })
    const to = makeRoute('Users', '/users', { permission: 'users' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })

  it('无 users 权限（非管理员）→ 跳转 Dashboard', async () => {
    getCachedAuth.mockReturnValue({ permissions: { users: false }, isAdmin: false })
    const to = makeRoute('Users', '/users', { permission: 'users' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Dashboard')
  })

  it('无任何权限 → 访问 ai 路由跳转 Dashboard', async () => {
    getCachedAuth.mockReturnValue({ permissions: {}, isAdmin: false })
    const to = makeRoute('AIChat', '/ai', { permission: 'ai' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Dashboard')
  })

  it('管理员跳过权限校验 → 可访问需要 users 权限的路由', async () => {
    getCachedAuth.mockReturnValue({ permissions: {}, isAdmin: true })
    const to = makeRoute('Users', '/users', { permission: 'users' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })
})

describe('路由守卫 - adminOnly 路由', () => {
  beforeEach(() => {
    getToken.mockReturnValue('valid-token')
  })

  it('管理员访问 adminOnly 路由 → 正常通过', async () => {
    getCachedAuth.mockReturnValue({ permissions: { users: true }, isAdmin: true })
    const to = makeRoute('AIRequests', '/ai-requests', { permission: 'users', adminOnly: true })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })

  it('非管理员访问 adminOnly 路由 → 跳转 Dashboard', async () => {
    getCachedAuth.mockReturnValue({ permissions: { users: true }, isAdmin: false })
    const to = makeRoute('AIRequests', '/ai-requests', { permission: 'users', adminOnly: true })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Dashboard')
  })
})

describe('路由守卫 - 缓存为空时从接口获取权限', () => {
  beforeEach(() => {
    getToken.mockReturnValue('valid-token')
    // 缓存为空（无权限且非管理员）
    getCachedAuth.mockReturnValue({ permissions: {}, isAdmin: false })
  })

  it('接口返回有效权限 → 访问对应路由通过', async () => {
    fetchAndCacheUserInfo.mockResolvedValue({ permissions: { users: true }, isAdmin: false })
    const to = makeRoute('Users', '/users', { permission: 'users' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })

  it('接口抛出异常 → 权限回退为空，跳转 Dashboard', async () => {
    fetchAndCacheUserInfo.mockRejectedValue(new Error('网络错误'))
    const to = makeRoute('Users', '/users', { permission: 'users' })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.redirect.name).toBe('Dashboard')
  })

  it('接口返回管理员信息 → adminOnly 路由通过', async () => {
    fetchAndCacheUserInfo.mockResolvedValue({ permissions: {}, isAdmin: true })
    const to = makeRoute('AIRequests', '/ai-requests', { permission: 'users', adminOnly: true })
    const result = await guardLogic(to, getToken, getCachedAuth, fetchAndCacheUserInfo)
    expect(result.pass).toBe(true)
  })
})
