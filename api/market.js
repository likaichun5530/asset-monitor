// Vercel Function: GET /api/market
// 从 Google Sheets Market_Show 表读取行情数据（A列=类型，B列=标的，C列=价格）
import { isConfigured, readSheet } from './_google.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    let market = []
    if (isConfigured()) {
      try {
        const result = await readSheet('Market_Show')
        const data = result.data || []
        const headers = result.headers || []
        const groupKey = headers[0] || ''   // A列：类型
        const nameKey = headers[1] || ''    // B列：标的
        const priceKey = headers[2] || ''   // C列：价格
        for (const row of data) {
          const name = (row[nameKey] || '').toString().trim()
          if (!name) continue
          const raw = String(row[priceKey] || '').replace(/,/g, '').replace(/"/g, '').trim()
          const price = parseFloat(raw)
          const group = (row[groupKey] || '').toString().trim() || '其他'
          market.push({ name, price: isNaN(price) ? null : price, group })
        }
      } catch (e) {
        console.warn('[market] Google Sheets 读取失败', e)
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
