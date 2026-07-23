// Vercel Function 共享模块：Google Service Account JWT 认证 + Sheets API 读取
// 零外部依赖，使用 Node.js 内置 crypto 模块
// 凭据从 Vercel 环境变量注入，不出现在浏览器中

import crypto from 'crypto'

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || ''
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const PRIVATE_KEY = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

let cachedToken = null
let tokenExpiry = 0

export function isConfigured() {
  return Boolean(SPREADSHEET_ID && SERVICE_ACCOUNT_EMAIL && PRIVATE_KEY)
}

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// 使用 Node crypto 签名 JWT（零依赖）
function signJWT(header, payload) {
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)))
  const signatureInput = `${headerB64}.${payloadB64}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signatureInput)
  signer.end()
  const signature = base64url(signer.sign(PRIVATE_KEY))
  return `${signatureInput}.${signature}`
}

export async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && tokenExpiry > now + 60) return cachedToken

  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  const jwt = signJWT(header, payload)

  const resp = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`获取 Google token 失败: ${resp.status} ${text}`)
  }

  const data = await resp.json()
  cachedToken = data.access_token
  tokenExpiry = now + (data.expires_in || 3600)
  return cachedToken
}

export async function readSheet(sheetName) {
  if (!isConfigured()) throw new Error('Google Sheets 未配置')
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`读取 ${sheetName} 失败: ${resp.status} ${text}`)
  }
  const result = await resp.json()
  const rows = result.values || []
  if (rows.length < 2) return { headers: rows[0] || [], data: [] }
  const headers = rows[0].map((h) => String(h).trim())
  const data = rows.slice(1).map((row) => {
    const obj = {}
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : '' })
    return obj
  })
  return { headers, data }
}

// 通过 Sheets API 写入行
export async function appendRows(sheetName, values) {
  if (!isConfigured()) throw new Error('Google Sheets 未配置')
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z:append?valueInputOption=USER_ENTERED`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })
  return resp.ok
}

// 更新指定行
export async function updateRows(sheetName, range, values) {
  if (!isConfigured()) throw new Error('Google Sheets 未配置')
  const token = await getAccessToken()
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!${range}?valueInputOption=USER_ENTERED`
  const resp = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ values }),
  })
  return resp.ok
}

// 工具函数
export function toNumber(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return val
  const s = String(val).replace(/"/g, '').replace(/,/g, '').trim()
  if (s === '' || s === '-') return null
  // 支持百分比字符串（如 "25.00%" → 0.25）
  if (s.endsWith('%')) {
    const pct = Number(s.slice(0, -1).trim())
    return Number.isNaN(pct) ? null : pct / 100
  }
  const n = Number(s)
  return Number.isNaN(n) ? null : n
}
