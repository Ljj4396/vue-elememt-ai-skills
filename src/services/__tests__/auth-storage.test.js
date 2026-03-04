import { describe, it, expect, beforeEach } from 'vitest'
import {
  getToken,
  setToken,
  removeToken,
  getUserPermissions,
  setUserPermissions,
  removeUserPermissions,
  getIsAdmin,
  setIsAdmin,
  removeIsAdmin,
  clearAuthSession,
} from '../auth-storage'

// vitest-localstorage-mock 在 setupFiles 中已注册，每个测试前自动清空 localStorage
beforeEach(() => {
  localStorage.clear()
})

describe('auth-storage - token', () => {
  it('getToken：未设置时返回 null', () => {
    expect(getToken()).toBeNull()
  })

  it('setToken / getToken：写入后可读取', () => {
    setToken('abc123')
    expect(getToken()).toBe('abc123')
  })

  it('removeToken：移除后返回 null', () => {
    setToken('abc123')
    removeToken()
    expect(getToken()).toBeNull()
  })
})

describe('auth-storage - permissions', () => {
  it('getUserPermissions：未设置时返回 null', () => {
    expect(getUserPermissions()).toBeNull()
  })

  it('setUserPermissions / getUserPermissions：写入对象后可正确读取', () => {
    const perms = { users: true, ai: false }
    setUserPermissions(perms)
    expect(getUserPermissions()).toEqual(perms)
  })

  it('setUserPermissions：传入 null 时存储空对象', () => {
    setUserPermissions(null)
    expect(getUserPermissions()).toEqual({})
  })

  it('setUserPermissions：传入 undefined 时存储空对象', () => {
    setUserPermissions(undefined)
    expect(getUserPermissions()).toEqual({})
  })

  it('getUserPermissions：localStorage 中是无效 JSON 时返回 null', () => {
    localStorage.setItem('user_permissions', 'invalid-json{{{')
    expect(getUserPermissions()).toBeNull()
  })

  it('removeUserPermissions：移除后返回 null', () => {
    setUserPermissions({ users: true })
    removeUserPermissions()
    expect(getUserPermissions()).toBeNull()
  })
})

describe('auth-storage - isAdmin', () => {
  it('getIsAdmin：未设置时返回 false', () => {
    expect(getIsAdmin()).toBe(false)
  })

  it('setIsAdmin(true) / getIsAdmin：返回 true', () => {
    setIsAdmin(true)
    expect(getIsAdmin()).toBe(true)
  })

  it('setIsAdmin(false) / getIsAdmin：返回 false', () => {
    setIsAdmin(false)
    expect(getIsAdmin()).toBe(false)
  })

  it('setIsAdmin：传入 truthy 值（如数字 1）时存储 true', () => {
    setIsAdmin(1)
    expect(getIsAdmin()).toBe(true)
  })

  it('setIsAdmin：传入 falsy 值（如 0）时存储 false', () => {
    setIsAdmin(0)
    expect(getIsAdmin()).toBe(false)
  })

  it('removeIsAdmin：移除后返回 false', () => {
    setIsAdmin(true)
    removeIsAdmin()
    expect(getIsAdmin()).toBe(false)
  })
})

describe('auth-storage - clearAuthSession', () => {
  it('一次性清除 token、permissions、isAdmin', () => {
    setToken('tok')
    setUserPermissions({ ai: true })
    setIsAdmin(true)

    clearAuthSession()

    expect(getToken()).toBeNull()
    expect(getUserPermissions()).toBeNull()
    expect(getIsAdmin()).toBe(false)
  })

  it('在 session 本已为空时调用不报错', () => {
    expect(() => clearAuthSession()).not.toThrow()
  })
})
