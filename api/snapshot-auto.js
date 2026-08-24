// Vercel Cron Function: 每天北京时间 23:00 自动生成资产快照
// 由 vercel.json crons 配置触发
import { isConfigured } from './_google.js'
import { calculateSnapshot, saveSnapshot } from './_snapshot.js'

const CRON_SECRET = process.env.CRON_SECRET || ''

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Vercel Cron 自动携带 x-vercel-cron 头，手动调用需传 CRON_SECRET
  const isVercelCron = req.headers['x-vercel-cron'] === '1'
  const isValidAuth = CRON_SECRET && req.headers['authorization'] === `Bearer ${CRON_SECRET}`
  if (!isVercelCron && !isValidAuth) {
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
  } catch (e) {
    return res.status(500).json({ error: String(e) })
  }
}
