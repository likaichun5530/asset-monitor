import { readSheet, toNumber } from './_google.js'

const HISTORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']
const CATEGORY_LABELS = {
  us: '美股', crypto: '虚拟币', bond: '债基', future: '期货', cn: 'A股',
  gold: '黄金', jp: '日股', hk: '港股', cash: '现金',
}

function text(value, max = 120) {
  return String(value ?? '').trim().slice(0, max)
}

function normalizeDate(value) {
  const match = String(value || '').match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  return match ? `${match[1]}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}` : null
}

function holdingCategory(assetType, market) {
  const type = text(assetType, 30).toLowerCase()
  const normalizedMarket = text(market, 20).toUpperCase()
  if (type === 'stock' || type === '股票') {
    return { US: '美股', CN: 'A股', HK: '港股', JP: '日股' }[normalizedMarket] || '股票'
  }
  return {
    crypto: '虚拟币', 虚拟币: '虚拟币', gold: '黄金', 黄金: '黄金', cash: '现金', 现金: '现金',
    bond: '债基', 债券: '债基', 债基: '债基', future: '期货', 期货: '期货',
  }[type] || text(assetType, 30) || '其他'
}

export function normalizeAiHoldings(rows = []) {
  return rows.map((row) => {
    const assetType = row.AssetType ?? row.assetType
    const market = text(row.Market ?? row.market, 20)
    return {
      category: holdingCategory(assetType, market),
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

function normalizeTargets(result = {}) {
  const headers = result.headers || []
  const rows = result.data || []
  const categoryColumn = headers[0]
  const targetColumn = headers.find((header) => /目标|比例/.test(String(header))) || headers[1]
  return rows.map((row) => ({
    category: text(row?.[categoryColumn], 30).replace(/^债券$/, '债基'),
    targetRatio: toNumber(row?.[targetColumn]),
  })).filter((row) => row.category && !row.category.includes('合计') && row.targetRatio !== null)
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
  return { startDate: start.date, endDate: end.date, change, changeRatio: start.total ? change / start.total : null }
}

function aggregateExposure(holdings, field, total) {
  const values = new Map()
  for (const row of holdings) {
    const key = row[field] || '未知'
    values.set(key, (values.get(key) || 0) + row.marketValueCNY)
  }
  return [...values.entries()].map(([name, marketValueCNY]) => ({
    name,
    marketValueCNY,
    ratio: total ? marketValueCNY / total : 0,
  })).sort((a, b) => b.marketValueCNY - a.marketValueCNY)
}

export function buildAiContextFromSheets({ holdingsRows = [], historyRows = [], targetResult = null, page = '/' } = {}) {
  const holdings = normalizeAiHoldings(holdingsRows)
  const fullHistory = normalizeAiHistory(historyRows)
  const history = compactAiHistory(fullHistory)
  const targets = targetResult ? normalizeTargets(targetResult) : []
  const total = holdings.reduce((sum, row) => sum + row.marketValueCNY, 0)
  const categoryTotals = new Map()
  for (const row of holdings) categoryTotals.set(row.category, (categoryTotals.get(row.category) || 0) + row.marketValueCNY)
  const targetMap = new Map(targets.map((row) => [row.category, row.targetRatio]))
  const allocations = [...new Set([...categoryTotals.keys(), ...targetMap.keys()])].map((category) => {
    const marketValue = categoryTotals.get(category) || 0
    const currentRatio = total ? marketValue / total : 0
    const targetRatio = targetMap.has(category) ? targetMap.get(category) : null
    const difference = targetRatio === null ? null : currentRatio - targetRatio
    const relativeDifference = targetRatio > 0 ? difference / targetRatio : null
    const status = difference === null
      ? '未设置'
      : difference >= 0.02 || relativeDifference >= 0.4
        ? '超配'
        : difference <= -0.02 || relativeDifference <= -0.4
          ? '低配'
          : '正常'
    return {
      category,
      marketValue,
      currentRatio,
      targetRatio,
      difference,
      status,
      suggestedAdjustment: targetRatio === null ? null : total * targetRatio - marketValue,
    }
  }).sort((a, b) => b.marketValue - a.marketValue)

  const peak = fullHistory.reduce((max, row) => Math.max(max, row.total), 0)
  const latest = fullHistory.at(-1) || null
  const enrichedHoldings = holdings.map((row) => ({
    ...row,
    portfolioRatio: total ? row.marketValueCNY / total : 0,
  })).sort((a, b) => b.marketValueCNY - a.marketValueCNY)

  return {
    generatedAt: new Date().toISOString(),
    currentPage: text(page, 80) || '/',
    dataAsOf: latest?.date || null,
    summary: {
      totalMarketValueCNY: total,
      holdingCount: holdings.length,
      latestHistoryTotal: latest?.total ?? null,
      change7d: rangeChange(fullHistory, 7),
      change30d: rangeChange(fullHistory, 30),
      drawdownFromPeak: peak && latest ? (latest.total - peak) / peak : null,
      largestHolding: enrichedHoldings[0]
        ? { name: enrichedHoldings[0].name, symbol: enrichedHoldings[0].symbol, ratio: enrichedHoldings[0].portfolioRatio }
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
    targets,
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
