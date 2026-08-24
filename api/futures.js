// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 Market 表动态读取
// Market 表按名称识别：中证500（现货）、当月/近月/远月（期货）
import { isConfigured, readSheet, toNumber } from './_google.js'

// 按交割日动态计算剩余天数
function calcDaysToSettle(settleDate) {
  if (!settleDate) return 0
  const settleMs = new Date(settleDate).getTime()
  if (Number.isNaN(settleMs)) return 0
  return Math.max(0, Math.ceil((settleMs - Date.now()) / 86400000))
}

// 根据合约代码（如 IC2608）推断交割日：中金所股指期货为每月第三个周五
function inferSettleDate(symbol) {
  const m = String(symbol || '').match(/(\d{2})(\d{2})/)
  if (!m) return ''
  const year = 2000 + Number(m[1])
  const month = Number(m[2]) // 1-12
  if (month < 1 || month > 12) return ''
  // 当月第一个周五，再加 14 天即为第三个周五
  const first = new Date(year, month - 1, 1)
  let offset = (5 - first.getDay() + 7) % 7 // getDay(): 周五=5
  const thirdFriday = new Date(year, month - 1, 1 + offset + 14)
  const y = thirdFriday.getFullYear()
  const mo = String(thirdFriday.getMonth() + 1).padStart(2, '0')
  const d = String(thirdFriday.getDate()).padStart(2, '0')
  return `${y}-${mo}-${d}`
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!isConfigured()) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
  }

  try {
    // 读取 Market 全表（包含 name/symbol/price/group）
    const result = await readSheet('Market')
    const market = result.data || []

    // 提取市场中的期货合约与现货
    const futures = market.filter((m) => {
      const name = String(m.name || '')
      const group = String(m.group || '')
      return group === '期货' || name.includes('当月') || name.includes('近月') || name.includes('远月') || name.includes('IC')
    })

    // 按名称定位三个档位：当月、近月（次月）、远月
    const findContract = (keyword) => futures.find((m) => String(m.name || '').includes(keyword))

    const mContract = findContract('当月')
    const nContract = findContract('近月')
    const fContract = findContract('远月')

    // 现货：名称含「中证500」且非期货
    const spotItem = market.find((m) => {
      const name = String(m.name || '')
      return name.includes('中证500') && !name.includes('期货') && !name.includes('IC')
    })

    // 组装三个合约（symbol 取自 Market 的 B 列，price 取自 C 列）
    const contractRows = [
      { type: '当月', item: mContract },
      { type: '近月', item: nContract },
      { type: '远月', item: fContract },
    ]

    const spotPrice = spotItem ? toNumber(spotItem.price) : null
    const data = [
      {
        type: '现货',
        code: spotItem?.symbol || 'CSI500',
        name: '中证500',
        price: spotPrice,
        spot: spotPrice,
        discount: 0,
        annualRate: null,
        settleDate: '',
      },
    ]

    for (const { type, item } of contractRows) {
      if (!item) continue
      const code = String(item.symbol || '').trim() || String(item.name || '').trim()
      const price = toNumber(item.price)
      // 交割日由合约代码推算（每月第三个周五），可随合约换月自动更新
      const settleDate = inferSettleDate(code)
      data.push({
        type,
        code,
        name: item.name || type,
        price,
        spot: spotPrice,
        discount: spotPrice != null && price != null ? spotPrice - price : null,
        annualRate: null,
        settleDate,
      })
    }

    // 计算剩余天数与年化率
    for (const d of data) {
      d.daysToSettle = calcDaysToSettle(d.settleDate)
      if (d.daysToSettle > 0 && d.price > 0 && d.discount != null && d.discount > 0) {
        d.annualRate = Math.round((d.discount / d.price) * (365 / d.daysToSettle) * 10000) / 100
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}