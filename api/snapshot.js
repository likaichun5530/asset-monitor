// Vercel Function: POST /api/snapshot
import { isConfigured } from './_google.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { calculateSnapshot, saveSnapshot } from './_snapshot.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    await requireAuth(req)
    if (!isConfigured()) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
    }
    const { date } = await readJsonBody(req)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'date 必须使用 YYYY-MM-DD 格式' }))
    }

    const { categories, total } = await calculateSnapshot()
    const action = await saveSnapshot(date, total, categories)
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, synced: true, date, total: Math.round(total * 100) / 100, categories, action }))
  } catch (e) {
    res.writeHead(e.statusCode || 500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: e.statusCode ? e.message : '快照生成失败' }))
  }
}
