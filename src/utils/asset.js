// 资产计算工具
// 实盘模式从 API / 本地缓存加载，演示模式使用内置 demo 数据。

import { getMergedHistory, getCurrentPeak, setCachedHistory } from './snapshot.js'
import { fetchHoldings, fetchHistory, addSnapshot, retryPendingSync, hasBackend, getPendingCount } from './dataStore.js'
import { aggregateHoldingsByCategory, getHoldingCategory, getHoldingMarketValueCNY } from '../../shared/allocation.js'

// 检查是否演示模式
function isDemoMode() {
  try { return localStorage.getItem('youshu-demo-mode') === 'true' } catch { return false }
}

// 从 localStorage 同步读取缓存的持仓数据，避免首次渲染显示老数据
function getCachedHoldings() {
  // 演示模式下不读取缓存，避免先显示实盘数据再闪烁
  if (isDemoMode()) return null
  try {
    const raw = localStorage.getItem('asset-monitor:holdings')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.holdings?.length) {
        return parsed.holdings.map((holding) => holding.assetType === '债券'
          ? { ...holding, assetType: '债基' }
          : holding)
      }
    }
  } catch { /* ignore */ }
  return null
}

// 当前生效的持仓数据（优先使用上次缓存）
let activeHoldings = getCachedHoldings() || []

// 设置当前生效的持仓数据
export function setActiveHoldings(holdings) {
  activeHoldings = holdings || []
}

export function getActiveHoldings() {
  return activeHoldings
}

// 单项持仓的人民币市值
export function holdingMarketValue(h) {
  return getHoldingMarketValueCNY(h)
}

// 持仓总额（人民币）
export function totalMarketValue() {
  return activeHoldings.reduce((sum, h) => sum + holdingMarketValue(h), 0)
}

// 按资产大类聚合（股票拆分为美股/A股/港股/日股）
export function groupByCategory() {
  const { categoryTotals, total } = aggregateHoldingsByCategory(activeHoldings)
  const counts = new Map()
  for (const holding of activeHoldings) {
    const category = getHoldingCategory(holding.assetType, holding.market)
    counts.set(category, (counts.get(category) || 0) + 1)
  }
  // 按金额从大到小排序
  return Array.from(categoryTotals.entries())
    .map(([category, marketValue]) => ({
      category,
      count: counts.get(category) || 0,
      marketValue: Math.round(marketValue * 100) / 100,
      ratio: total ? (marketValue / total) * 100 : 0,
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

// 提取某类资产的历史数据（用于各类资产详情页的趋势图）
// categoryKey 取值: 'us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash'
export function getCategoryHistory(categoryKey) {
  const all = getMergedHistory()
  return all
    .filter((d) => d.categories && d.categories[categoryKey] !== undefined)
    .map((d) => ({
      date: d.date,
      total: d.categories[categoryKey],
    }))
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

// 今年以来涨跌
export function changeYtd() {
  const h = getHistory()
  if (h.length < 2) {
    return { change: 0, changePct: 0, start: null, end: null, startValue: 0, endValue: 0 }
  }
  const endIdx = h.length - 1
  const endValue = h[endIdx].total
  const endDate = h[endIdx].date

  // 今年1月1日
  const yearStart = new Date(endDate).getFullYear() + '-01-01'
  const yearStartMs = new Date(yearStart).getTime()

  let startIdx = 0
  for (let i = endIdx - 1; i >= 0; i--) {
    const ms = new Date(h[i].date).getTime()
    if (ms <= yearStartMs) {
      startIdx = i
      break
    }
  }
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

export function drawdownFromPeak() {
  const current = totalMarketValue()
  const peak = getCurrentPeak()
  if (current >= peak.value) {
    return {
      change: 0,
      changePct: 0,
      peakValue: peak.value,
      peakDate: peak.date,
      currentValue: current,
    }
  }
  const rawChange = current - peak.value
  const change = Math.round(rawChange * 100) / 100
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

export async function loadHoldingsData({ forceRefresh = false } = {}) {
  const holdingsResult = await fetchHoldings({ forceRefresh })
  setActiveHoldings(holdingsResult.holdings)
  return holdingsResult
}

export async function loadHistoryData({ forceRefresh = false } = {}) {
  const historyResult = await fetchHistory({ forceRefresh })
  setCachedHistory(historyResult.history)
  return historyResult
}

// 生成快照（写入本地 + 尝试同步 Google Sheets）
export async function generateSnapshot(total) {
  const result = await addSnapshot(total)
  await loadHistoryData()
  return result
}

export { hasBackend, getPendingCount, retryPendingSync }
