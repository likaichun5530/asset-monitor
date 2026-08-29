// Vercel Function: GET / PUT /api/history
import { isConfigured, readSheet, toNumber, updateRows } from './_google.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { requireAuth } from './_auth.js'

function normalizeDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  return s
}

export function findHistoryRowNumber(rawRows = [], date) {
  const normalized = normalizeDate(String(date || '').trim())
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized || '')) return -1
  const index = rawRows.findIndex((row) => normalizeDate(String(row?.[0] || '').trim()) === normalized)
  return index < 0 ? -1 : index + 2
}

export function normalizeHistoryNote(value) {
  const note = String(value ?? '').trim()
  if (note.length > 500) throw Object.assign(new Error('备注不能超过 500 个字符'), { statusCode: 400 })
  if (note.startsWith('=')) throw Object.assign(new Error('备注不能以等号开头'), { statusCode: 400 })
  return note
}

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

// 9类资产对应的列索引（从0开始）：
// A=0(日期), B=1(总资产), C=2(美股), D=3(虚拟币), E=4(债基), F=5(期货),
// G=6(A股), H=7(黄金), I=8(日股), J=9(港股), K=10(现金), L=11(备注)
const CATEGORY_KEYS = ['us', 'crypto', 'bond', 'future', 'cn', 'gold', 'jp', 'hk', 'cash']

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (!['GET', 'PUT'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' })

  try {
    await requireAuth(req)
    if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })
    const result = await readSheet('History')
    const rawRows = result.rawRows || [] // 原始行数组，不依赖表头映射

    if (req.method === 'PUT') {
      const body = await readJsonBody(req)
      const date = normalizeDate(String(body.date || '').trim())
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return json(res, 400, { error: '日期格式无效' })
      const rowNumber = findHistoryRowNumber(rawRows, date)
      if (rowNumber < 0) return json(res, 404, { error: '找不到该日期的历史快照' })
      const note = normalizeHistoryNote(body.note)
      await updateRows('History', `L${rowNumber}`, [[note]])
      return json(res, 200, { ok: true, date, note, syncedAt: new Date().toISOString() })
    }

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

    return json(res, 200, {
      history,
      syncedAt: new Date().toISOString(),
    })
  } catch (e) {
    return json(res, e.statusCode || 500, { error: e.statusCode ? e.message : '历史数据操作失败' })
  }
}
