// Vercel Function: POST /api/snapshot
import { isConfigured } from './_google.js'
import { readJsonBody } from './_http.js'
import { calculateSnapshot, saveSnapshot } from './_snapshot.js'

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
    const { date } = await readJsonBody(req)
    const { categories, total } = await calculateSnapshot()

    if (!date) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: '需要 date' }))
    }

    const action = await saveSnapshot(date, total, categories)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, synced: true, date, total: Math.round(total * 100) / 100, categories, action }))
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}
