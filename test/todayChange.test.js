import test from 'node:test'
import assert from 'node:assert/strict'
import { changeToday, drawdownFromPeak, setActiveHoldings } from '../src/utils/asset.js'
import { setCachedHistory } from '../src/utils/snapshot.js'

test('今日盈亏与收益日历一致，使用最新日总资产减去前一自然日总资产', () => {
  setCachedHistory([
    { date: '2026-08-29', total: 1000 },
    { date: '2026-08-30', total: 1200 },
  ])
  assert.deepEqual(changeToday(), {
    change: 200,
    changePct: 20,
    startValue: 1000,
    currentValue: 1200,
    startDate: '2026-08-29',
  })
})

test('缺少昨日快照时今日盈亏不跨日期间隔计算', () => {
  setCachedHistory([
    { date: '2026-08-27', total: 1000 },
    { date: '2026-08-30', total: 1200 },
  ])

  assert.equal(changeToday().change, null)
  assert.equal(changeToday().changePct, null)
})

test('最高点回撤忽略分位精度和刷新产生的极小尾差', () => {
  setCachedHistory([{ date: '2026-09-10', total: 1000.03 }])
  setActiveHoldings([{ marketValueCNY: 1000.011 }])
  assert.deepEqual(drawdownFromPeak(), {
    change: 0,
    changePct: 0,
    peakValue: 1000.03,
    peakDate: '2026-09-10',
    currentValue: 1000.01,
  })

  setActiveHoldings([{ marketValueCNY: 999.93 }])
  assert.equal(drawdownFromPeak().change, -0.1)
})
