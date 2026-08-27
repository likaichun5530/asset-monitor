import { readSheet, appendRows, updateRows, toNumber } from './_google.js'

export const CATEGORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']

export function classifySnapshotCategories(row) {
  const type = String(row.AssetType ?? row.assetType ?? '').toLowerCase()
  const market = String(row.Market ?? row.market ?? '').toUpperCase()
  if (type === 'stock') {
    const category = { US: 'us', CN: 'cn', HK: 'hk', JP: 'jp' }[market]
    return category ? [category] : []
  }
  if (type === 'cash') {
    const accountCategory = { US: 'us', HK: 'hk' }[market]
    return accountCategory ? ['cash', accountCategory] : ['cash']
  }
  const category = { crypto: 'crypto', bond: 'bond', future: 'future', gold: 'gold' }[type]
  return category ? [category] : []
}

function toSheetDate(isoDate) {
  const match = String(isoDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  return match ? `${match[1]}/${Number(match[2])}/${Number(match[3])}` : isoDate
}

function isSameDate(a, b) {
  const left = String(a).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  const right = String(b).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!left || !right) return String(a) === String(b)
  return left[1] === right[1] && Number(left[2]) === Number(right[2]) && Number(left[3]) === Number(right[3])
}

export function aggregateSnapshotRows(data = []) {
  const categories = {}
  let total = 0

  for (const row of data) {
    const value = toNumber(row.MarketValueCNY ?? row.marketValueCNY)
    const rowCategories = classifySnapshotCategories(row)
    if (value === null || rowCategories.length === 0) continue
    for (const category of rowCategories) {
      categories[category] = (categories[category] || 0) + value
    }
    total += value
  }

  return { categories, total }
}

export async function calculateSnapshot() {
  const { data = [] } = await readSheet('Holdings')
  return aggregateSnapshotRows(data)
}

export async function saveSnapshot(date, total, categories) {
  const history = await readSheet('History')
  const dateKey = history.headers?.[0]
  const existingIndex = (history.data || []).findIndex((row) => row?.[dateKey] && isSameDate(row[dateKey], date))
  const existingRow = existingIndex >= 0 ? existingIndex + 2 : -1
  const existingNote = existingIndex >= 0 ? history.rawRows?.[existingIndex]?.[11] || '' : ''

  const rowValues = [toSheetDate(date), Math.round(total * 100) / 100]
  for (const key of CATEGORY_KEYS) {
    rowValues.push(categories[key] === undefined ? '' : Math.round(categories[key] * 100) / 100)
  }
  rowValues.push(existingNote)

  if (existingRow > 0) {
    const lastColumn = String.fromCharCode(64 + rowValues.length)
    await updateRows('History', `A${existingRow}:${lastColumn}${existingRow}`, [rowValues])
    return 'updated'
  }

  await appendRows('History', [rowValues])
  return 'appended'
}
