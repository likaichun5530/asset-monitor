import { readSheet, toNumber } from './_google.js'
import { calculateAllocations, getHoldingCategory, parseTargetMap } from './_allocation.js'

const HISTORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']
const CATEGORY_LABELS = {
  us: '美股', crypto: '虚拟币', bond: '债基', future: '期货', cn: 'A股',
  gold: '黄金', jp: '日股', hk: '港股', cash: '现金',
}

function text(value, max = 120) {
  return String(value ?? '').trim().slice(0, max)
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return value
  const scale = 10 ** digits
  return Math.round((value + Number.EPSILON) * scale) / scale
}

function normalizeDate(value) {
  const match = String(value || '').match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : null
}

export function normalizeAiHoldings(rows = []) {
  return rows.map((row) => {
    const assetType = row.AssetType ?? row.assetType
    const market = text(row.Market ?? row.market, 20)
    return {
      category: getHoldingCategory(assetType, market),
      assetType: text(assetType, 30),
      market,
      account: text(row.Account ?? row.account, 80),
      symbol: text(row.Symbol ?? row.symbol, 50),
      name: text(row.Name ?? row.name, 100),
      currency: text(row.Currency ?? row.currency, 12).toUpperCase(),
      quantity: toNumber(row.Quantity ?? row.quantity),
      price: toNumber(row.Price ?? row.price),
      marketValue: toNumber(row.MarketValue ?? row.marketValue),
      marketValueCNY: toNumber(row.MarketValueCNY ?? row.marketValueCNY) || 0,
    }
  }).filter((row) => row.name || row.symbol || row.marketValueCNY)
}

export function normalizeAiHistory(rawRows = []) {
  return rawRows.map((row) => {
    const date = normalizeDate(row?.[0])
    const total = toNumber(row?.[1])
    if (!date || total === null) return null
    const categories = {}
    HISTORY_KEYS.forEach((key, index) => {
      const value = toNumber(row?.[index + 2])
      if (value !== null) categories[key] = value
    })
    return {
      date,
      total,
      categories,
      note: text(row?.[11], 500) || undefined,
    }
  }).filter(Boolean).sort((a, b) => new Date(a.date) - new Date(b.date))
}

export function compactAiHistory(history = [], maxRows = 500) {
  if (history.length <= maxRows) return history
  const recent = history.slice(-365)
  const older = history.slice(0, -365)
  const monthly = new Map()
  for (const row of older) monthly.set(row.date.slice(0, 7), row)
  return [...monthly.values(), ...recent].slice(-maxRows)
}

function rangeChange(history, days) {
  if (history.length < 2) return null
  const end = history[history.length - 1]
  const targetTime = new Date(end.date).getTime() - days * 86400000
  let start = history[0]
  for (let index = history.length - 2; index >= 0; index--) {
    if (new Date(history[index].date).getTime() <= targetTime) {
      start = history[index]
      break
    }
  }
  const change = end.total - start.total
  return {
    startDate: start.date,
    endDate: end.date,
    change: round(change),
    changePercentage: start.total ? round((change / start.total) * 100) : null,
  }
}

function dailyCategoryChange(history) {
  if (history.length < 2) return null
  const previous = history.at(-2)
  const latest = history.at(-1)
  return {
    startDate: previous.date,
    endDate: latest.date,
    totalChangeCNY: round(latest.total - previous.total),
    totalChangePercentage: previous.total ? round(((latest.total - previous.total) / previous.total) * 100) : null,
    categories: HISTORY_KEYS.map((key) => ({
      category: CATEGORY_LABELS[key],
      changeCNY: round((latest.categories[key] || 0) - (previous.categories[key] || 0)),
    })).sort((a, b) => Math.abs(b.changeCNY) - Math.abs(a.changeCNY)),
  }
}

