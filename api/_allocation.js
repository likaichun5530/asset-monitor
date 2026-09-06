import { toNumber } from './_google.js'
import { normalizeTargetCategory } from '../shared/targetCategories.js'
export { aggregateHoldingsByCategory, calculateAllocations, getHoldingCategory, getHoldingMarketValueCNY, getTargetDeviation } from '../shared/allocation.js'

export function parseTargetMap(result) {
  const targetMap = new Map()
  if (!result?.headers?.length) return targetMap
  const headers = result.headers || []
  const firstPairIsTarget = /类型|类别/.test(String(headers[0])) && /目标|比例/.test(String(headers[1]))
  const categoryColumnIndex = firstPairIsTarget ? 0 : Math.max(0, headers.findIndex((header) => /类型|类别/.test(String(header))))
  const targetColumnIndex = firstPairIsTarget
    ? 1
    : headers.findIndex((header, index) => index > categoryColumnIndex && /目标|比例/.test(String(header)))
  if (targetColumnIndex < 0) return targetMap
  const rawRows = result.rawRows?.length
    ? result.rawRows
    : (result.data || []).map((row) => headers.map((header) => row?.[header] ?? ''))
  for (const row of rawRows) {
    const category = normalizeTargetCategory(row?.[categoryColumnIndex])
    if (!category || category.includes('合计')) continue
    const targetRatio = toNumber(row?.[targetColumnIndex])
    if (targetRatio !== null) targetMap.set(category, targetRatio)
  }
  return targetMap
}
