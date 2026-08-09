// Vercel Function: GET /api/market
// 从 Google Sheets Market 表读取行情数据
// A列=标的名称，C列=标的价格，F列=标的类别，G列=显示标识（y=显示）
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
        const sheetName = encodeURIComponent('Market')
        // 读取 A:G 列
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:G`
        const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!resp.ok) throw new Error(`读取失败: ${resp.status}`)
        const result = await resp.json()
        const rows = result.values || []
        for (const row of rows) {
          // G列（index 6）：显示标识，必须是 y 才显示
          const show = (row[6] || '').toString().trim().toLowerCase()
          if (show !== 'y') continue
          const name = (row[0] || '').toString().trim()  // A列：标的名称
          if (!name) continue
          const symbol = (row[1] || '').toString().trim()  // B列：代码
          const raw = String(row[2] || '').replace(/,/g, '').replace(/"/g, '').trim()  // C列：价格
          const price = parseFloat(raw)
          const group = (row[5] || '').toString().trim() || '其他'  // F列：类别
          market.push({ name, symbol, price: isNaN(price) ? null : price, group })
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
