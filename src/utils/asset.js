// 资产计算工具
// 支持两种模式：
//   1. 静态模式（默认）：直接读取 src/data/* 的内置数据
//   2. 动态模式：通过 loadAll() 从 dataStore（Google Sheets + 本地缓存）加载

import { holdings as staticHoldings, categoryOrder } from '../data/holdings.js'
import { getMergedHistory, getCurrentPeak, setCachedHistory } from './snapshot.js'
import { fetchHoldings, fetchHistory, addSnapshot, retryPendingSync, hasBackend, getLastSyncAt, getPendingCount } from './dataStore.js'

// 当前生效的持仓数据（动态加载后会被替换）
let activeHoldings = staticHoldings

// 设置当前生效的持仓数据
export function setActiveHoldings(holdings) {
  activeHoldings = holdings || staticHoldings
}

export function getActiveHoldings() {
  return activeHoldings
}

// 单项持仓的人民币市值
export function holdingMarketValue(h) {
  return Number(h.marketValueCNY)
}

// 持仓总额（人民币）
export function totalMarketValue() {
  return activeHoldings.reduce((sum, h) => sum + holdingMarketValue(h), 0)
}

// 按资产大类聚合（股票拆分为美股/A股/港股/日股）
export function groupByCategory() {
  const map = new Map()
  for (const h of activeHoldings) {
    let cat = h.assetType || '其他'
    // 股票按市场细分
    if (cat === '股票') {
      cat = stockMarketLabel(h.market)
    }
    if (!map.has(cat)) {
      map.set(cat, { category: cat, marketValue: 0, count: 0 })
    }
    const item = map.get(cat)
    item.marketValue += holdingMarketValue(h)
    item.count += 1
  }
  const total = totalMarketValue()
  // 按金额从大到小排序
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      marketValue: Math.round(item.marketValue * 100) / 100,
      ratio: total ? (item.marketValue / total) * 100 : 0,
    }))
    .sort((a, b) => b.marketValue - a.marketValue)
}

function stockMarketLabel(market) {
  if (market === 'US') return '美股'
  if (market === 'CN') return 'A股'
  if (market === 'HK') return '港股'
  if (market === 'JP') return '日股'
  return '股票'
}

// 按市场聚合
export function groupByMarket() {
  const map = new Map()
  for (const h of activeHoldings) {
    const m = h.market || '其他'
    if (!map.has(m)) map.set(m, { market: m, marketValue: 0, count: 0 })
    const item = map.get(m)
    item.marketValue += holdingMarketValue(h)
    item.count += 1
  }
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      marketValue: Math.round(item.marketValue * 100) / 100,
    }))
    .sort((a, b) => b.marketValue - a.marketValue)
}

// 按账户/平台聚合
export function groupByAccount() {
  const map = new Map()
  for (const h of activeHoldings) {
    const a = h.account || '未知'
    if (!map.has(a)) map.set(a, { account: a, marketValue: 0, count: 0 })
    const item = map.get(a)
    item.marketValue += holdingMarketValue(h)
    item.count += 1
  }
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      marketValue: Math.round(item.marketValue * 100) / 100,
    }))
    .sort((a, b) => b.marketValue - a.marketValue)
}

// 按币种聚合
export function groupByCurrency() {
  const map = new Map()
  for (const h of activeHoldings) {
    const c = h.currency || '其他'
    if (!map.has(c)) map.set(c, { currency: c, marketValue: 0, marketValueCNY: 0, count: 0 })
    const item = map.get(c)
    item.marketValue += Number(h.marketValue) || 0
    item.marketValueCNY += holdingMarketValue(h)
    item.count += 1
  }
  const totalCNY = totalMarketValue()
  return Array.from(map.values())
    .map((item) => ({
      ...item,
      marketValue: Math.round(item.marketValue * 100) / 100,
      marketValueCNY: Math.round(item.marketValueCNY * 100) / 100,
      ratio: totalCNY ? (item.marketValueCNY / totalCNY) * 100 : 0,
    }))
    .sort((a, b) => b.marketValueCNY - a.marketValueCNY)
}

// ===== 历史数据 =====

export function getHistory() {
  return getMergedHistory()
}

export function getPeak() {
  return getCurrentPeak()
}

export function latestSnapshot() {
  const h = getHistory()
  if (!h.length) return null
  return h[h.length - 1]
}

// 计算区间涨跌
export function calcRangeChange(days) {
  const h = getHistory()
  if (h.length < 2) {
    return { change: 0, changePct: 0, start: null, end: null, startValue: 0, endValue: 0 }
  }
  const endIdx = h.length - 1
  const endValue = h[endIdx].total
  const endDate = h[endIdx].date

  const endMs = new Date(endDate).getTime()
  const targetMs = endMs - days * 24 * 60 * 60 * 1000
  let startIdx = 0
  let found = false
  for (let i = endIdx - 1; i >= 0; i--) {
    const ms = new Date(h[i].date).getTime()
    if (ms <= targetMs) {
      startIdx = i
      found = true
      break
    }
  }
  if (!found) startIdx = 0
  const startValue = h[startIdx].total
  const change = endValue - startValue
  const changePct = startValue ? (change / startValue) * 100 : 0
  return {
    change,
    changePct,
    start: h[startIdx].date,
    end: endDate,
    startValue,
    endValue,
  }
}

export function change7d() {
  return calcRangeChange(7)
}

export function change30d() {
  return calcRangeChange(30)
}

export function drawdownFromPeak() {
  const current = latestSnapshot() ? latestSnapshot().total : 0
  const peak = getCurrentPeak()
  const change = current - peak.value
  const changePct = peak.value ? (change / peak.value) * 100 : 0
  return {
    change,
    changePct,
    peakValue: peak.value,
    peakDate: peak.date,
    currentValue: current,
  }
}

export function currentTotal() {
  return totalMarketValue()
}

export function lastUpdateDate() {
  const last = latestSnapshot()
  return last ? last.date : null
}

// ===== 动态加载（从 Google Sheets / 本地缓存） =====

// 一次性加载 holdings + history，更新 activeHoldings
// 返回 { source, syncedAt }
export async function loadAll() {
  const [holdingsResult, historyResult] = await Promise.all([
    fetchHoldings(),
    fetchHistory(),
  ])
  setActiveHoldings(holdingsResult.holdings)
  setCachedHistory(historyResult.history)
  // 尝试重试待同步的快照
  if (hasBackend()) {
    await retryPendingSync()
  }
  return {
    holdingsSource: holdingsResult.source,
    historySource: historyResult.source,
    syncedAt: holdingsResult.syncedAt || historyResult.syncedAt,
  }
}

// 生成快照（写入本地 + 尝试同步 Google Sheets）
export async function generateSnapshot(total) {
  const result = await addSnapshot(total)
  // 重新从 dataStore 拉取最新历史数据，更新 snapshot.js 内存缓存
  // 这样趋势图 refreshKey 变化时 getMergedHistory() 能读到最新数据
  const historyResult = await fetchHistory()
  setCachedHistory(historyResult.history)
  return result
}

export { hasBackend, getLastSyncAt, getPendingCount, retryPendingSync }