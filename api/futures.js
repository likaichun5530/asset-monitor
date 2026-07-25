// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 market 表获取现货价格
import { isConfigured, readSheet, toNumber } from './_google.js'

const SPOT_FALLBACK = 7734.31
const CONTRACT_FALLBACK = {
  '中证500期货当月': 7660,
  '中证500期货近月': 7602.6,
  '中证500期货远月': 7420,
}

async function getPrice(name, fallback) {
  if (!isConfigured()) return fallback
  try {
    const result = await readSheet('Market')
    for (const row of (result.data || [])) {
      const rowName = (row[Object.keys(row)[0]] || '').toString().trim()
      if (rowName === name) {
        const raw = String(row[Object.keys(row)[1]] || '').replace(/,/g, '').replace(/"/g, '').trim()
        const val = parseFloat(raw)
        if (!isNaN(val)) return val
      }
    }
  } catch (e) { console.warn(`[futures] 读取 ${name} 失败`, e) }
  return fallback
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const spot = await getPrice('中证500', SPOT_FALLBACK)
  const p0 = await getPrice('中证500期货当月', CONTRACT_FALLBACK['中证500期货当月'])
  const p1 = await getPrice('中证500期货近月', CONTRACT_FALLBACK['中证500期货近月'])
  const p2 = await getPrice('中证500期货远月', CONTRACT_FALLBACK['中证500期货远月'])

  const data = [
    { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null, settleDate: '' },
    { type: '当月', code: 'IC2608', price: p0, spot, discount: spot - p0, daysToSettle: 25, annualRate: null, settleDate: '2026-08-21' },
    { type: '次月', code: 'IC2609', price: p1, spot, discount: spot - p1, daysToSettle: 54, annualRate: null, settleDate: '2026-09-18' },
    { type: '远月', code: 'IC2612', price: p2, spot, discount: spot - p2, daysToSettle: 145, annualRate: null, settleDate: '2026-12-18' },
  ]

  for (const d of data) {
    if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
      d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
}