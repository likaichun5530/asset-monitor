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

const FALLBACK = {}

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
          const raw = String(row[priceKey] || '').replace(/,/g, '').replace(/"/g, '').trim()
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
