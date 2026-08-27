import test from 'node:test'
import assert from 'node:assert/strict'
import { getMarketCashName, isUsAccountHolding } from '../src/utils/holdingScope.js'
import { aggregateSnapshotRows, classifySnapshotCategories } from '../api/_snapshot.js'

test('证券账户详情按 Stock + Market 归属，不按名称判断现金', () => {
  assert.equal(isUsAccountHolding({ assetType: '股票', market: 'US' }), true)
  assert.equal(isUsAccountHolding({ assetType: '股票', market: 'US', name: '美元现金', symbol: '-' }), true)
  assert.equal(isUsAccountHolding({ assetType: '现金', market: 'US' }), false)
  assert.equal(isUsAccountHolding({ assetType: '现金', market: 'CN' }), false)
  assert.equal(isUsAccountHolding({ assetType: '债基', market: 'US' }), false)
})

test('快照严格按 AssetType 归类，同一笔资金只进入一类', () => {
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'US' }), ['cash'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'CN' }), ['cash'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Stock', Market: 'US' }), ['us'])

  const snapshot = aggregateSnapshotRows([
    { AssetType: 'Stock', Market: 'US', MarketValueCNY: 800 },
    { AssetType: 'Stock', Market: 'US', Symbol: '-', MarketValueCNY: 200 },
  ])
  assert.equal(snapshot.categories.us, 1000)
  assert.equal(snapshot.categories.cash, undefined)
  assert.equal(snapshot.total, 1000)
})

test('A股和港股现金只进入现金配置', () => {
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'CN' }), ['cash'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'HK' }), ['cash'])
  assert.deepEqual(classifySnapshotCategories({ AssetType: 'Cash', Market: 'GLOBAL' }), ['cash'])
})

test('证券账户现金使用固定名称', () => {
  assert.equal(getMarketCashName('A股'), '人民币现金')
  assert.equal(getMarketCashName('美股'), '美元现金')
  assert.equal(getMarketCashName('港股'), '港币现金')
  assert.equal(getMarketCashName('日股'), '日元现金')
  assert.equal(getMarketCashName('现金'), '')
})
