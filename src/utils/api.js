const configuredBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const pendingGets = new Map()

export const AUTH_STORAGE_KEY = 'youshu-auth-token'
export const AUTH_EXPIRED_EVENT = 'youshu-auth-expired'

// 同域部署默认走当前站点；前后端分离时由 VITE_API_BASE 覆盖。
export const API_BASE = configuredBase || (typeof window !== 'undefined' ? window.location.origin : '')

export function apiUrl(endpoint) {
  return `${API_BASE}/api/${String(endpoint).replace(/^\//, '')}`
}

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

function expireAuthSession() {
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

export async function apiFetch(endpoint, { auth = true, timeoutMs = 10000, headers, signal, ...options } = {}) {
  const requestHeaders = new Headers(headers || {})
  if (auth) {
    const token = localStorage.getItem(AUTH_STORAGE_KEY) || ''
    if (!token) {
      expireAuthSession()
      throw new ApiError('登录已失效，请重新登录', 401)
    }
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(apiUrl(endpoint), {
    cache: 'no-store',
    ...options,
    headers: requestHeaders,
    signal: signal || (timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
  })
  if (auth && response.status === 401) expireAuthSession()
  return response
}

export async function requestApiJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error || `API ${endpoint} 返回 ${response.status}`, response.status, data)
  return data
}

export function getApiJson(endpoint, { dedupe = true, ...options } = {}) {
  const key = `${options.auth === false ? 'public' : 'private'}:${endpoint}`
  if (dedupe && pendingGets.has(key)) return pendingGets.get(key)
  const request = requestApiJson(endpoint, { ...options, method: 'GET' })
  if (!dedupe) return request
  pendingGets.set(key, request)
  request.finally(() => pendingGets.delete(key)).catch(() => {})
  return request
}
