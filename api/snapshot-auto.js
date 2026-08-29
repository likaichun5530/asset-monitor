// Vercel Cron Function: 每天北京时间 23:00 自动生成资产快照
// 由 vercel.json crons 配置触发
import { isConfigured } from './_google.js'
import { calculateSnapshot, saveSnapshot } from './_snapshot.js'
import { secureTextEqual } from './_auth.js'
import { setPrivateResponseHeaders } from './_http.js'

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vercel 会在配置 CRON_SECRET 后自动附加该 Authorization 头。
  // x-vercel-cron 可由外部请求伪造，因此不能作为鉴权依据。
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return res.status(503).json({ error: '服务端 CRON_SECRET 未配置' })
  }
  if (!secureTextEqual(req.headers.authorization, `Bearer ${cronSecret}`)) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!isConfigured()) {
    return res.status(503).json({ error: 'Google Sheets 未配置' })
  }

  try {
    const { categories, total } = await calculateSnapshot()

    if (total === 0) {
      return res.status(200).json({ ok: true, message: '总资产为 0，跳过快照', total })
    }

    const today = new Date().toISOString().slice(0, 10)
    const action = await saveSnapshot(today, total, categories)

    return res.status(200).json({
      ok: true,
      date: today,
      total: Math.round(total * 100) / 100,
      categories,
      action,
    })
  } catch {
    return res.status(500).json({ error: '自动快照生成失败' })
  }
}
