// 历史快照的内存缓存与高点计算。

import { demoHistory, demoPeakValue, demoPeakDate } from '../data/demo.js'

// 从 localStorage 同步读取缓存的历史数据
function getCachedHistoryFromStorage() {
  // 演示模式下不读取缓存，避免先显示实盘数据再闪烁
  try {
    if (localStorage.getItem('youshu-demo-mode') === 'true') return null
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem('asset-monitor:history')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.history?.length) return parsed.history
    }
  } catch { /* ignore */ }
  return null
}

// 缓存最新加载的历史数据，优先从 localStorage 同步读取。
let cachedHistory = getCachedHistoryFromStorage()

// 同步获取合并后的历史数据（从缓存读取，初始回退到本地缓存或静态数据）
export function getMergedHistory() {
  // 演示模式直接返回 demo 数据
  const demoMode = (() => {
    try { return localStorage.getItem('youshu-demo-mode') === 'true' } catch { return false }
  })()
  if (demoMode) return demoHistory
  if (cachedHistory && cachedHistory.length) return cachedHistory
  const cached = getCachedHistoryFromStorage()
  if (cached) {
    cachedHistory = cached
    return cached
  }
  return []
}

// 更新内存缓存（供首次、手动和历史变更后的刷新调用）。
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
  let peak = { value: 0, date: '' }
  for (const item of h) {
    if (item.total > peak.value) {
      peak = { value: item.total, date: item.date }
    }
  }
  return peak
}
