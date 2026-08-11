// 后端：Google Sheets 读写 API

import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

const PORT = process.env.PORT || 8787
const SPREADSHEET_ID = process.env.SPREADSHEET_ID
const SHEET_NAME_HOLDINGS = process.env.SHEET_NAME_HOLDINGS || 'Holdings'
const SHEET_NAME_HISTORY = process.env.SHEET_NAME_HISTORY || 'History'
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
const PRIVATE_KEY_RAW = process.env.GOOGLE_PRIVATE_KEY || ''
const PRIVATE_KEY = PRIVATE_KEY_RAW.replace(/\\n/g, '\n')

if (!SPREADSHEET_ID || !SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) {
  console.warn('[warn] 未配置 Google Sheets 凭据，API 将返回 503。')
}

let jwtClient = null
function getAuth() {
  if (jwtClient) return jwtClient
  if (!SERVICE_ACCOUNT_EMAIL || !PRIVATE_KEY) return null
  jwtClient = new google.auth.JWT(
    SERVICE_ACCOUNT_EMAIL, null, PRIVATE_KEY,
    ['https://www.googleapis.com/auth/spreadsheets']
  )
  return jwtClient
}

async function getSheets() {
  const auth = getAuth()
  if (!auth) return null
  await auth.authorize()
  return google.sheets({ version: 'v4', auth })
}

function toNumber(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  let s = String(val).replace(/,/g, '').trim()
  if (s === '' || s === '-') return null
  // 支持百分比字符串（如 "25.00%" → 0.25）
  if (s.endsWith('%')) {
    const pct = Number(s.slice(0, -1).trim())
    return Number.isNaN(pct) ? null : pct / 100
  }
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}

async function readSheet(sheetName) {
  const sheets = await getSheets()
  if (!sheets) throw new Error('Google Sheets 未配置')
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
  })
  const rows = resp.data.values || []
  if (rows.length < 2) return []
  const headers = rows[0].map((h) => String(h).trim())
  return rows.slice(1).map((row) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : '' })
    return obj
  })
}

function normalizeDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (m) {
    return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`
  }
  return s
}

function toSheetDate(isoDate) {
  const m = String(isoDate).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m) return `${m[1]}/${Number(m[2])}/${Number(m[3])}`
  return isoDate
}

// 判断两个日期字符串是否同一天
function isSameDate(a, b) {
  const ma = String(a).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  const mb = String(b).match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/)
  if (!ma || !mb) return String(a) === String(b)
  return ma[1] === mb[1] && Number(ma[2]) === Number(mb[2]) && Number(ma[3]) === Number(mb[3])
}

// 读取 target 表（配置目标）
// 当前金额和占比从 Holdings 实时计算，目标比例从 target 表读取
app.get('/api/target', async (req, res) => {
  try {
    const sheets = await getSheets()
    if (!sheets) return res.status(503).json({ error: 'Google Sheets 未配置' })

    // 1. 从 Holdings 实时计算各类资产金额（股票按市场拆分）
    const hResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Holdings!A:J',
    })
    const hRows = hResp.data.values || []
    const hHeaders = hRows[0] || []
    const colIdx = {}
    hHeaders.forEach((h, i) => { colIdx[h] = i })

    function stockLabel(market) {
      if (market === 'US') return '美股'
      if (market === 'CN') return 'A股'
      if (market === 'HK') return '港股'
      if (market === 'JP') return '日股'
      return '股票'
    }

    const catMap = new Map()
    let totalCNY = 0
    for (let i = 1; i < hRows.length; i++) {
      const row = hRows[i]
      if (!row || !row[colIdx.AssetType]) continue
      let cat = row[colIdx.AssetType]
      if (cat === 'Stock') {
        cat = stockLabel(row[colIdx.Market])
      } else {
        const map = { Crypto: '虚拟币', Gold: '黄金', Cash: '现金', Bond: '债券', Future: '期货' }
        cat = map[cat] || cat
      }
      const mv = toNumber(row[colIdx.MarketValueCNY]) || 0
      totalCNY += mv
      catMap.set(cat, (catMap.get(cat) || 0) + mv)
    }

    // 2. 从 target 表读取目标比例
    const tResp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'target!A:E',
      valueRenderOption: 'UNFORMATTED_VALUE',
    })
    const tRows = tResp.data.values || []
    const targetMap = new Map() // category -> targetRatio
    if (tRows.length >= 2) {
      for (let i = 1; i < tRows.length; i++) {
        const row = tRows[i]
        if (!row || !row[0]) continue
        const cat = String(row[0]).trim()
        if (cat.includes('合计')) continue
        const target = toNumber(row[1]) // B列：配置目标
        if (target !== null) targetMap.set(cat, target)
      }
    }

    // 3. 合并：实时金额 + 目标比例 → 计算差值
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

    // 合计行
    const totalTarget = Array.from(targetMap.values()).reduce((s, v) => s + v, 0)
    result.push({
      category: '合计',
      marketValue: Math.round(totalCNY * 100) / 100,
      currentRatio: 1,
      targetRatio: totalTarget > 0 ? totalTarget : null,
      diff: null,
      isTotal: true,
    })

    res.json({ target: result, syncedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[target]', e)
    res.status(500).json({ error: String(e) })
  }
})

app.get('/api/health', (req, res) => {
  res.json({ ok: true, hasGoogle: Boolean(getAuth()) })
})

app.get('/api/holdings', async (req, res) => {
  try {
    const data = await readSheet(SHEET_NAME_HOLDINGS)
    const numericFields = ['Quantity', 'Price', 'MarketValue', 'MarketValueCNY']
    const parsed = data
      .filter((r) => r.AssetType)
      .map((r) => {
        const out = { ...r }
        for (const f of numericFields) out[f] = toNumber(out[f])
        return out
      })
    res.json({ holdings: parsed, syncedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[holdings]', e)
    res.status(500).json({ error: String(e) })
  }
})

app.get('/api/history', async (req, res) => {
  try {
    const sheets = await getSheets()
    if (!sheets) return res.status(503).json({ error: 'Google Sheets 未配置' })
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME_HISTORY}!A:C`,
    })
    const rows = resp.data.values || []
    let headerIdx = 0
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && String(rows[i][0]).includes('日期')) { headerIdx = i; break }
    }
    const parsed = []
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || !row[0]) continue
      const date = normalizeDate(String(row[0]).trim())
      const total = toNumber(row[1])
      const note = row[2] ? String(row[2]).trim() : undefined
      if (!date) continue
      const obj = { date, total: total || 0 }
      if (note) obj.note = note
      parsed.push(obj)
    }
    res.json({ history: parsed, syncedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[history]', e)
    res.status(500).json({ error: String(e) })
  }
})

// 追加/覆盖快照（若当天已有数据则覆盖，否则追加）
app.post('/api/snapshot', async (req, res) => {
  try {
    const { date, total } = req.body
    if (!date || typeof total !== 'number') {
      return res.status(400).json({ error: '需要 date 和 total' })
    }
    const sheets = await getSheets()
    if (!sheets) return res.status(503).json({ error: 'Google Sheets 未配置' })
    const sheetDate = toSheetDate(date)

    // 读取现有数据查找是否已有当天记录
    const resp = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME_HISTORY}!A:B`,
    })
    const rows = resp.data.values || []
    let headerIdx = 0
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
      if (rows[i] && String(rows[i][0]).includes('日期')) { headerIdx = i; break }
    }

    let existingRow = -1
    for (let i = headerIdx + 1; i < rows.length; i++) {
      if (rows[i] && rows[i][0] && isSameDate(rows[i][0], date)) {
        existingRow = i + 1
        break
      }
    }

    if (existingRow > 0) {
      // 覆盖已有行
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME_HISTORY}!A${existingRow}:B${existingRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[sheetDate, total]] },
      })
      res.json({ ok: true, synced: true, date, total, action: 'updated' })
    } else {
      // 追加新行
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME_HISTORY}!A:B`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [[sheetDate, total]] },
      })
      res.json({ ok: true, synced: true, date, total, action: 'appended' })
    }
  } catch (e) {
    console.error('[snapshot]', e)
    res.status(500).json({ error: String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`Asset Monitor API listening on http://localhost:${PORT}`)
})