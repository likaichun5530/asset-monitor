import { ensureSheet, isConfigured, readSheet, sheetExists, updateRows } from './_google.js'
import { isStoredPasswordValid } from './_password.js'

export const AUTH_CONFIG_SHEET = 'AuthConfig'
export const DEFAULT_TOKEN_VERSION = 1
export const AUTH_CONFIG_CACHE_TTL_MS = 20_000

function configError(message, cause) {
  return Object.assign(new Error(message), {
    statusCode: 503,
    code: 'AUTH_CONFIGURATION_ERROR',
    ...(cause ? { cause } : {}),
  })
}

function uninitializedConfig() {
  return Object.freeze({ initialized: false, tokenVersion: DEFAULT_TOKEN_VERSION })
}

export function parseAuthConfig(result) {
  const headers = result?.headers || []
  const rawRows = result?.rawRows || []
  if (!headers.length && !rawRows.length) return uninitializedConfig()

  const normalizedHeaders = headers.map((value) => String(value || '').trim().toLowerCase())
  if (normalizedHeaders[0] !== 'key' || normalizedHeaders[1] !== 'value') {
    throw configError('AuthConfig 表结构无效')
  }

  const values = Object.create(null)
  rawRows.forEach((row) => {
    const key = String(row?.[0] || '').trim()
    if (key && values[key] === undefined) values[key] = String(row?.[1] ?? '')
  })

  const tokenVersion = Number(values.tokenVersion)
  const updatedAt = String(values.updatedAt || '')
  if (
    !String(values.username || '').trim()
    || !isStoredPasswordValid(values.passwordHash, values.passwordSalt)
    || !Number.isInteger(tokenVersion)
    || tokenVersion < DEFAULT_TOKEN_VERSION
    || !updatedAt
    || Number.isNaN(Date.parse(updatedAt))
  ) {
    throw configError('AuthConfig 认证配置不完整')
  }

  return Object.freeze({
    initialized: true,
    username: String(values.username),
    passwordHash: String(values.passwordHash),
    passwordSalt: String(values.passwordSalt),
    tokenVersion,
    updatedAt,
  })
}

export function createAuthConfigStore({
  isConfiguredFn,
  readSheetFn,
  sheetExistsFn,
  ensureSheetFn,
  updateRowsFn,
  now = () => Date.now(),
  ttlMs = AUTH_CONFIG_CACHE_TTL_MS,
}) {
  let cached = null
  let expiresAt = 0
  let pendingRead = null
  let cacheEpoch = 0

  function invalidate() {
    cacheEpoch += 1
    cached = null
    expiresAt = 0
    pendingRead = null
  }

  async function readFresh(currentTime, requestEpoch) {
    let result
    try {
      result = await readSheetFn(AUTH_CONFIG_SHEET)
    } catch (error) {
      let exists
      try {
        exists = await sheetExistsFn(AUTH_CONFIG_SHEET)
      } catch (metadataError) {
        throw configError('认证配置读取失败', metadataError)
      }
      if (exists) throw configError('认证配置读取失败', error)
      result = { headers: [], rawRows: [] }
    }

    const parsed = parseAuthConfig(result)
    if (requestEpoch === cacheEpoch) {
      cached = parsed
      expiresAt = currentTime + ttlMs
    }
    return parsed
  }

  function read({ forceRefresh = false } = {}) {
    const currentTime = now()
    if (!forceRefresh && cached && expiresAt > currentTime) return Promise.resolve(cached)
    if (!forceRefresh && pendingRead) return pendingRead
    if (!isConfiguredFn()) return Promise.reject(configError('Google Sheets 未配置'))

    const request = readFresh(currentTime, cacheEpoch)
    if (forceRefresh) return request
    pendingRead = request
    request.finally(() => {
      if (pendingRead === request) pendingRead = null
    }).catch(() => {})
    return request
  }

  async function write(config) {
    if (!isConfiguredFn()) throw configError('Google Sheets 未配置')
    const normalized = parseAuthConfig({
      headers: ['key', 'value'],
      rawRows: [
        ['username', config.username],
        ['passwordHash', config.passwordHash],
        ['passwordSalt', config.passwordSalt],
        ['tokenVersion', config.tokenVersion],
        ['updatedAt', config.updatedAt],
      ],
    })

    await ensureSheetFn(AUTH_CONFIG_SHEET)
    await updateRowsFn(AUTH_CONFIG_SHEET, 'A1:B6', [
      ['key', 'value'],
      ['username', normalized.username],
      ['passwordHash', normalized.passwordHash],
      ['passwordSalt', normalized.passwordSalt],
      ['tokenVersion', normalized.tokenVersion],
      ['updatedAt', normalized.updatedAt],
    ], { valueInputOption: 'RAW' })

    // 只有完整写入成功后才清缓存；失败时旧认证配置继续有效。
    invalidate()
    return normalized
  }

  return { invalidate, read, write }
}

const defaultStore = createAuthConfigStore({
  isConfiguredFn: isConfigured,
  readSheetFn: readSheet,
  sheetExistsFn: sheetExists,
  ensureSheetFn: ensureSheet,
  updateRowsFn: updateRows,
})

export function getAuthConfig(options) {
  return defaultStore.read(options)
}

export function writeAuthConfig(config) {
  return defaultStore.write(config)
}
