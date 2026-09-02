import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getTargetAdjustmentAmount, getTargetAllocationStatus, getTargetAllowedRange } from '../src/utils/targetAllocation.js'

test('目标偏差同时支持绝对百分点和相对比例阈值', () => {
  assert.equal(getTargetAllocationStatus(0.12, 0.10).status, 'over')
  assert.equal(getTargetAllocationStatus(0.03, 0.02).status, 'over')
  assert.equal(getTargetAllocationStatus(0.07, 0.10).status, 'under')
  assert.equal(getTargetAllocationStatus(0.01, 0.02).status, 'under')
  assert.equal(getTargetAllocationStatus(0.11, 0.10).status, 'balanced')
})

test('目标合理区间同时满足绝对偏差和相对偏差限制', () => {
  const standardTargetRange = getTargetAllowedRange(0.10)
  assert.ok(Math.abs(standardTargetRange.lower - 0.08) < 1e-12)
  assert.ok(Math.abs(standardTargetRange.upper - 0.12) < 1e-12)
  const smallTargetRange = getTargetAllowedRange(0.02)
  assert.ok(Math.abs(smallTargetRange.lower - 0.012) < 1e-12)
  assert.ok(Math.abs(smallTargetRange.upper - 0.028) < 1e-12)
  assert.deepEqual(getTargetAllowedRange(0), { lower: 0, upper: 0.02 })
})

test('手机目标页同时表达实际配置、计划目标和调整方向', async () => {
  const source = await readFile(new URL('../src/pages/Target.jsx', import.meta.url), 'utf8')

  assert.match(source, /实际配置与计划目标的差距/)
  assert.match(source, /当前配置/)
  assert.match(source, /计划目标/)
  assert.match(source, /aria-label="目标中心位置"/)
  assert.match(source, /合理区间/)
  assert.match(source, /getTargetAllowedRange/)
  assert.match(source, /建议增加 \{formatCurrency/)
  assert.match(source, /建议减少 \{formatCurrency/)
  assert.match(source, /STATUS_PRIORITY/)
})

test('只需按当前总额与目标比例计算建议调整金额', () => {
  assert.equal(getTargetAdjustmentAmount(290000, 1000000, 0.25), -40000)
  assert.equal(getTargetAdjustmentAmount(80000, 1000000, 0.10), 20000)
  assert.equal(getTargetAdjustmentAmount(null, 1000000, 0.10), null)
})
