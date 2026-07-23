// Vercel Function: POST /api/snapshot
import { isConfigured, readSheet, appendRows, updateRows } from './_google.js'

function toSheetDate(isoDate) {
  const m = String(isoDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}/${Number(m[2])}/${Number(m[3])}`
  return isoDate
}

function isSameDate(a, b) {
  const ma = String(a).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  const mb = String(b).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!ma || !mb) return String(a) === String(b)
  return ma[1] === mb[1] && Number(ma[2]) === Number(mb[2]) && Number(ma[3]) === Number(mb[3])
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!isConfigured()) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
  }

  try {
    let body = ''
    for await (const chunk of req) body += chunk
    const { date, total } = JSON.parse(body)
    if (!date || typeof total !== 'number') {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: '需要 date 和 total' }))
    }

    const result = await readSheet('History')
    const rows = result.data || []
    const headers = result.headers || []
    const dateKey = headers[0] // History 表第一列是日期

    let headerIdx = 0
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && String(rows[i][dateKey] || '').includes('日期')) { headerIdx = i; break }
    }

    let existingRow = -1
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (rows[i] && rows[i][dateKey] && isSameDate(rows[i][dateKey], date)) {
        existingRow = i + 2 // 1-indexed, +1 for header row
        break
      }
    }

    const sheetDate = toSheetDate(date)

    if (existingRow > 0) {
      await updateRows('History', `A${existingRow}:B${existingRow}`, [[sheetDate, total]])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, synced: true, date, total, action: 'updated' }))
    } else {
      await appendRows('History', [[sheetDate, total]])
      res.writeHead(200, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ ok: true, synced: true, date, total, action: 'appended' }))
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}