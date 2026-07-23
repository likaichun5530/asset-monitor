// 快照管理 - 旧接口兼容层
// 实际逻辑已迁移到 dataStore.js
// 此文件保留是为了 asset.js 中 getMergedHistory/getCurrentPeak 的引用

import { history as staticHistory, peakValue as staticPeakValue, peakDate as staticPeakDate } from '../data/history.js'
import { demoHistory, demoPeakValue, demoPeakDate } from '../data/demo.js'
import { fetchHistory, addSnapshot as dsAddSnapshot, hasBackend, retryPendingSync, getLastSyncAt, getPendingCount } from './dataStore.js'

// 缓存最新加载的历史数据（由 loadAll 触发更新）
let cachedHistory = null
let historyLoadPromise = null

// 同步获取合并后的历史数据（从缓存读取，初始回退到静态数据）
export function getMergedHistory() {
  if (cachedHistory && cachedHistory.length) return cachedHistory
  return staticHistory
}

// 动态加载历史数据（异步）
export async function loadHistory() {
  if (historyLoadPromise) return historyLoadPromise
  historyLoadPromise = (async () => {
    const result = await fetchHistory()
    cachedHistory = result.history
    return result
  })()
  return historyLoadPromise
}

// 更新内存缓存（供 loadAll 后调用）
export function setCachedHistory(history) {
  cachedHistory = history
}

// 计算当前高点
export function getCurrentPeak() {
  const demoMode = (() => {
    try { return localStorage.getItem('youshu-demo-mode') === 'true' } catch { return false }
  })()
  if (demoMode) {
    const h = getMergedHistory()
    let peak = { value: demoPeakValue, date: demoPeakDate }
    for (const item of h) {
      if (item.total > peak.value) {
        peak = { value: item.total, date: item.date }
      }
    }
    return peak
  }

  const h = getMergedHistory()
  let peak = { value: staticPeakValue, date: staticPeakDate }
  for (const item of h) {
    if (item.total > peak.value) {
      peak = { value: item.total, date: item.date }
    }
  }
  return peak
}

// 生成快照（委托给 dataStore）
export async function addSnapshot(total) {
  const result = await dsAddSnapshot(total)
  // 同步更新内存缓存
  if (cachedHistory) {
    const idx = cachedHistory.findIndex((s) => s.date === result.date)
    const snap = { date: result.date, total: result.total }
    if (idx >= 0) {
      cachedHistory[idx] = snap
    } else {
      cachedHistory.push(snap)
      cachedHistory.sort((a, b) => new Date(a.date) - new Date(b.date))
    }
  }
  return result
}

export { hasBackend, retryPendingSync, getLastSyncAt, getPendingCount }