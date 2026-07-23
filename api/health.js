// Vercel Function: GET /api/health
import { isConfigured } from './_google.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({
    ok: true,
    hasGoogle: isConfigured(),
    timestamp: new Date().toISOString(),
  }))
}