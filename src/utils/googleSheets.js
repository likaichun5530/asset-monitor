// 浏览器端直接访问 Google Sheets API（使用 Service Account JWT 认证）
// 不需要后端代理，可直接在手机 Capacitor WebView 中使用

import * as jose from 'jose'

const SPREADSHEET_ID = import.meta.env.VITE_SPREADSHEET_ID || ''
const SHEET_HOLDINGS = import.meta.env.VITE_SHEET_NAME_HOLDINGS || 'Holdings'
const SHEET_HISTORY = import.meta.env.VITE_SHEET_NAME_HISTORY || 'History'
const CLIENT_EMAIL = import.meta.env.VITE_GOOGLE_SERVICE_ACCOUNT_EMAIL || ''
const PRIVATE_KEY = (import.meta.env.VITE_GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n')

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']

let cachedToken = null
let tokenExpiry = 0

export function isConfigured() {
  const configured = Boolean(SPREADSHEET_ID && CLIENT_EMAIL && PRIVATE_KEY)
  console.log('[googleSheets] isConfigured:', configured, {
    hasSpreadsheetId: Boolean(SPREADSHEET_ID),
    hasClientEmail: Boolean(CLIENT_EMAIL),
    hasPrivateKey: Boolean(PRIVATE_KEY),
    privateKeyLength: PRIVATE_KEY?.length
  })
  return configured
}

export async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && tokenExpiry > now + 60) {
    console.log('[googleSheets] 使用缓存的token')
    return cachedToken
  }

  console.log('[googleSheets] 开始获取新的access token')
  
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: CLIENT_EMAIL,
    scope: SCOPES.join(' '),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  }

  try {
    const pkcs8 = PRIVATE_KEY.trim()
    const key = await jose.importPKCS8(pkcs8, { alg: 'RS256' })
    const jwt = await new jose.SignJWT(payload)
      .setProtectedHeader(header)
      .sign(key)

    console.log('[googleSheets] JWT创建成功，正在请求token')
    
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
      console.error('[googleSheets] Token请求失败:', resp.status, text)
      throw new Error(`获取 Google token 失败: ${resp.status} ${text}`)
    }

    const data = await resp.json()
    cachedToken = data.access_token
    tokenExpiry = now + (data.expires_in || 3600)
    console.log('[googleSheets] Token获取成功')
    return cachedToken
  } catch (error) {
    console.error('[googleSheets] 获取token过程中出错:', error)
    
    // 检查是否是网络错误
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，无法连接到Google服务器')
    }
    
    throw error
  }
}

export async function readSheet(sheetName) {
  if (!isConfigured()) throw new Error('Google Sheets 未配置')
  
  console.log(`[googleSheets] 开始读取工作表: ${sheetName}`)
  
  try {
    const token = await getAccessToken()
    console.log(`[googleSheets] Token获取成功，正在请求 ${sheetName} 数据`)

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}!A:Z`
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })

    if (!resp.ok) {
      const text = await resp.text()
      console.error(`[googleSheets] 读取 ${sheetName} 失败:`, resp.status, text)
      
      // 提供更详细的错误信息
      if (resp.status === 401) {
        throw new Error(`认证失败，请检查Google Sheets配置`)
      } else if (resp.status === 403) {
        throw new Error(`权限不足，请确认Service Account有访问该表格的权限`)
      } else if (resp.status === 404) {
        throw new Error(`找不到工作表 "${sheetName}"，请确认工作表名称正确`)
      } else {
        throw new Error(`读取 ${sheetName} 失败: ${resp.status} ${text}`)
      }
    }

    const result = await resp.json()
    const rows = result.values || []
    console.log(`[googleSheets] 成功读取 ${sheetName}，共 ${rows.length} 行`)
    
    if (rows.length < 2) {
      console.warn(`[googleSheets] ${sheetName} 数据不足，返回空数据`)
      return { headers: rows[0] || [], data: [] }
    }

    const headers = rows[0].map((h) => String(h).trim())
    const data = rows.slice(1).map((row) => {
      const obj = {}
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : '' })
      return obj
    })

    console.log(`[googleSheets] ${sheetName} 数据解析完成，表头:`, headers)
    return { headers, data }
    
  } catch (error) {
    console.error(`[googleSheets] 读取 ${sheetName} 过程中出错:`, error)
    
    // 检查是否是网络错误
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      throw new Error('网络连接失败，无法访问Google Sheets')
    }
    
    throw error
  }
}

export function getConfig() {
  return { spreadsheetId: SPREADSHEET_ID, sheetHoldings: SHEET_HOLDINGS, sheetHistory: SHEET_HISTORY }
}