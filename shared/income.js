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
    const months = new Set()
    const monthly = (row.monthly || []).map(entry => {
      if (!Number.isInteger(entry.month) || entry.month < 1 || entry.month > 12 || months.has(entry.month) || !entry.categories || Array.isArray(entry.categories) || (entry.total !== null && !Number.isSafeInteger(entry.total))) throw new Error('收入月度无效')
      months.add(entry.month)
      const categories = {}
      Object.entries(entry.categories).forEach(([key, value]) => {
        if (!Number.isSafeInteger(value)) throw new Error('收入月度金额必须为整数分')
        const name = incomeCategoryName(key)
        categories[name] = (categories[name] || 0) + value
      })
      return { month: entry.month, categories, total: entry.total }
    }).sort((a, b) => a.month - b.month)
    return { year: row.year, categories, monthly, total, without_fund, reconciliation: total - categoryTotal, complete: row.complete, coverage: String(row.coverage || '覆盖范围未注明') }
  }).sort((a, b) => a.year - b.year)
  return { unit: raw.unit, years, monthlyAvailable: years.some(row => row.monthly.length > 0) }
}

// Calendar boundaries are always the user's timezone, not the server/browser locale.
export function incomeCalendar(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric' }).formatToParts(now)
  return { year: Number(parts.find(part => part.type === 'year').value), month: Number(parts.find(part => part.type === 'month').value) }
}

export function incomeMonthDetail(row, category) {
  const name = incomeCategoryName(category)
  return (row.monthly || []).filter(entry => Object.hasOwn(entry.categories, name)).map(entry => ({ month: entry.month, amount: entry.categories[name] }))
}

export function incomeSamePeriod(data, month, currentYear = incomeCalendar().year) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new Error('同期月份无效')
  return data.years.map(row => {
    const monthly = (row.monthly || []).filter(entry => entry.month <= month && Object.keys(entry.categories).length && Number.isSafeInteger(entry.total))
    const missingMonths = Array.from({ length: month }, (_, i) => i + 1).filter(value => !monthly.some(entry => entry.month === value))
    // This year's source total is the actual cumulative amount, not a projected period.
    const current = row.year === currentYear
    const categories = current ? row.categories : monthly.reduce((totals, entry) => {
      Object.entries(entry.categories).forEach(([name, value]) => { totals[name] = (totals[name] || 0) + value })
      return totals
    }, {})
    const amount = current ? row.total : missingMonths.length ? null : monthly.reduce((sum, entry) => sum + entry.total, 0)
    return { ...row, categories, monthly: current ? row.monthly : monthly, total: amount, without_fund: amount === null ? null : amount - (categories['公积金'] || 0), amount, missingMonths }
  })
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
