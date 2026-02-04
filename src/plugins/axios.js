import axios from 'axios'
import router from '@/router'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30_000,
})

const PERMISSIONS_KEY = 'user_permissions'
const ADMIN_KEY = 'user_is_admin'

// Token 工具函数
export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function removeToken() {
  localStorage.removeItem('token')
  removeUserPermissions()
  removeIsAdmin()
}

export function getUserPermissions() {
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setUserPermissions(permissions) {
  try {
    localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(permissions || {}))
  } catch {
    // ignore storage errors
  }
}

export function removeUserPermissions() {
  localStorage.removeItem(PERMISSIONS_KEY)
}

export function getIsAdmin() {
  return localStorage.getItem(ADMIN_KEY) === 'true'
}

export function setIsAdmin(isAdmin) {
  localStorage.setItem(ADMIN_KEY, isAdmin ? 'true' : 'false')
}

export function removeIsAdmin() {
  localStorage.removeItem(ADMIN_KEY)
}

http.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

http.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401: token 无效或过期 -> 跳转登录
    if (error.response?.status === 401) {
      removeToken()
      // 避免重复跳转
      if (router.currentRoute.value.name !== 'Login') {
        ElMessage.error('登录已过期，请重新登录')
        router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    return Promise.reject(error)
  },
)

export default {
  install(app) {
    app.config.globalProperties.$http = http
    app.provide('http', http)
  },
}

