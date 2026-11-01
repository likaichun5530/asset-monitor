import { normalizeIncome } from './income.js'
import { incomeCategoryName } from './income-categories.js'
const cents = value => {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('源表金额无效')
  return Math.round(value * 100)
}
// Formula-only zero rows are not evidence of recorded income.
export function snapshotFromSheets(payload, snapshotAt) {
  const years = payload.valueRanges.filter(sheet => /^'?\d{4}'?!/.test(sheet.range)).map(sheet => {
    const [header, ...rows] = sheet.values
    const year = Number(header[0])
    const totalRow = rows.find(row => row[0] === '合计')
    if (!totalRow) throw new Error('缺少年度合计')
    const categories = {}
    header.slice(1, header.indexOf('合计')).forEach((name, i) => { const label = incomeCategoryName(name, String.fromCharCode(66+i)); categories[label] = (categories[label] || 0) + cents(totalRow[i+1] ?? 0) })
    const months = rows.filter(row => /^\d{1,2}月$/.test(row[0]) && row.slice(1, header.indexOf('合计')).some(value => typeof value === 'number')).map(row => row[0])
    const total = cents(totalRow[header.indexOf('合计')])
    return { year, categories, total, without_fund: total - (categories['公积金'] || 0), coverage: months.join('、'), complete: new Set(months).size === 12 }
  })
  return { ...normalizeIncome({ unit: 'CNY_cents', years }), snapshotAt }
}
