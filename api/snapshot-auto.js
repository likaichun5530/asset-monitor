// Vercel Cron Function: 每天北京时间 00:40 自动生成资产快照
// 由 vercel.json crons 配置触发
import { isConfigured, readSheet, appendRows, updateRows, toNumber } from './_google.js'

const CRON_SECRET = process.env.CRON_SECRET || ''

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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vercel Cron 自动携带 x-vercel-cron 头，手动调用需传 CRON_SECRET
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  const isValidAuth = CRON_SECRET && req.headers['authorization'] === `Bearer ${CRON_SECRET}`
  if (!isVercelCron && !isValidAuth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Google Sheets 未配置' })
  }

  try {
    const result = await readSheet('Holdings')
    const rows = result.data || []

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

    if (total === 0) {
      return res.status(200).json({ ok: true, message: '总资产为 0，跳过快照', total })
    }

    const today = new Date().toISOString().slice(0, 10)
    const sheetDate = toSheetDate(today)

    const rowValues = [
      sheetDate,
      Math.round(total * 100) / 100,
    ]
    for (const key of CATEGORY_KEYS) {
      rowValues.push(categories[key] !== undefined ? Math.round(categories[key] * 100) / 100 : '')
    }
    rowValues.push('')

    const historyResult = await readSheet('History')
    const historyRows = historyResult.data || []
    const headers = historyResult.headers || []
    const dateKey = headers[0]

    let headerIdx = 0
    for (let i = 0; i < Math.min(historyRows.length, 5); i++) {
      if (historyRows[i] && String(historyRows[i][dateKey] || '').includes('日期')) { headerIdx = i; break }
    }

    let existingRow = -1
    for (let i = headerIdx + 1; i < historyRows.length; i++) {
      if (historyRows[i] && historyRows[i][dateKey] && isSameDate(historyRows[i][dateKey], today)) {
        existingRow = i + 2
        break
      }
    }

    if (existingRow > 0) {
      const col = String.fromCharCode(64 + rowValues.length)
      await updateRows('History', `A${existingRow}:${col}${existingRow}`, [rowValues])
    } else {
      await appendRows('History', [rowValues])
    }

    return res.status(200).json({
      ok: true,
      date: today,
      total: Math.round(total * 100) / 100,
      categories,
      action: existingRow > 0 ? 'updated' : 'appended',
    })
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}