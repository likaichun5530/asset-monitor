import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { isDataStale, shouldAutoRefresh } from '../src/utils/refreshPolicy.js'

test('数据刷新策略仅在可见、过期且没有并发请求时触发', () => {
  const now = 1_000_000
  const maxAgeMs = 300_000
  assert.equal(isDataStale(0, maxAgeMs, now), true)
  assert.equal(isDataStale(now - maxAgeMs + 1, maxAgeMs, now), false)
  assert.equal(isDataStale(now - maxAgeMs, maxAgeMs, now), true)
  assert.equal(shouldAutoRefresh({ visible: false, inFlight: false, lastFetchedAt: 0, maxAgeMs, now }), false)
  assert.equal(shouldAutoRefresh({ visible: true, inFlight: true, lastFetchedAt: 0, maxAgeMs, now }), false)
  assert.equal(shouldAutoRefresh({ visible: true, inFlight: false, lastFetchedAt: now - maxAgeMs, maxAgeMs, now }), true)
})

test('Holdings 与 History 自动刷新按依赖页面启停', async () => {
  const hookSource = await readFile(new URL('../src/hooks/useAssetData.js', import.meta.url), 'utf8')
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(hookSource, /refreshHoldings/)
  assert.match(hookSource, /loadHoldingsData\(\{ forceRefresh: force \}\)/)
  assert.match(hookSource, /autoRefreshHoldings/)
  assert.match(hookSource, /setInterval\(\(\) => \{ refreshHoldings\(false\) \}/)
  assert.match(hookSource, /const HISTORY_REFRESH_MS = 5 \* 60 \* 1000/)
  assert.match(hookSource, /lastHistoryRefreshRef/)
  assert.match(hookSource, /setInterval\(\(\) => \{ refreshHistory\(false\) \}, HISTORY_REFRESH_MS\)/)
  assert.match(hookSource, /if \(requestSucceeded\) lastHistoryRefreshRef\.current = Date\.now\(\)/)
  assert.match(appSource, /const HOLDINGS_PAGES = new Set/)
  assert.match(appSource, /autoRefreshHistory: needsHistory/)
  assert.doesNotMatch(appSource.match(/const HOLDINGS_PAGES[^\n]+/)?.[0] || '', /market|settings/)
})

test('页面刷新只驱动当前页面的数据源', async () => {
  const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(appSource, /path === '\/market'\) \{ bumpPageRefresh\('market'\)/)
  assert.match(appSource, /path === '\/target'\) \{ bumpPageRefresh\('target'\)/)
  assert.match(appSource, /path === '\/future'\) \{ bumpPageRefresh\('future'\)/)
  assert.match(appSource, /path\.startsWith\('\/settings\/'\)\) return/)
  assert.match(appSource, /<Market refreshKey=\{pageRefreshKeys\.market\}/)
})

test('期货页复用 futures 响应中的 Market 数据，不重复请求 market 接口', async () => {
  const futureSource = await readFile(new URL('../src/pages/Future.jsx', import.meta.url), 'utf8')
  assert.match(futureSource, /getApiJson\('futures', \{ auth: false, forceRefresh \}\)/)
  assert.doesNotMatch(futureSource, /getApiJson\('market'/)
})
