import test from 'node:test'
import assert from 'node:assert/strict'
import { getTargetAllocationStatus } from '../src/utils/targetAllocation.js'

test('目标偏差同时支持绝对百分点和相对比例阈值', () => {
  assert.equal(getTargetAllocationStatus(0.12, 0.10).status, 'over')
  assert.equal(getTargetAllocationStatus(0.03, 0.02).status, 'over')
  assert.equal(getTargetAllocationStatus(0.07, 0.10).status, 'under')
  assert.equal(getTargetAllocationStatus(0.01, 0.02).status, 'under')
  assert.equal(getTargetAllocationStatus(0.11, 0.10).status, 'balanced')
})
