// Vercel Function: GET /api/market
// 从 Google Sheets Market_Show 表读取行情数据（A列=类型，B列=标的，C列=价格）
// 注意：此表第一行就是数据，没有表头行
import { isConfigured, getAccessToken } from './_google.js'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    let market = []
    if (isConfigured()) {
      try {
        const token = await getAccessToken()
        const sheetName = encodeURIComponent('Market_Show')
        // 直接按位置读取 A:C 列的所有行，不把头行当表头
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:C`
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!resp.ok) throw new Error(`读取失败: ${resp.status}`)
        const result = await resp.json()
        const rows = result.values || []
        for (const row of rows) {
          const group = (row[0] || '').toString().trim()
          const name = (row[1] || '').toString().trim()
          if (!name) continue
          const raw = String(row[2] || '').replace(/,/g, '').replace(/"/g, '').trim()
          const price = parseFloat(raw)
          market.push({ name, price: isNaN(price) ? null : price, group: group || '其他' })
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
