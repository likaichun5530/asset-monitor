// Vercel Function: GET /api/market
// 从 Google Sheets Market 表读取标的名称和价格（A列=名称，B列=价格）
import { isConfigured, readSheet } from './_google.js'

const GROUP_MAP = {
  'USD': '汇率', 'HKD': '汇率', 'JPY': '汇率',
  '上证指数': 'A股', '中证500': 'A股', '中证1000': 'A股', '沪深300': 'A股',
  '中证500期货当月': '期货', '中证500期货近月': '期货', '中证500期货远月': '期货',
  'BTC': '数字货币', 'ETH': '数字货币',
  '纳斯达克指数': '境外', '日经225指数': '境外',
  'SGE黄金9999': '其他',
}

const FALLBACK = {
  '上证指数': 3876.78, '中证500': 7734.31, '中证1000': 7195.50, '沪深300': 4728.00,
  'BTC': 64786.71, 'ETH': 1885.88,
  '日经225指数': 39504, '纳斯达克指数': 19654,
  'USD': 7.26, 'HKD': 0.93, 'JPY': 0.048,
  'SGE黄金9999': 731.50,
  '中证500期货当月': 7660, '中证500期货近月': 7602.6, '中证500期货远月': 7420,
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    let market = []
    if (isConfigured()) {
      try {
        const result = await readSheet('Market')
        const data = result.data || []
        const headers = result.headers || []
        const nameKey = headers[0] || ''
        const priceKey = headers[1] || ''
        for (const row of data) {
          const name = (row[nameKey] || '').toString().trim()
          if (!name) continue
          const raw = row[priceKey]
          const price = parseFloat(raw)
          market.push({
            name,
            price: isNaN(price) ? null : price,
            group: GROUP_MAP[name] || '其他',
          })
        }
      } catch (e) {
        console.warn('[market] Google Sheets 读取失败', e)
      }
    }

    // 回退
    if (!market.length) {
      for (const [name, price] of Object.entries(FALLBACK)) {
        market.push({ name, price, group: GROUP_MAP[name] || '其他' })
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ market, syncedAt: new Date().toISOString() }))
  } catch (e) {
    console.error('[market]', e)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}
