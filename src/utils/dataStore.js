// 数据存储 — 通过 Vercel Function API 代理访问 Google Sheets
//
// 数据获取：
//   1. Vercel API（在线，Google 凭据仅在服务端）
//   2. localStorage 本地缓存
//   3. 演示模式使用 src/data/demo.js
//
// Google 凭据通过 Vercel 环境变量注入，永远不会出现在浏览器中。

import { demoHoldings, demoHistory, demoTarget } from '../data/demo.js'
import { API_BASE, apiUrl, getApiJson } from './api.js'

// Vercel 部署时自动使用当前域名，本地开发时使用完整 URL
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
    // ignore
  }
}

// ===== 通用 API 请求 =====

async function apiPost(endpoint, body) {
  if (!API_BASE) throw new Error('未配置 VITE_API_BASE')
  const resp = await fetch(apiUrl(endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  })
  if (!resp.ok) throw new Error(`API ${endpoint} 返回 ${resp.status}`)
  return resp.json()
}

// ===== Holdings =====

export async function fetchHoldings() {
  if (readLocal('youshu-demo-mode', false)) {
    return { holdings: demoHoldings, source: 'demo', syncedAt: null }
  }

  if (API_BASE) {
    try {
      const data = await getApiJson('holdings')
      const holdings = normalizeHoldings(data.holdings || [])
      if (holdings.length) {
        writeLocal(KEYS.holdings, { holdings, syncedAt: data.syncedAt })
        writeLocal(KEYS.lastSync, new Date().toISOString())
        return { holdings, source: 'online', syncedAt: data.syncedAt }
      }
    } catch (e) {
      console.warn('[dataStore] API 拉取 holdings 失败', e)
    }
  }

  const cached = readLocal(KEYS.holdings, null)
  if (cached?.holdings?.length) {
    return { holdings: normalizeHoldings(cached.holdings), source: 'cache', syncedAt: cached.syncedAt }
  }
  return { holdings: [], source: 'empty', syncedAt: null }
}

function normalizeHoldings(arr) {
  return arr.map((r, idx) => {
    let t = r.assetType || r.AssetType || '其他'
    const map = { Stock: '股票', stock: '股票', Crypto: '虚拟币', crypto: '虚拟币', 虚拟币: '虚拟币', 数字货币: '虚拟币',
      Gold: '黄金', gold: '黄金', Cash: '现金', cash: '现金', Bond: '债基', bond: '债基', 债券: '债基',
      Future: '期货', future: '期货' }
    return {
      assetType: map[t] || t,
      market: r.market || r.Market || '其他',
      account: r.account || r.Account || '未知',
      symbol: r.symbol || r.Symbol || '-',
      name: r.name || r.Name || `项目${idx + 1}`,
      currency: r.currency || r.Currency || 'CNY',
      quantity: r.quantity ?? r.Quantity ?? null,
      price: r.price ?? r.Price ?? null,
      marketValue: r.marketValue ?? r.MarketValue ?? null,
      marketValueCNY: r.marketValueCNY ?? r.MarketValueCNY ?? 0,
      marketValueExpression: r.marketValueExpression ?? null,
      rowNumber: r.rowNumber ?? null,
      rowVersion: r.rowVersion ?? null,
    }
  })
}

export async function fetchHoldingEditorData() {
  const data = await getApiJson('holdings?editor=1')
  return {
    holdings: normalizeHoldings(data.holdings || []),
    editorOptions: data.editorOptions || {},
  }
}

export async function saveHolding(holding, { editing = false } = {}) {
  if (readLocal('youshu-demo-mode', false)) throw new Error('演示模式不能修改实盘持仓')
  const token = localStorage.getItem('youshu-auth-token') || ''
  if (!token) throw new Error('请重新登录后再操作')
  const resp = await fetch(apiUrl('holdings'), {
    method: editing ? 'PUT' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(holding),
    signal: AbortSignal.timeout(15000),
  })
  const data = await resp.json().catch(() => ({}))
  if (!resp.ok) throw new Error(data.error || `保存持仓失败（${resp.status}）`)
  return data
}

// ===== History =====

