// Vercel Function: GET /api/market
// 从 Google Sheets Market 表读取行情数据
// A列=标的名称，C列=标的价格，F列=标的类别，G列=显示标识（y=显示）
import { isConfigured, getAccessToken } from './_google.js'
import { fetchTodaySubscriptions } from './_subscription-data.js'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (req.query?.view === 'subscriptions') {
    try {
      const data = await fetchTodaySubscriptions()
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=600',
      })
      return res.end(JSON.stringify(data))
    } catch {
      res.writeHead(502, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      })
      return res.end(JSON.stringify({ error: '新股新债数据暂时不可用' }))
    }
  }

  if (!isConfigured()) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
  }

  try {
    const market = []
    const token = await getAccessToken()
    const sheetName = encodeURIComponent('Market')
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!A:G`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!resp.ok) throw new Error(`读取失败: ${resp.status}`)
    const result = await resp.json()
    const rows = result.values || []
    for (const row of rows) {
      const show = (row[6] || '').toString().trim().toLowerCase()
      if (show !== 'y') continue
      const name = (row[0] || '').toString().trim()
      if (!name) continue
      const symbol = (row[1] || '').toString().trim()
      const raw = String(row[2] || '').replace(/,/g, '').replace(/"/g, '').trim()
      const price = parseFloat(raw)
      const group = (row[5] || '').toString().trim() || '其他'
      market.push({ name, symbol, price: isNaN(price) ? null : price, group })
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ market, syncedAt: new Date().toISOString() }))
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '行情读取失败' }))
  }
}
