// Vercel Function: GET /api/futures
// 返回中证500股指期货的贴水数据
// 当前为静态数据，后期可接入东方财富 API 实时抓取
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  const now = new Date()

  // 计算合约剩余天数
  function daysTo(month, day) {
    const target = new Date(now.getFullYear(), month - 1, day)
    if (target < now) target.setFullYear(target.getFullYear() + 1)
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
  }

  // 中证500股指期货贴水数据
  // 现货指数：CSI500 实时点位
  // 合约乘数：200 元/点 (IC)
  const spot = 7124.8 // 中证500 现货指数点位

  const contracts = [
    {
      type: '现货',
      code: 'CSI500',
      price: spot,
      spot: spot,
      discount: 0,
      daysToSettle: 0,
      annualRate: null,
    },
    {
      type: '当月',
      code: 'IC2607',
      price: 7048.0,
      spot: spot,
      discount: 7048.0 - spot,
      daysToSettle: 18,
      annualRate: ((spot - 7048.0) / 7048.0) * (365 / 18) * 100,
    },
    {
      type: '近月',
      code: 'IC2608',
      price: 6980.0,
      spot: spot,
      discount: 6980.0 - spot,
      daysToSettle: 48,
      annualRate: ((spot - 6980.0) / 6980.0) * (365 / 48) * 100,
    },
    {
      type: '远月',
      code: 'IC2612',
      price: 6720.0,
      spot: spot,
      discount: 6720.0 - spot,
      daysToSettle: 168,
      annualRate: ((spot - 6720.0) / 6720.0) * (365 / 168) * 100,
    },
  ]

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({
    futures: contracts.map((c) => ({
      type: c.type,
      code: c.code,
      price: Math.round(c.price * 100) / 100,
      spot: Math.round(c.spot * 100) / 100,
      discount: Math.round(c.discount * 100) / 100,
      daysToSettle: c.daysToSettle,
      annualRate: c.annualRate !== null ? Math.round(c.annualRate * 100) / 100 : null,
    })),
    syncedAt: new Date().toISOString(),
  }))
}