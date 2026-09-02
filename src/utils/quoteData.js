import { getApiJson } from './api.js'

export const MARKET_UPDATED_EVENT = 'youshu-market-updated'
export const FUTURES_UPDATED_EVENT = 'youshu-futures-updated'

const MARKET_CACHE_KEY = 'asset-monitor:market'
const FUTURES_CACHE_KEY = 'asset-monitor:futures'

function readCache(key, fallback) {
  try {
    const cached = JSON.parse(localStorage.getItem(key) || 'null')
    return cached ?? fallback
  } catch {
    return fallback
  }
}

function publish(eventName, detail) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(eventName, { detail }))
}

export function readMarketData() {
  const cached = readCache(MARKET_CACHE_KEY, [])
  return Array.isArray(cached) ? cached : cached?.items || []
}

export async function refreshMarketData({ forceRefresh = false } = {}) {
  const response = await getApiJson('market', { auth: false, forceRefresh })
  const data = response.market || []
  try { localStorage.setItem(MARKET_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  publish(MARKET_UPDATED_EVENT, data)
  return data
}

export function readFuturesData() {
  return readCache(FUTURES_CACHE_KEY, null)
}

export async function refreshFuturesData({ forceRefresh = false } = {}) {
  const response = await getApiJson('futures', { auth: false, forceRefresh })
  const data = response.futures || null
  if (data) {
    try { localStorage.setItem(FUTURES_CACHE_KEY, JSON.stringify(data)) } catch { /* ignore */ }
  }
  publish(FUTURES_UPDATED_EVENT, data)
  return data
}
