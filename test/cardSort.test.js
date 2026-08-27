import test from 'node:test'
import assert from 'node:assert/strict'
import { findBestCardOverlap, getCardInsertDirection, getCardOverlapRatio, reorderCardIds } from '../src/utils/cardSort.js'

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

test('卡片达到重叠阈值时优先按移动方向让位', () => {
  const target = rect(100, 0, 200, 100)
  const halfOverTarget = rect(50, 0, 150, 100)
  assert.equal(getCardInsertDirection(halfOverTarget, target, { x: 4, y: 0 }), 1)
  assert.equal(getCardInsertDirection(halfOverTarget, target, { x: -4, y: 0 }), -1)
})

test('碰撞检测选择实际重叠比例最高的卡片', () => {
  const dragged = rect(50, 0, 150, 100)
  const best = findBestCardOverlap(dragged, [
    { id: 'left', rect: rect(0, 0, 100, 100) },
    { id: 'right', rect: rect(80, 0, 180, 100) },
  ])
  assert.equal(best.id, 'right')
  assert.equal(best.ratio, 0.7)
})

test('自定义重排将拖动卡片插入目标前或后', () => {
  const order = ['a', 'b', 'c', 'd']
  assert.deepEqual(reorderCardIds(order, 'a', 'c', -1), ['b', 'a', 'c', 'd'])
  assert.deepEqual(reorderCardIds(order, 'a', 'c', 1), ['b', 'c', 'a', 'd'])
  assert.equal(reorderCardIds(order, 'a', 'missing', 1), order)
})
