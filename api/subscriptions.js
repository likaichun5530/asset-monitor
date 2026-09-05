// Vercel Function: GET /api/subscriptions
// 仅返回上海时区当天的新股、可转债申购日历，不包含任何私人资产数据。
import { fetchTodaySubscriptions } from './_subscription-data.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'GET' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

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
