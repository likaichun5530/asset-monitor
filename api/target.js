// Vercel Function: GET /api/target
import { isConfigured, readSheet } from './_google.js'
import { requireAuth } from './_auth.js'
import { setPrivateResponseHeaders } from './_http.js'
import { aggregateHoldingsByCategory, calculateAllocations, parseTargetMap } from './_allocation.js'

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  try {
    await requireAuth(req)
    if (!isConfigured()) {
      res.writeHead(503, { 'Content-Type': 'application/json' })
      return res.end(JSON.stringify({ error: 'Google Sheets 未配置' }))
    }
    // 并行读取 Holdings 和 target 表
    const [hResult, tResult] = await Promise.all([
      readSheet('Holdings'),
      readSheet('target').catch(() => null),
    ])
    const { categoryTotals, total: totalCNY } = aggregateHoldingsByCategory(hResult.data || [])
    const targetMap = parseTargetMap(tResult)

    // 3. 合并
    const result = calculateAllocations(categoryTotals, totalCNY, targetMap).map((row) => ({
      category: row.category,
      marketValue: Math.round(row.marketValue * 100) / 100,
      currentRatio: row.currentRatio,
      targetRatio: row.targetRatio,
      diff: row.difference,
      isTotal: false,
    }))

    const totalTarget = Array.from(targetMap.values()).reduce((s, v) => s + v, 0)
    result.push({
      category: '合计',
      marketValue: Math.round(totalCNY * 100) / 100,
      currentRatio: 1,
      targetRatio: totalTarget > 0 ? totalTarget : null,
      diff: null,
      isTotal: true,
    })

    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({
      target: result,
      syncedAt: new Date().toISOString(),
    }))
  } catch (e) {
    res.writeHead(e.statusCode || 500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: e.statusCode ? e.message : '目标配置读取失败' }))
  }
}
