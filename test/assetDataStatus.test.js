import test from 'node:test'
import assert from 'node:assert/strict'
import { getInitialAssetStatus } from '../src/utils/assetDataStatus.js'

function storage(values = {}) {
  return { getItem(key) { return values[key] ?? null } }
}

test('启动时有持仓缓存就立即显示缓存状态', () => {
  const syncedAt = '2026-08-27T12:00:00.000Z'
  const status = getInitialAssetStatus(storage({
    'asset-monitor:holdings': JSON.stringify({ holdings: [{ name: '缓存持仓' }], syncedAt }),
  }))
  assert.deepEqual(status, { source: 'cache', syncedAt })
})

test('只有真的没有在线数据且没有缓存时才使用无数据初始状态', () => {
  assert.deepEqual(getInitialAssetStatus(storage()), { source: 'empty', syncedAt: null })
})

test('演示模式启动时不会短暂显示实盘缓存', () => {
  const status = getInitialAssetStatus(storage({
    'youshu-demo-mode': 'true',
    'asset-monitor:holdings': JSON.stringify({ holdings: [{ name: '实盘持仓' }] }),
  }))
  assert.deepEqual(status, { source: 'demo', syncedAt: null })
})
