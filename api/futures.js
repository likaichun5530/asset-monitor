// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 Market 表动态读取
// Market 表按名称识别：中证500（现货）、当月/近月/远月（期货）
// A列=标的名称，B列=代码，C列=价格，F列=类别（与 /api/market 解析一致）
import { isConfigured, getAccessToken, toNumber } from './_google.js'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

// 按交割日动态计算剩余天数
function calcDaysToSettle(settleDate) {
  if (!settleDate) return 0
  const settleMs = new Date(settleDate).getTime()
  if (Number.isNaN(settleMs)) return 0
  return Math.max(0, Math.ceil((settleMs - Date.now()) / 86400000))
}

// 根据合约代码（如 IC2609）推断交割日：中金所股指期货为每月第三个周五
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
    // 直接读取 Market 表 A:G，按列索引解析
    const token = await getAccessToken()
    const sheetName = encodeURIComponent('Market')
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:G`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) throw new Error(`读取失败: ${resp.status}`)
    const result = await resp.json()
    const rows = result.values || []

    const items = rows
      .slice(1) // 跳过表头行
      .map((row) => ({
        name: (row[0] || '').toString().trim(), // A列：标的名称
        symbol: (row[1] || '').toString().trim(), // B列：代码
        price: toNumber(row[2]), // C列：价格
        group: (row[5] || '').toString().trim() || '其他', // F列：类别
      }))
      .filter((m) => m.name)

    // 期货合约：类别为「期货」
    const contracts = items.filter((m) => m.group === '期货')

    // 按名称定位三档合约：当月、近月、远月
    const findContract = (keyword) => contracts.find((m) => m.name.includes(keyword))
    const contractRows = [
      { type: '当月', item: findContract('当月') },
      { type: '近月', item: findContract('近月') },
      { type: '远月', item: findContract('远月') },
    ]

    // 现货：名称含「中证500」且类别非期货
    const spotItem = items.find((m) => m.name.includes('中证500') && m.group !== '期货')
    const spotPrice = spotItem ? spotItem.price : null

    const data = [
      {
        type: '现货',
        code: spotItem?.symbol || 'sh000905',
        name: spotItem?.name || '中证500',
        price: spotPrice,
        spot: spotPrice,
        discount: 0,
        annualRate: null,
        settleDate: '',
      },
    ]

    for (const { type, item } of contractRows) {
      if (!item) continue
      const code = item.symbol || item.name
      const price = item.price
      // 交割日由合约代码推算（每月第三个周五），可随合约换月自动更新
      const settleDate = inferSettleDate(code)
      data.push({
        type,
        code,
        name: item.name,
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
