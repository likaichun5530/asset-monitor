import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFile, readdir } from 'node:fs/promises'

const marketScriptUrl = new URL('../apps-script/market/Market.gs', import.meta.url)

test('Market Apps Script 保持为可整段复制的单一脚本', async () => {
  const files = await readdir(new URL('../apps-script/market/', import.meta.url))
  assert.deepEqual(files.filter((name) => name.endsWith('.gs')), ['Market.gs'])

  const source = await readFile(marketScriptUrl, 'utf8')
  assert.doesNotThrow(() => new vm.Script(source, { filename: 'Market.gs' }))
})

test('Market 刷新规则让数字货币和汇率全天运行，并按市场时区调度', async () => {
  const source = await readFile(marketScriptUrl, 'utf8')
  const context = vm.createContext({})
  new vm.Script(source + '\n;globalThis.__rules = MARKET_REFRESH_RULES').runInContext(context)

  const rules = context.__rules
  assert.equal(rules.coinbase.always, true)
  assert.equal(rules.exchange.always, true)
  assert.equal(rules.finnhub.timeZone, 'America/New_York')
  assert.deepEqual(Array.from(rules.finnhub.windows[0]), ['09:25', '16:10'])
  assert.equal(rules.china.timeZone, 'Asia/Shanghai')
  assert.deepEqual(
    Array.from(rules.china.windows, (window) => Array.from(window)),
    [['09:25', '11:35'], ['12:55', '15:05']]
  )
})

test('Market 脚本仅从 Script Properties 读取 Finnhub 密钥', async () => {
  const source = await readFile(marketScriptUrl, 'utf8')
  assert.match(source, /getProperty\('FINNHUB_API_KEY'\)/)
  assert.doesNotMatch(source, /const\s+FINNHUB_API_KEY\s*=/)
  assert.doesNotMatch(source, /Logger\.log\([^\n]*(?:apiKey|token)/i)
})

test('Market 脚本使用唯一触发器并只写回 C、D 列', async () => {
  const source = await readFile(marketScriptUrl, 'utf8')
  assert.match(source, /everyMinutes\(MARKET_TRIGGER_INTERVAL_MINUTES\)/)
  assert.match(source, /removeMarketRefreshTriggers\(\)/)
  assert.match(source, /LockService\.getScriptLock\(\)/)
  assert.match(source, /getRange\(item\.rowNumber, 3, 1, 2\)/)
  assert.match(source, /getRange\(2, 2, lastRow - 1, 4\)/)
})

test('Apps Script manifest 可解析且权限范围最小化', async () => {
  const raw = await readFile(new URL('../apps-script/market/appsscript.json', import.meta.url), 'utf8')
  const manifest = JSON.parse(raw)
  assert.equal(manifest.timeZone, 'Asia/Shanghai')
  assert.equal(manifest.runtimeVersion, 'V8')
  assert.deepEqual(manifest.oauthScopes, [
    'https://www.googleapis.com/auth/spreadsheets.currentonly',
    'https://www.googleapis.com/auth/script.external_request',
    'https://www.googleapis.com/auth/script.scriptapp',
    'https://www.googleapis.com/auth/script.storage',
  ])
})
