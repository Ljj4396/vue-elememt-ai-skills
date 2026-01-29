import axios from 'axios'
import router from '@/router'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30_000,
})

// Token 工具函数
export function getToken() {
  return localStorage.getItem('token')
}

export function setToken(token) {
  localStorage.setItem('token', token)
}

export function removeToken() {
  localStorage.removeItem('token')
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

