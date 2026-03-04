import axios from 'axios'
import { clearAuthSession, getToken } from '@/services/auth-storage'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 30_000,
})

let unauthorizedHandler = null
let handlingUnauthorized = false

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null
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
    if (error.response?.status === 401) {
      clearAuthSession()
      if (!handlingUnauthorized && unauthorizedHandler) {
        handlingUnauthorized = true
        Promise.resolve(unauthorizedHandler()).finally(() => {
          handlingUnauthorized = false
        })
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
