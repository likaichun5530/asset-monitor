const configuredBase = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

// 同域部署默认走当前站点；前后端分离时由 VITE_API_BASE 覆盖。
export const API_BASE = configuredBase || (typeof window !== 'undefined' ? window.location.origin : '')

export function apiUrl(endpoint) {
  return `${API_BASE}/api/${String(endpoint).replace(/^\//, '')}`
}

export async function getApiJson(endpoint) {
  const response = await fetch(apiUrl(endpoint), {
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`API ${endpoint} 返回 ${response.status}`)
  return response.json()
}
