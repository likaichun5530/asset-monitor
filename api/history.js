// Vercel Function: GET /api/history
import { isConfigured, readSheet, toNumber } from './_google.js'

function normalizeDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  return s
}

// 9类资产对应的列索引（从0开始）：
// A=0(日期), B=1(总资产), C=2(美股), D=3(虚拟币), E=4(债基), F=5(期货),
// G=6(A股), H=7(黄金), I=8(日股), J=9(港股), K=10(现金), L=11(备注)
const CATEGORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']

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
    const rawRows = result.rawRows || [] // 原始行数组，不依赖表头映射

    const history = []
    for (const row of rawRows) {
      if (!row || !row[0]) continue
      const date = normalizeDate(String(row[0]).trim())
      if (!date) continue
      const total = toNumber(row[1])
      if (total === null) continue

      const obj = { date, total: total || 0 }

      // 解析各类资产（C~K列，索引2~10）
      const categories = {}
      for (let ci = 0; ci < CATEGORY_KEYS.length; ci++) {
        const colIdx = ci + 2 // C列=索引2
        const val = row[colIdx] !== undefined ? toNumber(row[colIdx]) : null
        if (val !== null && val !== 0) categories[CATEGORY_KEYS[ci]] = val
      }
      if (Object.keys(categories).length > 0) obj.categories = categories

      // 备注（L列，索引11）
      if (row[11]) obj.note = String(row[11]).trim()

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
