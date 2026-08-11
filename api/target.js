// Vercel Function: GET /api/target
import { isConfigured, readSheet, toNumber } from './_google.js'

function stockLabel(market) {
  if (market === 'US') return '美股'
  if (market === 'CN') return 'A股'
  if (market === 'HK') return '港股'
  if (market === 'JP') return '日股'
  return '股票'
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
    // 并行读取 Holdings 和 target 表
    const [hResult, tResult] = await Promise.all([
      readSheet('Holdings'),
      readSheet('target').catch(() => null),
    ])
    const hData = hResult.data || []

    // 聚合各类资产金额
    const catMap = new Map()
    let totalCNY = 0
    for (let i = 0; i < hData.length; i++) {
      const row = hData[i]
      if (!row || !row.AssetType) continue
      let cat = row.AssetType
      if (cat === 'Stock') {
        cat = stockLabel(row.Market)
      } else {
        const map = { Crypto: '虚拟币', Gold: '黄金', Cash: '现金', Bond: '债基', Future: '期货' }
        cat = map[cat] || cat
      }
      const mv = toNumber(row.MarketValueCNY) || 0
      totalCNY += mv
      catMap.set(cat, (catMap.get(cat) || 0) + mv)
    }

    // 解析 target 表
    const targetMap = new Map()
    if (tResult) {
      const tData = tResult.data || []
      const tHeaders = tResult.headers || []
      // 第一列是类别名，第二列是目标值
      const catCol = tHeaders[0]
      const valCol = tHeaders.find(h => h && (h.includes('目标') || h.includes('比例'))) || tHeaders[1]
      for (let i = 0; i < tData.length; i++) {
        const row = tData[i]
        const cat = String(row[catCol] || '').trim()
        if (!cat || cat.includes('合计')) continue
        const target = toNumber(row[valCol])
        if (target !== null) targetMap.set(cat, target)
      }
    }

    // 3. 合并
    const result = Array.from(catMap.entries())
      .map(([cat, mv]) => {
        const currentRatio = totalCNY ? mv / totalCNY : 0
        const targetRatio = targetMap.has(cat) ? targetMap.get(cat) : null
        const diff = targetRatio !== null ? currentRatio - targetRatio : null
        return {
          category: cat,
          marketValue: Math.round(mv * 100) / 100,
          currentRatio,
          targetRatio,
          diff,
          isTotal: false,
        }
      })
      .sort((a, b) => b.marketValue - a.marketValue)

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
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: String(e) }))
  }
}