function aggregateExposure(holdings, field, total) {
  const values = new Map()
  for (const row of holdings) {
    const key = row[field] || '未知'
    values.set(key, (values.get(key) || 0) + row.marketValueCNY)
  }
  return [...values.entries()].map(([name, marketValueCNY]) => ({
    name,
    marketValueCNY: round(marketValueCNY),
    percentage: total ? round((marketValueCNY / total) * 100) : 0,
  })).sort((a, b) => b.marketValueCNY - a.marketValueCNY)
}

export function buildAiContextFromSheets({ holdingsRows = [], historyRows = [], targetResult = null, page = '/' } = {}) {
  const holdings = normalizeAiHoldings(holdingsRows)
  const fullHistory = normalizeAiHistory(historyRows)
  const history = compactAiHistory(fullHistory)
  const targetMap = parseTargetMap(targetResult)
  const total = holdings.reduce((sum, row) => sum + row.marketValueCNY, 0)
  const categoryTotals = new Map()
  for (const row of holdings) categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + row.marketValueCNY)
  const allocations = calculateAllocations(categoryTotals, total, targetMap, { includeTargetOnly: true }).map((row) => ({
    category: row.category,
    marketValueCNY: round(row.marketValue),
    currentPercentage: round(row.currentRatio * 100),
    targetPercentage: row.targetRatio === null ? null : round(row.targetRatio * 100),
    deviationPercentagePoints: row.difference === null ? null : round(row.difference * 100),
    relativeDeviationPercentage: row.relativeDifference === null ? null : round(row.relativeDifference * 100),
    status: row.status,
    suggestedAdjustmentCNY: row.suggestedAdjustment === null ? null : round(row.suggestedAdjustment),
  }))

  const peak = fullHistory.reduce((max, row) => Math.max(max, row.total), 0)
  const latest = fullHistory.at(-1) || null
  const enrichedHoldings = holdings.map((row) => ({
    ...row,
    portfolioPercentage: total ? round((row.marketValueCNY / total) * 100) : 0,
  })).sort((a, b) => b.marketValueCNY - a.marketValueCNY)

  return {
    generatedAt: new Date().toISOString(),
    currentPage: text(page, 80) || '/',
    dataAsOf: latest?.date || null,
    summary: {
      totalMarketValueCNY: round(total),
      holdingCount: holdings.length,
      latestHistoryTotal: latest ? round(latest.total) : null,
      change7d: rangeChange(fullHistory, 7),
      change30d: rangeChange(fullHistory, 30),
      latestDailyChange: dailyCategoryChange(fullHistory),
      drawdownFromPeakPercentage: peak && latest ? round(((latest.total - peak) / peak) * 100) : null,
      largestHolding: enrichedHoldings[0]
        ? { name: enrichedHoldings[0].name, symbol: enrichedHoldings[0].symbol, percentage: enrichedHoldings[0].portfolioPercentage }
        : null,
    },
    allocations,
    exposures: {
      accounts: aggregateExposure(enrichedHoldings, 'account', total),
      currencies: aggregateExposure(enrichedHoldings, 'currency', total),
      markets: aggregateExposure(enrichedHoldings, 'market', total),
    },
    holdings: enrichedHoldings,
    history,
    historyMeta: {
      originalRows: fullHistory.length,
      includedRows: history.length,
      categoryLabels: CATEGORY_LABELS,
    },
    calculationPolicy: '金额与比例均由应用代码计算。回答时直接引用这些字段，不要由模型重新计算。百分数字段单位为百分比，deviationPercentagePoints 单位为百分点。',
  }
}

export async function buildAssetAiContext(page) {
  const [holdingsResult, historyResult, targetResult] = await Promise.all([
    readSheet('Holdings'),
    readSheet('History'),
    readSheet('target').catch(() => null),
  ])
  return buildAiContextFromSheets({
    holdingsRows: holdingsResult.data || [],
    historyRows: historyResult.rawRows || [],
    targetResult,
    page,
  })
}
