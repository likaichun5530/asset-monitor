import test from 'node:test'
import assert from 'node:assert/strict'
import { getHistoryDayDetail } from '../src/utils/historyChanges.js'

test('收益日历按上一条快照计算每类资产变化', () => {
  const detail = getHistoryDayDetail([
    { date: '2026-08-25', total: 1000, categories: { us: 400, cash: 600 } },
    { date: '2026-08-28', total: 1100, categories: { us: 550, cash: 550 } },
  ], '2026-08-28')

  assert.equal(detail.previousDate, '2026-08-25')
  assert.equal(detail.totalChange, 100)
  assert.equal(detail.canCompareCategories, true)
  assert.equal(detail.categories.find((item) => item.key === 'us').change, 150)
  assert.equal(detail.categories.find((item) => item.key === 'cash').change, -50)
})

test('没有可比较分类快照时显示所选日期的分类金额', () => {
  const detail = getHistoryDayDetail([
    { date: '2026-08-25', total: 900 },
    { date: '2026-08-28', total: 1000, categories: { bond: 300, cash: 700 } },
  ], '2026-08-28')

  assert.equal(detail.canCompareCategories, false)
  assert.equal(detail.categories.find((item) => item.key === 'bond').currentValue, 300)
  assert.equal(detail.categories.find((item) => item.key === 'cash').currentValue, 700)
})

test('日历详情保留当天 History 备注', () => {
  const detail = getHistoryDayDetail([
    { date: '2026-08-28', total: 1000, categories: { cash: 1000 }, note: '工资到账' },
  ], '2026-08-28')

  assert.equal(detail.note, '工资到账')
})
