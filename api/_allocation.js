import { toNumber } from './_google.js'

const CATEGORY_BY_TYPE = {
  Crypto: '虚拟币', crypto: '虚拟币', 虚拟币: '虚拟币',
  Gold: '黄金', gold: '黄金', 黄金: '黄金',
  Cash: '现金', cash: '现金', 现金: '现金',
  Bond: '债基', bond: '债基', 债券: '债基', 债基: '债基',
  Future: '期货', future: '期货', 期货: '期货',
}

const STOCK_CATEGORY_BY_MARKET = { US: '美股', CN: 'A股', HK: '港股', JP: '日股' }

export function getHoldingCategory(assetType, market) {
  const type = String(assetType || '').trim()
  if (type.toLowerCase() === 'stock' || type === '股票') {
    return STOCK_CATEGORY_BY_MARKET[String(market || '').trim().toUpperCase()] || '股票'
  }
  return CATEGORY_BY_TYPE[type] || CATEGORY_BY_TYPE[type.toLowerCase()] || type || '其他'
}

export function aggregateHoldingsByCategory(rows = []) {
  const categoryTotals = new Map()
  let total = 0
  for (const row of rows) {
    const assetType = row?.AssetType ?? row?.assetType
    if (!assetType) continue
    const marketValueCNY = toNumber(row?.MarketValueCNY ?? row?.marketValueCNY) || 0
    const category = getHoldingCategory(assetType, row?.Market ?? row?.market)
    total += marketValueCNY
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + marketValueCNY)
  }
  return { categoryTotals, total }
}

export function parseTargetMap(result) {
  const targetMap = new Map()
  if (!result) return targetMap
  const headers = result.headers || []
  const categoryColumn = headers[0]
  const targetColumn = headers.find((header) => /目标|比例/.test(String(header))) || headers[1]
  for (const row of result.data || []) {
    const category = String(row?.[categoryColumn] || '').trim().replace(/^债券$/, '债基')
    if (!category || category.includes('合计')) continue
    const targetRatio = toNumber(row?.[targetColumn])
    if (targetRatio !== null) targetMap.set(category, targetRatio)
  }
  return targetMap
}

export function calculateAllocations(categoryTotals, total, targetMap, { includeTargetOnly = false } = {}) {
  const categories = includeTargetOnly
    ? new Set([...categoryTotals.keys(), ...targetMap.keys()])
    : new Set(categoryTotals.keys())
  return [...categories].map((category) => {
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
      relativeDifference,
      status,
      suggestedAdjustment: targetRatio === null ? null : total * targetRatio - marketValue,
    }
  }).sort((a, b) => b.marketValue - a.marketValue)
}
