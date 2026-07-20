// 离线优先（offline-first）数据存储
//
// 工作原理：
//   1. 启动时：尝试从后端 API 拉取 Google Sheets 最新数据
//      - 成功：更新本地缓存（localStorage），使用在线数据
//      - 失败（无网络/后端未启动）：回退到本地缓存
//      - 缓存也无：回退到静态内置数据（src/data/*）
//   2. 生成快照：写入本地 + 尝试 POST 到后端
//      - 后端成功：已同步
//      - 后端失败：标记为 pendingSync，下次在线时自动重试
//   3. 待同步队列：定时或在下次成功连接后端时重试推送
//
// 本地缓存键：
//   - asset-monitor:holdings       持仓数据
//   - asset-monitor:history        历史快照
//   - asset-monitor:pendingSync    待同步到 Google Sheets 的快照
//   - asset-monitor:lastSyncAt     最后成功同步时间

import { holdings as staticHoldings } from '../data/holdings.js'
import { history as staticHistory, peakValue as staticPeakValue, peakDate as staticPeakDate } from '../data/history.js'

const API_BASE = import.meta.env.VITE_API_BASE || ''
const KEYS = {
  holdings: 'asset-monitor:holdings',
  history: 'asset-monitor:history',
  pending: 'asset-monitor:pendingSync',
  lastSync: 'asset-monitor:lastSyncAt',
}

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore quota errors
  }
}

// ===== Holdings =====

// 获取 holdings：在线拉取 → 本地缓存 → 静态数据
export async function fetchHoldings() {
  if (API_BASE) {
    try {
      const resp = await fetch(`${API_BASE}/api/holdings`, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        const holdings = normalizeHoldings(data.holdings || [])
        if (holdings.length) {
          writeLocal(KEYS.holdings, { holdings, syncedAt: data.syncedAt })
          writeLocal(KEYS.lastSync, new Date().toISOString())
          return { holdings, source: 'online', syncedAt: data.syncedAt }
        }
      }
    } catch (e) {
      console.warn('[dataStore] 在线拉取 holdings 失败，回退到本地缓存', e)
    }
  }
  // 回退到本地缓存
  const cached = readLocal(KEYS.holdings, null)
  if (cached?.holdings?.length) {
    return { holdings: cached.holdings, source: 'cache', syncedAt: cached.syncedAt }
  }
  // 回退到静态数据
  return { holdings: staticHoldings, source: 'static', syncedAt: null }
}

function normalizeHoldings(arr) {
  return arr.map((r, idx) => {
    const assetType = mapAssetType(r.AssetType)
    return {
      assetType,
      market: r.Market || r.market || '其他',
      account: r.Account || r.account || '未知',
      symbol: r.Symbol || r.symbol || '-',
      name: r.Name || r.name || `项目${idx + 1}`,
      currency: r.Currency || r.currency || 'CNY',
      quantity: r.Quantity ?? r.quantity ?? null,
      price: r.Price ?? r.price ?? null,
      marketValue: r.MarketValue ?? r.marketValue ?? null,
      marketValueCNY: r.MarketValueCNY ?? r.marketValueCNY ?? Number(r.marketValue) ?? 0,
    }
  })
}

function mapAssetType(t) {
  const s = String(t || '').toLowerCase()
  if (s === 'stock') return '股票'
  if (s === 'crypto') return '数字货币'
  if (s === 'gold') return '黄金'
  if (s === 'cash') return '现金'
  if (s === 'bond') return '债券'
  if (s === 'future') return '期货'
  return t || '其他'
}

// ===== History =====

// 获取 history：在线拉取 → 本地缓存 → 静态数据
export async function fetchHistory() {
  if (API_BASE) {
    try {
      const resp = await fetch(`${API_BASE}/api/history`, { cache: 'no-store' })
      if (resp.ok) {
        const data = await resp.json()
        const history = normalizeHistory(data.history || [])
        if (history.length) {
          // 合并本地待同步的快照（可能在离线时生成）
          const pending = readLocal(KEYS.pending, [])
          const merged = mergeHistory(history, pending)
          writeLocal(KEYS.history, { history: merged, syncedAt: data.syncedAt })
          writeLocal(KEYS.lastSync, new Date().toISOString())
          return { history: merged, source: 'online', syncedAt: data.syncedAt }
        }
      }
    } catch (e) {
      console.warn('[dataStore] 在线拉取 history 失败，回退到本地缓存', e)
    }
  }
  // 合并静态数据 + 本地待同步快照
  const pending = readLocal(KEYS.pending, [])
  const cached = readLocal(KEYS.history, null)
  const base = cached?.history?.length ? cached.history : staticHistory
  const merged = mergeHistory(base, pending)
  return { history: merged, source: cached?.history?.length ? 'cache' : 'static', syncedAt: cached?.syncedAt || null }
}

