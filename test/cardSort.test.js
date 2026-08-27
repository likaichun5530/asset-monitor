import test from 'node:test'
import assert from 'node:assert/strict'
import { getCardInsertDirection, getCardOverlapRatio } from '../src/utils/cardSort.js'

const rect = (left, top, right, bottom) => ({ left, top, right, bottom })

test('卡片重叠超过较小卡片面积的一半时达到让位条件', () => {
  const target = rect(100, 0, 200, 100)
  assert.equal(getCardOverlapRatio(rect(40, 0, 140, 100), target), 0.4)
  assert.equal(getCardOverlapRatio(rect(49, 0, 149, 100), target), 0.49)
  assert.equal(getCardOverlapRatio(rect(50, 0, 150, 100), target), 0.5)
  assert.equal(getCardOverlapRatio(rect(60, 0, 160, 100), target), 0.6)
})

test('不同尺寸卡片以较小卡片为重叠面积基准', () => {
  assert.equal(getCardOverlapRatio(rect(0, 100, 100, 200), rect(0, 0, 300, 160)), 0.6)
})

test('卡片让位方向由两张卡片的相对中心决定', () => {
  assert.equal(getCardInsertDirection(rect(60, 0, 160, 100), rect(100, 0, 200, 100)), -1)
  assert.equal(getCardInsertDirection(rect(140, 0, 240, 100), rect(100, 0, 200, 100)), 1)
  const target = rect(0, 120, 320, 280)
  assert.equal(getCardInsertDirection(rect(0, 80, 100, 180), target), -1)
  assert.equal(getCardInsertDirection(rect(0, 220, 100, 320), target), 1)
})
