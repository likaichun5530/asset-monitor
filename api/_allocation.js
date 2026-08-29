import { toNumber } from './_google.js'
export { aggregateHoldingsByCategory, calculateAllocations, getHoldingCategory, getHoldingMarketValueCNY } from '../shared/allocation.js'

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
