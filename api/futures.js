// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 market 表指定单元格读取
// Market sheet: B9 = 当月, B10 = 近月, B11 = 远月
import { isConfigured, toNumber } from './_google.js'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

const SPOT_FALLBACK = 7734.31
const CONTRACT_FALLBACK = [7660, 7602.6, 7420]

async function getCellValue(range, fallback) {
  if (!isConfigured()) return fallback
  try {
    const { getAccessToken } = await import('./_google.js')
    const token = await getAccessToken()
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent('Market')}!${range}`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) return fallback
    const result = await resp.json()
    const raw = result.values?.[0]?.[0]
    if (raw === undefined || raw === null) return fallback
    const cleaned = String(raw).replace(/,/g, '').replace(/"/g, '').trim()
    const val = parseFloat(cleaned)
    return isNaN(val) ? fallback : val
  } catch (e) {
    console.warn(`[futures] 读取 ${range} 失败`, e)
    return fallback
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  // 现货价格从 B2 单元格读取
  const spot = await getCellValue('B2', SPOT_FALLBACK)
  // 当月 B9, 近月 B10, 远月 B11
  const [p0, p1, p2] = await Promise.all([
    getCellValue('B9', CONTRACT_FALLBACK[0]),
    getCellValue('B10', CONTRACT_FALLBACK[1]),
    getCellValue('B11', CONTRACT_FALLBACK[2]),
  ])

  // 按交割日动态计算剩余天数（避免硬编码固定值）
  function calcDaysToSettle(settleDate) {
    if (!settleDate) return 0
    const settleMs = new Date(settleDate).getTime()
    if (Number.isNaN(settleMs)) return 0
    return Math.max(0, Math.ceil((settleMs - Date.now()) / 86400000))
  }

  const data = [
    { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, annualRate: null, settleDate: '' },
    { type: '当月', code: 'IC2608', price: p0, spot, discount: spot - p0, annualRate: null, settleDate: '2026-08-21' },
    { type: '次月', code: 'IC2609', price: p1, spot, discount: spot - p1, annualRate: null, settleDate: '2026-09-18' },
    { type: '远月', code: 'IC2612', price: p2, spot, discount: spot - p2, annualRate: null, settleDate: '2026-12-18' },
  ]

  for (const d of data) {
    d.daysToSettle = calcDaysToSettle(d.settleDate)
    if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
      d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
}