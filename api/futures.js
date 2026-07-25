// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 market 表获取现货价格
import { isConfigured, readSheet, toNumber } from './_google.js'

let SPOT_FALLBACK = 7734.31

async function getSpotPrice() {
  if (!isConfigured()) return SPOT_FALLBACK
  try {
    const result = await readSheet('Market')
    for (const row of (result.data || [])) {
      const name = (row[Object.keys(row)[0]] || '').toString().trim()
      if (name === '中证500') {
        const price = toNumber(row[Object.keys(row)[1]])
        if (price != null) return price
      }
    }
  } catch (e) { console.warn('[futures] 读取现货价失败', e) }
  return SPOT_FALLBACK
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const spot = await getSpotPrice()

  const data = [
    { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null, settleDate: '' },
    { type: '当月', code: 'IC2608', price: 7660, spot, discount: spot - 7660, daysToSettle: 25, annualRate: null, settleDate: '2026-08-21' },
    { type: '次月', code: 'IC2609', price: 7602.6, spot, discount: spot - 7602.6, daysToSettle: 54, annualRate: null, settleDate: '2026-09-18' },
    { type: '远月', code: 'IC2612', price: 7420, spot, discount: spot - 7420, daysToSettle: 145, annualRate: null, settleDate: '2026-12-18' },
  ]

  for (const d of data) {
    if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
      d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
}
