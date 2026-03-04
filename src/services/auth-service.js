import { http } from '@/plugins/axios'
import {
  setToken,
  getUserPermissions,
  setUserPermissions,
  getIsAdmin,
  setIsAdmin,
  clearAuthSession,
} from '@/services/auth-storage'

function normalizeAuthPayload(user = {}) {
  return {
    permissions: user.permissions || {},
    isAdmin: user.isAdmin === true,
  }
}

export function getCachedAuth() {
  return {
    permissions: getUserPermissions() || {},
    isAdmin: getIsAdmin(),
  }
}

export function cacheUserAuth(user = {}) {
  const normalized = normalizeAuthPayload(user)
  setUserPermissions(normalized.permissions)
  setIsAdmin(normalized.isAdmin)
  return normalized
}

export function applyLoginSession(payload = {}) {
  if (payload.token) {
    setToken(payload.token)
  }
  return cacheUserAuth(payload.user || {})
}

export async function fetchAndCacheUserInfo() {
  const { data: res } = await http.get('/user/info')
  if (res.code !== 0) {
    throw new Error(res.data?.message || 'Failed to fetch user info')
  }
  const auth = cacheUserAuth(res.data || {})
  return {
    ...res.data,
    ...auth,
  }
}

export function logoutSession() {
  clearAuthSession()
}
