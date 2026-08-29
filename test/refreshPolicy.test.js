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

test('资产自动刷新只加载 holdings，History 只在首次或手动刷新加载', async () => {
  const hookSource = await readFile(new URL('../src/hooks/useAssetData.js', import.meta.url), 'utf8')
  const assetSource = await readFile(new URL('../src/utils/asset.js', import.meta.url), 'utf8')
  assert.match(hookSource, /refreshHoldings/)
  assert.match(hookSource, /loadHoldingsData\(\)/)
  assert.doesNotMatch(hookSource, /loadAll/)
  assert.match(assetSource, /export async function loadInitialData/)
  assert.match(assetSource, /export async function loadHistoryData/)
})

test('期货页复用 futures 响应中的 Market 数据，不重复请求 market 接口', async () => {
  const futureSource = await readFile(new URL('../src/pages/Future.jsx', import.meta.url), 'utf8')
  assert.match(futureSource, /getApiJson\('futures', \{ auth: false \}\)/)
  assert.doesNotMatch(futureSource, /getApiJson\('market'/)
})
