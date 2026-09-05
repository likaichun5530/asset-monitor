const configuredBase = (import.meta.env?.VITE_API_BASE || '').replace(/\/$/, '')
const pendingGets = new Map()
const getCache = new Map()
let cacheEpoch = 0
let privateSessionToken = null
let privateSessionId = 0

const GET_CACHE_TTL_MS = Object.freeze({
  holdings: 15_000,
  market: 20_000,
  futures: 20_000,
  target: 15_000,
  subscriptions: 5 * 60 * 1000,
})

const MUTATION_INVALIDATIONS = Object.freeze({
  holdings: ['holdings', 'target'],
  snapshot: ['history'],
  history: ['history'],
})

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

function readAuthToken() {
  try { return localStorage.getItem(AUTH_STORAGE_KEY) || '' } catch { return '' }
}

function resourceName(endpoint) {
  const normalized = String(endpoint).replace(/^\//, '')
  const [path, query = ''] = normalized.split('?', 2)
  if (path === 'market' && new URLSearchParams(query).get('view') === 'subscriptions') return 'subscriptions'
  return path.split('#', 1)[0]
}

function deleteMatchingEntries(predicate) {
  for (const [key, entry] of getCache) {
    if (predicate(entry)) getCache.delete(key)
  }
  for (const [key, entry] of pendingGets) {
    if (predicate(entry)) pendingGets.delete(key)
  }
}

export function clearPrivateApiCache() {
  cacheEpoch += 1
  privateSessionToken = null
  privateSessionId += 1
  deleteMatchingEntries((entry) => entry.private)
}

export function invalidateApiCache(resources) {
  const names = new Set((Array.isArray(resources) ? resources : [resources]).filter(Boolean).map(resourceName))
  if (!names.size) return
  cacheEpoch += 1
  deleteMatchingEntries((entry) => names.has(entry.resource))
}

function privateScope(token) {
  if (token !== privateSessionToken) {
    clearPrivateApiCache()
    privateSessionToken = token
  }
  return `private:${privateSessionId}`
}

function cacheContext(endpoint, auth) {
  const isPrivate = auth !== false
  const token = isPrivate ? readAuthToken() : ''
  const scope = isPrivate ? privateScope(token) : 'public'
  return {
    key: `${scope}:${endpoint}`,
    private: isPrivate,
    resource: resourceName(endpoint),
  }
}

function expireAuthSession() {
  clearPrivateApiCache()
  try { localStorage.removeItem(AUTH_STORAGE_KEY) } catch { /* ignore */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT))
}

export async function apiFetch(endpoint, { auth = true, timeoutMs = 10000, headers, signal, ...options } = {}) {
  const requestHeaders = new Headers(headers || {})
  let requestToken = ''
  if (auth) {
    requestToken = readAuthToken()
    if (!requestToken) {
      expireAuthSession()
      throw new ApiError('登录已失效，请重新登录', 401)
    }
    privateScope(requestToken)
    requestHeaders.set('Authorization', `Bearer ${requestToken}`)
  }
  const response = await fetch(apiUrl(endpoint), {
    cache: 'no-store',
    ...options,
    headers: requestHeaders,
    signal: signal || (timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined),
  })
  // 旧会话的迟到响应不能清除刚刚登录的新会话。
  if (auth && response.status === 401 && readAuthToken() === requestToken) expireAuthSession()
  return response
}

export async function requestApiJson(endpoint, options = {}) {
  const response = await apiFetch(endpoint, options)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new ApiError(data.error || `API ${endpoint} 返回 ${response.status}`, response.status, data)
  const method = String(options.method || 'GET').toUpperCase()
  if (method !== 'GET') {
    const resources = MUTATION_INVALIDATIONS[resourceName(endpoint)]
    if (resources) invalidateApiCache(resources)
  }
  return data
}

export function getApiJson(endpoint, {
  dedupe = true,
  forceRefresh = false,
  cacheTtlMs = GET_CACHE_TTL_MS[resourceName(endpoint)] || 0,
  ...options
} = {}) {
  const context = cacheContext(endpoint, options.auth)
  const pending = pendingGets.get(context.key)
  if (forceRefresh) {
    // 同一数据源的查询参数变体（例如 holdings?editor=1）也必须一并失效。
    invalidateApiCache(context.resource)
    if (dedupe && pending) {
      pendingGets.set(context.key, pending)
      return pending.promise
    }
  } else if (dedupe && pending) {
    return pending.promise
  }

  const cached = getCache.get(context.key)
  if (!forceRefresh && cacheTtlMs > 0 && cached?.expiresAt > Date.now()) {
    return Promise.resolve(cached.data)
  }

  const requestEpoch = cacheEpoch
  const request = requestApiJson(endpoint, { ...options, method: 'GET' }).then((data) => {
    if (cacheTtlMs > 0 && requestEpoch === cacheEpoch) {
      getCache.set(context.key, { ...context, data, expiresAt: Date.now() + cacheTtlMs })
    }
    return data
  })
  if (!dedupe) return request
  pendingGets.set(context.key, { ...context, promise: request })
  request.finally(() => {
    if (pendingGets.get(context.key)?.promise === request) pendingGets.delete(context.key)
  }).catch(() => {})
  return request
}
