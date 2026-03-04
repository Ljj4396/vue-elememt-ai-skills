const TOKEN_KEY = 'token'
const PERMISSIONS_KEY = 'user_permissions'
const ADMIN_KEY = 'user_is_admin'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY)
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

export function clearAuthSession() {
  removeToken()
  removeUserPermissions()
  removeIsAdmin()
}
