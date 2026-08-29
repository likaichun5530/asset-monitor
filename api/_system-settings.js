import { appendRows, batchUpdateRows, ensureSheet, readSheet, sheetExists, updateRows } from './_google.js'

export const SYSTEM_SETTINGS_SHEET = 'SystemSettings'
export const SYSTEM_SETTINGS_HEADERS = Object.freeze(['key', 'value', 'updatedAt', 'description'])

export const SYSTEM_SETTING_KEYS = Object.freeze({
  authUsername: 'auth.username',
  authPasswordHash: 'auth.passwordHash',
  authPasswordSalt: 'auth.passwordSalt',
  authTokenVersion: 'auth.tokenVersion',
  authUpdatedAt: 'auth.updatedAt',
  aiRules: 'ai.rules',
  marketScript: 'appsScript.marketCode',
})

function settingsError(message, cause) {
  return Object.assign(new Error(message), {
    statusCode: 503,
    code: 'SYSTEM_SETTINGS_ERROR',
    ...(cause ? { cause } : {}),
  })
}

export function parseSystemSettings(result) {
  const headers = result?.headers || []
  const rawRows = result?.rawRows || []
  if (!headers.length && !rawRows.length) return new Map()

  const normalizedHeaders = headers.map((value) => String(value || '').trim().toLowerCase())
  if (normalizedHeaders[0] !== 'key' || normalizedHeaders[1] !== 'value') {
    throw settingsError(`${SYSTEM_SETTINGS_SHEET} 表结构无效`)
  }

  const settings = new Map()
  rawRows.forEach((row, index) => {
    const key = String(row?.[0] || '').trim()
    if (!key || settings.has(key)) return
    settings.set(key, {
      key,
      value: String(row?.[1] ?? ''),
      updatedAt: String(row?.[2] ?? ''),
      description: String(row?.[3] ?? ''),
      rowNumber: index + 2,
    })
  })
  return settings
}

export function createSystemSettingsStore({
  readSheetFn = readSheet,
  sheetExistsFn = sheetExists,
  ensureSheetFn = ensureSheet,
  updateRowsFn = updateRows,
  appendRowsFn = appendRows,
  batchUpdateRowsFn = batchUpdateRows,
} = {}) {
  async function read() {
    try {
      return { exists: true, settings: parseSystemSettings(await readSheetFn(SYSTEM_SETTINGS_SHEET)) }
    } catch (error) {
      let exists
      try {
        exists = await sheetExistsFn(SYSTEM_SETTINGS_SHEET)
      } catch (metadataError) {
        throw settingsError('系统设置读取失败', metadataError)
      }
      if (exists) throw settingsError('系统设置读取失败', error)
      return { exists: false, settings: new Map() }
    }
  }

  async function upsert(entries) {
    const timestamp = new Date().toISOString()
    const normalized = entries.map((entry) => ({
      key: String(entry.key || '').trim(),
      value: String(entry.value ?? ''),
      updatedAt: String(entry.updatedAt || timestamp),
      description: String(entry.description || ''),
    }))
    if (!normalized.length || normalized.some((entry) => !entry.key)) {
      throw settingsError('系统设置写入参数无效')
    }

    await ensureSheetFn(SYSTEM_SETTINGS_SHEET)
    const current = parseSystemSettings(await readSheetFn(SYSTEM_SETTINGS_SHEET))
    const valuesFor = (entry) => [[entry.key, entry.value, entry.updatedAt, entry.description]]

    if (!current.size) {
      await updateRowsFn(
        SYSTEM_SETTINGS_SHEET,
        `A1:D${normalized.length + 1}`,
        [SYSTEM_SETTINGS_HEADERS, ...normalized.map((entry) => valuesFor(entry)[0])],
        { valueInputOption: 'RAW' },
      )
      return normalized
    }

    const existing = normalized.filter((entry) => current.has(entry.key))
    const missing = normalized.filter((entry) => !current.has(entry.key))
    if (existing.length) {
      const updates = existing.map((entry) => {
        const rowNumber = current.get(entry.key).rowNumber
        return { range: `A${rowNumber}:D${rowNumber}`, values: valuesFor(entry) }
      })
      if (batchUpdateRowsFn) {
        await batchUpdateRowsFn(SYSTEM_SETTINGS_SHEET, updates, { valueInputOption: 'RAW' })
      } else {
        await Promise.all(updates.map((update) => updateRowsFn(
          SYSTEM_SETTINGS_SHEET,
          update.range,
          update.values,
          { valueInputOption: 'RAW' },
        )))
      }
    }
    if (missing.length) {
      await appendRowsFn(
        SYSTEM_SETTINGS_SHEET,
        missing.map((entry) => valuesFor(entry)[0]),
        { valueInputOption: 'RAW' },
      )
    }
    return normalized
  }

  return { read, upsert }
}

export const systemSettingsStore = createSystemSettingsStore()
