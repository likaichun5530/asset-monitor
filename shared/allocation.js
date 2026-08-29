const CATEGORY_BY_TYPE = {
  Crypto: '虚拟币', crypto: '虚拟币', 虚拟币: '虚拟币', 数字货币: '虚拟币',
  Gold: '黄金', gold: '黄金', 黄金: '黄金',
  Cash: '现金', cash: '现金', 现金: '现金',
  Bond: '债基', bond: '债基', 债券: '债基', 债基: '债基',
  Future: '期货', future: '期货', 期货: '期货',
}

const STOCK_CATEGORY_BY_MARKET = { US: '美股', CN: 'A股', HK: '港股', JP: '日股' }
export const TARGET_ABSOLUTE_DEVIATION = 0.02
export const TARGET_RELATIVE_DEVIATION = 0.4
const COMPARISON_EPSILON = 1e-12

export function getHoldingCategory(assetType, market) {
  const type = String(assetType || '').trim()
  if (type.toLowerCase() === 'stock' || type === '股票') {
    return STOCK_CATEGORY_BY_MARKET[String(market || '').trim().toUpperCase()] || '股票'
  }
  return CATEGORY_BY_TYPE[type] || CATEGORY_BY_TYPE[type.toLowerCase()] || type || '其他'
}

export function getHoldingMarketValueCNY(row) {
  const raw = row?.MarketValueCNY ?? row?.marketValueCNY
  if (raw === null || raw === undefined || raw === '') return 0
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0
  const normalized = String(raw).replace(/,/g, '').trim()
  if (normalized.endsWith('%')) return 0
  const value = Number(normalized)
  return Number.isFinite(value) ? value : 0
}

export function aggregateHoldingsByCategory(rows = []) {
  const categoryTotals = new Map()
  let total = 0
  for (const row of rows) {
    const assetType = row?.AssetType ?? row?.assetType
    if (!assetType) continue
    const marketValueCNY = getHoldingMarketValueCNY(row)
    const category = getHoldingCategory(assetType, row?.Market ?? row?.market)
    total += marketValueCNY
    categoryTotals.set(category, (categoryTotals.get(category) || 0) + marketValueCNY)
  }
  return { categoryTotals, total }
}

export function getTargetDeviation(currentRatio, targetRatio) {
  if (!Number.isFinite(currentRatio) || !Number.isFinite(targetRatio)) {
    return { status: 'unset', difference: null, relativeDifference: null, triggeredBy: null }
  }
  const difference = currentRatio - targetRatio
  const relativeDifference = targetRatio > 0 ? difference / targetRatio : null
  const absoluteOver = difference >= TARGET_ABSOLUTE_DEVIATION - COMPARISON_EPSILON
  const absoluteUnder = difference <= -TARGET_ABSOLUTE_DEVIATION + COMPARISON_EPSILON
  const relativeOver = relativeDifference !== null && relativeDifference >= TARGET_RELATIVE_DEVIATION - COMPARISON_EPSILON
  const relativeUnder = relativeDifference !== null && relativeDifference <= -TARGET_RELATIVE_DEVIATION + COMPARISON_EPSILON
  const status = absoluteOver || relativeOver ? 'over' : absoluteUnder || relativeUnder ? 'under' : 'balanced'
  const absoluteTriggered = absoluteOver || absoluteUnder
  const relativeTriggered = relativeOver || relativeUnder
  const triggeredBy = absoluteTriggered && relativeTriggered ? 'both' : absoluteTriggered ? 'absolute' : relativeTriggered ? 'relative' : null
  return { status, difference, relativeDifference, triggeredBy }
}

export function getTargetAdjustmentAmount(marketValue, totalMarketValue, targetRatio) {
  if (!Number.isFinite(marketValue) || !Number.isFinite(totalMarketValue) || !Number.isFinite(targetRatio)) return null
  return totalMarketValue * targetRatio - marketValue
}

export function calculateAllocations(categoryTotals, total, targetMap = new Map(), { includeTargetOnly = false } = {}) {
  const categories = includeTargetOnly
    ? new Set([...categoryTotals.keys(), ...targetMap.keys()])
    : new Set(categoryTotals.keys())
  return [...categories].map((category) => {
    const marketValue = categoryTotals.get(category) || 0
    const currentRatio = total ? marketValue / total : 0
    const targetRatio = targetMap.has(category) ? targetMap.get(category) : null
    const deviation = getTargetDeviation(currentRatio, targetRatio)
    const difference = deviation.difference
    const relativeDifference = deviation.relativeDifference
    const status = { unset: '未设置', over: '超配', under: '低配', balanced: '正常' }[deviation.status]
    return {
      category,
      marketValue,
      currentRatio,
      targetRatio,
      difference,
      relativeDifference,
      status,
      suggestedAdjustment: getTargetAdjustmentAmount(marketValue, total, targetRatio),
    }
  }).sort((a, b) => b.marketValue - a.marketValue)
}
