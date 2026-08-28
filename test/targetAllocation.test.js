import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getTargetAllocationStatus } from '../src/utils/targetAllocation.js'

test('目标偏差同时支持绝对百分点和相对比例阈值', () => {
  assert.equal(getTargetAllocationStatus(0.12, 0.10).status, 'over')
  assert.equal(getTargetAllocationStatus(0.03, 0.02).status, 'over')
  assert.equal(getTargetAllocationStatus(0.07, 0.10).status, 'under')
  assert.equal(getTargetAllocationStatus(0.01, 0.02).status, 'under')
  assert.equal(getTargetAllocationStatus(0.11, 0.10).status, 'balanced')
})

test('手机目标页同时表达实际配置、计划目标和调整方向', async () => {
  const source = await readFile(new URL('../src/pages/Target.jsx', import.meta.url), 'utf8')

  assert.match(source, /实际配置与计划目标的差距/)
  assert.match(source, /当前配置/)
  assert.match(source, /计划目标/)
  assert.match(source, /aria-label="目标位置"/)
  assert.match(source, /应增加 .* 个百分点/)
  assert.match(source, /应降低 .* 个百分点/)
})
