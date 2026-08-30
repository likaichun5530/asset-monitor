import test from 'node:test'
import assert from 'node:assert/strict'
import { setActiveHoldings, changeToday } from '../src/utils/asset.js'
import { setCachedHistory } from '../src/utils/snapshot.js'

test('今日盈亏使用当前持仓总额与最近一条 History 快照计算', () => {
  setCachedHistory([
    { date: '2026-08-29', total: 1000 },
    { date: '2026-08-30', total: 1200 },
  ])
  setActiveHoldings([
    { assetType: '现金', marketValueCNY: 1300 },
  ])

  assert.deepEqual(changeToday(), {
    change: 100,
    changePct: 100 / 1200 * 100,
    startValue: 1200,
    currentValue: 1300,
    startDate: '2026-08-30',
  })
})
