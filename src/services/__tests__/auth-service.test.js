import { describe, it, expect, vi, beforeEach } from 'vitest'

// mock axios http 实例，必须在导入 auth-service 之前
vi.mock('@/plugins/axios', () => ({
  http: {
    get: vi.fn(),
  },
}))

// mock auth-storage，避免依赖真实 localStorage（auth-storage 自身已有独立测试）
vi.mock('@/services/auth-storage', () => ({
  setToken: vi.fn(),
  getUserPermissions: vi.fn(),
  setUserPermissions: vi.fn(),
  getIsAdmin: vi.fn(),
  setIsAdmin: vi.fn(),
  clearAuthSession: vi.fn(),
}))

import { http } from '@/plugins/axios'
import {
  setToken,
  getUserPermissions,
  setUserPermissions,
  getIsAdmin,
  setIsAdmin,
  clearAuthSession,
} from '@/services/auth-storage'
import {
  getCachedAuth,
  cacheUserAuth,
  applyLoginSession,
  fetchAndCacheUserInfo,
  logoutSession,
} from '../auth-service'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('auth-service - getCachedAuth', () => {
  it('getUserPermissions 返回对象时，原样返回', () => {
    getUserPermissions.mockReturnValue({ users: true })
    getIsAdmin.mockReturnValue(false)

    expect(getCachedAuth()).toEqual({ permissions: { users: true }, isAdmin: false })
  })

  it('getUserPermissions 返回 null 时，permissions 回退为空对象', () => {
    getUserPermissions.mockReturnValue(null)
    getIsAdmin.mockReturnValue(true)

    expect(getCachedAuth()).toEqual({ permissions: {}, isAdmin: true })
  })
})

describe('auth-service - cacheUserAuth', () => {
  it('普通用户：写入 permissions 和 isAdmin=false', () => {
    const result = cacheUserAuth({ permissions: { ai: true }, isAdmin: false })

    expect(setUserPermissions).toHaveBeenCalledWith({ ai: true })
    expect(setIsAdmin).toHaveBeenCalledWith(false)
    expect(result).toEqual({ permissions: { ai: true }, isAdmin: false })
  })

  it('管理员用户：写入 isAdmin=true', () => {
    const result = cacheUserAuth({ permissions: {}, isAdmin: true })

    expect(setIsAdmin).toHaveBeenCalledWith(true)
    expect(result.isAdmin).toBe(true)
  })

  it('传入空对象：permissions 回退为空对象，isAdmin 回退为 false', () => {
    const result = cacheUserAuth({})

    expect(setUserPermissions).toHaveBeenCalledWith({})
    expect(setIsAdmin).toHaveBeenCalledWith(false)
    expect(result).toEqual({ permissions: {}, isAdmin: false })
  })

  it('不传参数（undefined）：不报错，等同于空对象', () => {
    expect(() => cacheUserAuth()).not.toThrow()
    expect(setIsAdmin).toHaveBeenCalledWith(false)
  })
})

describe('auth-service - applyLoginSession', () => {
  it('payload 包含 token 时调用 setToken', () => {
    applyLoginSession({ token: 'jwt-xyz', user: { permissions: {}, isAdmin: false } })

    expect(setToken).toHaveBeenCalledWith('jwt-xyz')
  })

  it('payload 不含 token 时不调用 setToken', () => {
    applyLoginSession({ user: { permissions: {}, isAdmin: false } })

    expect(setToken).not.toHaveBeenCalled()
  })

  it('返回规范化后的 { permissions, isAdmin }', () => {
    const result = applyLoginSession({
      token: 'tok',
      user: { permissions: { users: true }, isAdmin: true },
    })

    expect(result).toEqual({ permissions: { users: true }, isAdmin: true })
  })

  it('payload 为空对象时不报错', () => {
    expect(() => applyLoginSession({})).not.toThrow()
    expect(setToken).not.toHaveBeenCalled()
  })
})

describe('auth-service - fetchAndCacheUserInfo', () => {
  it('接口 code=0 时缓存用户信息并返回合并对象', async () => {
    const userData = { username: 'zhangsan', permissions: { ai: true }, isAdmin: false }
    http.get.mockResolvedValue({ data: { code: 0, data: userData } })

    const result = await fetchAndCacheUserInfo()

    expect(http.get).toHaveBeenCalledWith('/user/info')
    expect(setUserPermissions).toHaveBeenCalledWith({ ai: true })
    expect(result.username).toBe('zhangsan')
    expect(result.permissions).toEqual({ ai: true })
  })

  it('接口 code 非 0 时抛出错误（含 message）', async () => {
    http.get.mockResolvedValue({
      data: { code: 401, data: { message: '未授权' } },
    })

    await expect(fetchAndCacheUserInfo()).rejects.toThrow('未授权')
  })

  it('接口 code 非 0 且无 message 时抛出默认错误', async () => {
    http.get.mockResolvedValue({ data: { code: 500, data: null } })

    await expect(fetchAndCacheUserInfo()).rejects.toThrow('Failed to fetch user info')
  })

  it('网络请求失败时向上抛出错误', async () => {
    http.get.mockRejectedValue(new Error('Network Error'))

    await expect(fetchAndCacheUserInfo()).rejects.toThrow('Network Error')
  })
})

describe('auth-service - logoutSession', () => {
  it('调用 clearAuthSession 清除 session', () => {
    logoutSession()

    expect(clearAuthSession).toHaveBeenCalledOnce()
  })
})
