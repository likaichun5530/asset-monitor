import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeIncome, incomeView } from '../shared/income.js'

const snapshot = { unit: 'CNY_cents', years: [
  { year: 2025, categories: { 工资: 10000, 提取公积金: 2000 }, total: 12000, without_fund: 10000, complete: true, coverage: '1～12月' },
  { year: 2026, categories: { 工资: 5000, 提取公积金: 1000 }, total: 6000, without_fund: 5000, complete: false, coverage: '1～9月' },
] }
test('annual snapshot preserves cents, exclusion and incomplete-year comparability', () => {
  const data = normalizeIncome(snapshot)
  const view = incomeView(data, false)
  assert.equal(view[0].amount, 10000)
  assert.equal(view[1].growth, null)
  assert.equal(view[1].categories.length, 1)
  assert.equal(view[1].amount, 5000)
  assert.equal(data.monthlyAvailable, false)
})

test('source total is authoritative when rounded category sums differ', () => {
 const data=normalizeIncome({unit:'CNY_cents',years:[{year:2025,categories:{工资:100,提取公积金:20},total:121,without_fund:101,complete:true}]})
 assert.equal(data.years[0].total,121)
 assert.equal(data.years[0].reconciliation,1)
 assert.equal(incomeView(data,false)[0].amount,101)
})
