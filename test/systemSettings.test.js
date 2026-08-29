import test from 'node:test'
import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import {
  createSystemSettingsStore,
  parseSystemSettings,
  SYSTEM_SETTING_KEYS,
  SYSTEM_SETTINGS_SHEET,
} from '../api/_system-settings.js'

test('SystemSettings 使用命名空间 key，并保留未知配置', async () => {
  let rows = [
    ['key', 'value', 'updatedAt', 'description'],
    ['custom.setting', 'keep-me', '2026-08-29T00:00:00.000Z', 'unknown setting'],
    [SYSTEM_SETTING_KEYS.aiRules, 'old rules', '2026-08-29T00:00:00.000Z', 'AI rules'],
  ]
  const calls = []
  const store = createSystemSettingsStore({
    readSheetFn: async (sheetName) => ({ headers: rows[0], rawRows: rows.slice(1) }),
    sheetExistsFn: async () => true,
    ensureSheetFn: async () => false,
    updateRowsFn: async () => { throw new Error('unexpected single update') },
    appendRowsFn: async (sheetName, values, options) => {
      calls.push({ type: 'append', sheetName, values, options })
      rows.push(...values)
    },
    batchUpdateRowsFn: async (sheetName, updates, options) => {
      calls.push({ type: 'batch', sheetName, updates, options })
      updates.forEach(({ range, values }) => {
        const rowNumber = Number(range.match(/A(\d+)/)?.[1])
        rows[rowNumber - 1] = values[0]
      })
    },
  })

  await store.upsert([
    { key: SYSTEM_SETTING_KEYS.aiRules, value: 'new rules', description: 'AI rules' },
    { key: SYSTEM_SETTING_KEYS.authUsername, value: 'owner', description: 'Login username' },
  ])

  const parsed = parseSystemSettings({ headers: rows[0], rawRows: rows.slice(1) })
  assert.equal(parsed.get('custom.setting').value, 'keep-me')
  assert.equal(parsed.get(SYSTEM_SETTING_KEYS.aiRules).value, 'new rules')
  assert.equal(parsed.get(SYSTEM_SETTING_KEYS.authUsername).value, 'owner')
  assert.equal(calls[0].sheetName, SYSTEM_SETTINGS_SHEET)
  assert.equal(calls[0].options.valueInputOption, 'RAW')
  assert.equal(calls[1].options.valueInputOption, 'RAW')
})

test('SystemSettings 结构异常时拒绝读取，且仓库不再保留 Market.gs', async () => {
  assert.throws(
    () => parseSystemSettings({ headers: ['name', 'content'], rawRows: [['x', 'y']] }),
    /SystemSettings 表结构无效/,
  )
  await assert.rejects(access(new URL('../apps-script/market/Market.gs', import.meta.url)))
  const source = await readFile(new URL('../api/_system-settings.js', import.meta.url), 'utf8')
  assert.match(source, /appsScript\.marketCode/)
})
