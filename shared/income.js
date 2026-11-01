import { incomeCategoryName } from './income-categories.js'
// All monetary values are integer CNY cents. No monthly estimates are generated.
export function normalizeIncome(raw) {
  if (raw?.unit !== 'CNY_cents' || !Array.isArray(raw.years) || !raw.years.length) throw new Error('收入快照格式无效')
  const seen = new Set()
  const years = raw.years.map(row => {
    if (!Number.isInteger(row.year) || seen.has(row.year) || !row.categories || typeof row.categories !== 'object' || Array.isArray(row.categories)) throw new Error('收入年度无效')
    seen.add(row.year)
    const categories = {}
    Object.entries(row.categories).forEach(([key, value]) => {
      if (!Number.isSafeInteger(value)) throw new Error('收入金额必须为整数分')
      const name = incomeCategoryName(key)
      categories[name] = (categories[name] || 0) + value
    })
    const categoryTotal = Object.values(categories).reduce((a, b) => a + b, 0)
    const total = row.total
    const without_fund = total - (categories['公积金'] || 0)
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(categoryTotal) || row.without_fund !== without_fund || typeof row.complete !== 'boolean') throw new Error('收入合计校验失败')
    return { year: row.year, categories, total, without_fund, reconciliation: total - categoryTotal, complete: row.complete, coverage: String(row.coverage || '覆盖范围未注明') }
  }).sort((a, b) => a.year - b.year)
  return { unit: raw.unit, years, monthlyAvailable: false }
}

export function incomeView(data, includeFund = true) {
  return data.years.map((row, index, rows) => {
    const amount = includeFund ? row.total : row.without_fund
    const previous = rows[index - 1]
    const previousAmount = previous && (includeFund ? previous.total : previous.without_fund)
    const comparable = row.complete && previous?.complete && previous.year === row.year - 1 && previousAmount > 0
    return { ...row, amount, growth: comparable ? (amount - previousAmount) / previousAmount : null,
      categories: Object.entries(row.categories).filter(([name]) => includeFund || name !== '公积金').map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value) }
  })
}
