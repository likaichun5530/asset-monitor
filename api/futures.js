// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，手动更新
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const spot = 7734.31

  const data = [
    { type: '现货', code: 'CSI500', price: spot, spot, discount: 0, daysToSettle: 0, annualRate: null },
    { type: '当月', code: 'IC2608', price: 7660, spot, discount: spot - 7660, daysToSettle: 25, annualRate: null },
    { type: '次月', code: 'IC2609', price: 7602.6, spot, discount: spot - 7602.6, daysToSettle: 54, annualRate: null },
    { type: '远月', code: 'IC2612', price: 7420, spot, discount: spot - 7420, daysToSettle: 145, annualRate: null },
  ]

  for (const d of data) {
    if (d.daysToSettle > 0 && d.price > 0 && d.discount > 0) {
      d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
}
