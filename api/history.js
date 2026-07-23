// Vercel Function: GET /api/history
import { isConfigured, readSheet, toNumber } from './_google.js'

function normalizeDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  return s
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
    const result = await readSheet('History')
    const rows = result.data || []
    const headers = result.headers || []
    const dateKey = headers[0]  // A列：日期
    const totalKey = headers[1] // B列：资产总额
    const noteKey = headers[2]  // C列：备注（可选）

    let headerIdx = 0
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && String(rows[i][dateKey] || '').includes('日期')) { headerIdx = i; break }
    }

    const history = []
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row) continue
      const dateStr = row[dateKey]
      if (!dateStr) continue
      const date = normalizeDate(String(dateStr).trim())
      if (!date) continue
      const total = toNumber(row[totalKey])
      if (total === null) continue
      const obj = { date, total: total || 0 }
      if (noteKey && row[noteKey]) obj.note = String(row[noteKey]).trim()
      history.push(obj)
    }
    history.sort((a, b) => new Date(a.date) - new Date(b.date))

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      history,
      syncedAt: new Date().toISOString(),
    }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}