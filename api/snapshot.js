// Vercel Function: POST /api/snapshot
import { isConfigured, readSheet, appendRows, updateRows, toNumber } from './_google.js'

// 9类资产的分类规则
function classifyAsset(row) {
  const type = String(row.AssetType ?? row.assetType ?? '').toLowerCase()
  const market = String(row.Market ?? row.market ?? '').toUpperCase()

  if (type === 'stock') {
    if (market === 'US') return 'us'
    if (market === 'CN') return 'cn'
    if (market === 'HK') return 'hk'
    if (market === 'JP') return 'jp'
    return null
  }
  if (type === 'crypto') return 'crypto'
  if (type === 'bond') return 'bond'
  if (type === 'future') return 'future'
  if (type === 'gold') return 'gold'
  if (type === 'cash') return 'cash'
  return null
}

const CATEGORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']

function toSheetDate(isoDate) {
  const m = String(isoDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}/${Number(m[2])}/${Number(m[3])}`
  return isoDate
}

function isSameDate(a, b) {
  const ma = String(a).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  const mb = String(b).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!ma || !mb) return String(a) === String(b)
  return ma[1] === mb[1] && Number(ma[2]) === Number(mb[2]) && Number(ma[3]) === Number(mb[3])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!isConfigured()) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
  }

  try {
    let body = ''
    for await (const chunk of req) body += chunk
    const { date } = JSON.parse(body)

    // 1. 读取 Holdings 表，按 9 类资产汇总
    const holdingsResult = await readSheet('Holdings')
    const rows = holdingsResult.data || []

    const categories = {}
    let total = 0
    for (const row of rows) {
      const val = toNumber(row.MarketValueCNY ?? row.marketValueCNY)
      if (val === null) continue
      const key = classifyAsset(row)
      if (!key) continue
      categories[key] = (categories[key] || 0) + val
      total += val
    }

    if (!date || typeof total !== 'number') {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: '需要 date 和 total' }))
    }

    // 2. 写入 History 表
    const result = await readSheet('History')
    const historyRows = result.data || []
    const headers = result.headers || []
    const dateKey = headers[0]

    let headerIdx = 0
    for (let i = 0; i < Math.min(historyRows.length, 5); i++) {
      if (historyRows[i] && String(historyRows[i][dateKey] || '').includes('日期')) { headerIdx = i; break }
    }

    let existingRow = -1
    for (let i = headerIdx + 1; i < historyRows.length; i++) {
      if (historyRows[i] && historyRows[i][dateKey] && isSameDate(historyRows[i][dateKey], date)) {
        existingRow = i + 2
        break
      }
    }

    const sheetDate = toSheetDate(date)

    // 3. 组装写入行：[日期, 总资产, 美股, 虚拟币, 债券, 期货, A股, 黄金, 日股, 港股, 现金, 备注]
    const rowValues = [
      sheetDate,
      Math.round(total * 100) / 100,
    ]
    for (const key of CATEGORY_KEYS) {
      rowValues.push(categories[key] !== undefined ? Math.round(categories[key] * 100) / 100 : '')
    }
    rowValues.push('')

    if (existingRow > 0) {
      const col = String.fromCharCode(64 + rowValues.length)
      await updateRows('History', `A${existingRow}:${col}${existingRow}`, [rowValues])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, synced: true, date, total: Math.round(total * 100) / 100, categories, action: 'updated' }))
    } else {
      await appendRows('History', [rowValues])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, synced: true, date, total: Math.round(total * 100) / 100, categories, action: 'appended' }))
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}