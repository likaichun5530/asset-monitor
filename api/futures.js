// Vercel Function: GET /api/futures
// 中证500股指期货贴水数据，从 Market 表动态读取
// Market 表读取全部名称或代码以 IC 开头的合约，直接展示名称。
// A列=标的名称，B列=代码，C列=价格，F列=类别（与 /api/market 解析一致）
import { buildIcQuotes } from '../shared/futuresQuotes.js'
import { isConfigured, getAccessToken, toNumber } from './_google.js'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''

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

    const data = buildIcQuotes(items)

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ futures: data, syncedAt: new Date().toISOString() }))
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '期货行情读取失败' }))
  }
}
