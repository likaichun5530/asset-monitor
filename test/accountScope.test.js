import test from 'node:test'
import assert from 'node:assert/strict'
import { isCnAccountHolding, isHkAccountHolding, isUsAccountHolding } from '../src/utils/holdingScope.js'
import { aggregateSnapshotRows, classifySnapshotCategories } from '../api/_snapshot.js'

test('美股详情包含 US 股票和 US 现金，但不吞并其他市场现金', () => {
  assert.equal(isUsAccountHolding({ assetType: '股票', market: 'US' }), true)
  assert.equal(isUsAccountHolding({ assetType: '现金', market: 'US' }), true)
  assert.equal(isUsAccountHolding({ assetType: '现金', market: 'CN' }), false)
  assert.equal(isUsAccountHolding({ assetType: '债基', market: 'US' }), false)
})

test('A股和港股详情也包含各自市场的股票和现金', () => {
  assert.equal(isCnAccountHolding({ assetType: '股票', market: 'CN' }), true)
  assert.equal(isCnAccountHolding({ assetType: '现金', market: 'CN' }), true)
  assert.equal(isCnAccountHolding({ assetType: '现金', market: 'US' }), false)
  assert.equal(isHkAccountHolding({ assetType: '股票', market: 'HK' }), true)
  assert.equal(isHkAccountHolding({ assetType: '现金', market: 'HK' }), true)
})

test('US 现金在快照中同时进入现金配置和美股账户，且总资产只应累加一次', () => {
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'US' }), ['cash', 'us'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'CN' }), ['cash', 'cn'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Stock', Market: 'US' }), ['us'])

  const snapshot = aggregateSnapshotRows([
    { AssetType: 'Stock', Market: 'US', MarketValueCNY: 800 },
    { AssetType: 'Cash', Market: 'US', MarketValueCNY: 200 },
  ])
  assert.equal(snapshot.categories.us, 1000)
  assert.equal(snapshot.categories.cash, 200)
  assert.equal(snapshot.total, 1000)
})

test('A股和港股现金同时进入现金配置及对应账户快照', () => {
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'CN' }), ['cash', 'cn'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'HK' }), ['cash', 'hk'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'GLOBAL' }), ['cash'])
})