function normalizeHistory(arr) {
  return arr
    .map((r) => ({
      date: r.date,
      total: Number(r.total) || 0,
      ...(r.note ? { note: r.note } : {}),
    }))
    .filter((r) => r.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
}

function mergeHistory(base, extra) {
  const map = new Map()
  for (const item of base) map.set(item.date, { ...item })
  for (const item of extra) map.set(item.date, { ...item })
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
}

// ===== 快照生成（写回） =====

export async function addSnapshot(total) {
  const date = todayStr()
  const snapshot = { date, total: Math.round(total * 100) / 100 }

  // 1. 写入本地待同步队列
  const pending = readLocal(KEYS.pending, [])
  const filtered = pending.filter((s) => s.date !== date)
  filtered.push(snapshot)
  writeLocal(KEYS.pending, filtered)

  // 2. 更新本地历史缓存
  const cached = readLocal(KEYS.history, { history: staticHistory, syncedAt: null })
  const newHistory = mergeHistory(cached.history, [snapshot])
  writeLocal(KEYS.history, { history: newHistory, syncedAt: cached.syncedAt })

  // 3. 尝试同步到 Google Sheets
  let synced = false
  if (API_BASE) {
    try {
      const resp = await fetch(`${API_BASE}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      })
      if (resp.ok) {
        synced = true
        // 同步成功，从待同步队列移除
        const pendingNow = readLocal(KEYS.pending, [])
        writeLocal(KEYS.pending, pendingNow.filter((s) => s.date !== date))
        // 重新从后端拉取最新历史数据，确保趋势图实时更新
        await refreshHistoryFromBackend()
      }
    } catch (e) {
      console.warn('[dataStore] 同步快照到后端失败，保留在待同步队列', e)
    }
  }

  return { ok: true, date, total, synced }
}

// 从后端重新拉取历史数据并更新本地缓存
async function refreshHistoryFromBackend() {
  if (!API_BASE) return
  try {
    const resp = await fetch(`${API_BASE}/api/history`, { cache: 'no-store' })
    if (resp.ok) {
      const data = await resp.json()
      const history = normalizeHistory(data.history || [])
      if (history.length) {
        writeLocal(KEYS.history, { history, syncedAt: data.syncedAt })
      }
    }
  } catch (e) {
    console.warn('[dataStore] 重新拉取历史数据失败', e)
  }
}

// 重试所有待同步的快照
export async function retryPendingSync() {
  if (!API_BASE) return { retried: 0, success: 0 }
  const pending = readLocal(KEYS.pending, [])
  if (!pending.length) return { retried: 0, success: 0 }

  let success = 0
  const stillPending = []
  for (const snap of pending) {
    try {
      const resp = await fetch(`${API_BASE}/api/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snap),
      })
      if (resp.ok) success++
      else stillPending.push(snap)
    } catch {
      stillPending.push(snap)
    }
  }
  writeLocal(KEYS.pending, stillPending)
  return { retried: pending.length, success, remaining: stillPending.length }
}

// ===== 辅助 =====

export function hasBackend() {
  return Boolean(API_BASE)
}

export function getLastSyncAt() {
  return readLocal(KEYS.lastSync, null)
}

export function getPendingCount() {
  return readLocal(KEYS.pending, []).length
}

export function getCurrentPeak() {
  const cached = readLocal(KEYS.history, { history: staticHistory })
  let peak = { value: staticPeakValue, date: staticPeakDate }
  for (const item of cached.history) {
    if (item.total > peak.value) peak = { value: item.total, date: item.date }
  }
  return peak
}

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}