export async function fetchHistory() {
  if (readLocal('youshu-demo-mode', false)) {
    return { history: demoHistory, source: 'demo', syncedAt: null }
  }

  if (API_BASE) {
    try {
      const data = await getApiJson('history')
      const history = (data.history || [])
        .filter((r) => r.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
      if (history.length) {
        const pending = readLocal(KEYS.pending, [])
        const merged = mergeHistory(history, pending)
        writeLocal(KEYS.history, { history: merged, syncedAt: data.syncedAt })
        writeLocal(KEYS.lastSync, new Date().toISOString())
        return { history: merged, source: 'online', syncedAt: data.syncedAt }
      }
    } catch (e) {
      console.warn('[dataStore] API 拉取 history 失败', e)
    }
  }

  const pending = readLocal(KEYS.pending, [])
  const cached = readLocal(KEYS.history, null)
  const base = cached?.history?.length ? cached.history : []
  const merged = mergeHistory(base, pending)
  return { history: merged, source: cached?.history?.length ? 'cache' : 'empty', syncedAt: cached?.syncedAt || null }
}

function mergeHistory(base, extra) {
  const map = new Map()
  for (const item of base) map.set(item.date, { ...item })
  for (const item of extra) map.set(item.date, { ...item })
  return Array.from(map.values()).sort((a, b) => new Date(a.date) - new Date(b.date))
}

// ===== 快照生成 =====

export async function addSnapshot(total) {
  const date = todayStr()
  const snapshot = { date, total: Math.round(total * 100) / 100 }

  const pending = readLocal(KEYS.pending, [])
  const filtered = pending.filter((s) => s.date !== date)
  filtered.push(snapshot)
  writeLocal(KEYS.pending, filtered)

  const cached = readLocal(KEYS.history, { history: [], syncedAt: null })
  const newHistory = mergeHistory(cached.history, [snapshot])
  writeLocal(KEYS.history, { history: newHistory, syncedAt: cached.syncedAt })

  let synced = false
  if (API_BASE) {
    try {
      const result = await apiPost('snapshot', snapshot)
      if (result.ok) {
        synced = true
        const pendingNow = readLocal(KEYS.pending, [])
        writeLocal(KEYS.pending, pendingNow.filter((s) => s.date !== date))
        await refreshHistoryFromBackend()
      }
    } catch (e) {
      console.warn('[dataStore] 同步快照失败', e)
    }
  }

  return { ok: true, date, total, synced }
}

async function refreshHistoryFromBackend() {
  if (!API_BASE) return
  try {
    const data = await getApiJson('history')
    const history = (data.history || [])
      .filter((r) => r.date)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
    if (history.length) {
      writeLocal(KEYS.history, { history, syncedAt: data.syncedAt })
    }
  } catch {
    // ignore
  }
}

export async function retryPendingSync() {
  const pending = readLocal(KEYS.pending, [])
  if (!pending.length || !API_BASE) return { retried: 0, success: 0 }

  let success = 0
  const stillPending = []
  for (const snap of pending) {
    try {
      const result = await apiPost('snapshot', snap)
      if (result.ok) success++
      else stillPending.push(snap)
    } catch {
      stillPending.push(snap)
    }
  }
  writeLocal(KEYS.pending, stillPending)
  return { retried: pending.length, success, remaining: stillPending.length }
}

// ===== Target（配置目标） =====

export async function fetchTarget() {
  if (readLocal('youshu-demo-mode', false)) {
    return { target: demoTarget, source: 'demo', syncedAt: null }
  }

  if (API_BASE) {
    try {
      const data = await getApiJson('target')
      if (data.target?.length) {
        const target = normalizeTarget(data.target)
        writeLocal('asset-monitor:target', { target, syncedAt: data.syncedAt })
        return { target, source: 'online', syncedAt: data.syncedAt }
      }
    } catch (e) {
      console.warn('[dataStore] API 拉取 target 失败', e)
    }
  }

  // 优先读缓存
  const cachedTarget = readLocal('asset-monitor:target', null)
  if (cachedTarget?.target?.length) {
    return { target: normalizeTarget(cachedTarget.target), source: 'cache', syncedAt: cachedTarget.syncedAt }
  }

  // 回退：从已加载的 holdings 本地计算
  try {
    const h = await fetchHoldings()
    return { target: computeTargetLocal(h.holdings), source: h.source, syncedAt: h.syncedAt }
  } catch {
    return { target: [], source: 'empty', syncedAt: null }
  }
}

function normalizeTarget(rows) {
  return rows.map((row) => row.category === '债券' ? { ...row, category: '债基' } : row)
}

function computeTargetLocal(holdings) {
  const catMap = new Map()
  let total = 0
  for (const h of holdings) {
    let cat = h.assetType
    if (cat === '股票') {
      if (h.market === 'US') cat = '美股'
      else if (h.market === 'CN') cat = 'A股'
      else if (h.market === 'HK') cat = '港股'
      else if (h.market === 'JP') cat = '日股'
    }
    const mv = h.marketValueCNY || 0
    total += mv
    catMap.set(cat, (catMap.get(cat) || 0) + mv)
  }

  const result = Array.from(catMap.entries())
    .map(([cat, mv]) => ({
      category: cat,
      marketValue: Math.round(mv * 100) / 100,
      currentRatio: total ? mv / total : 0,
      targetRatio: null,
      diff: null,
      isTotal: false,
    }))
    .sort((a, b) => b.marketValue - a.marketValue)

  result.push({
    category: '合计',
    marketValue: Math.round(total * 100) / 100,
    currentRatio: 1,
    targetRatio: null,
    diff: null,
    isTotal: true,
  })

  return result
}

// ===== 辅助 =====

export function hasBackend() {
  return Boolean(API_BASE)
}

export function getPendingCount() {
  return readLocal(KEYS.pending, []).length
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
