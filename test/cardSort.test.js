import test from 'node:test'
import assert from 'node:assert/strict'
import { getCardInsertDirection } from '../src/utils/cardSort.js'

const rect = (left, top, right, bottom) => ({ left, top, right, bottom })

test('同一行的卡片按目标水平中心判断前后位置', () => {
  const dragged = rect(0, 0, 100, 100)
  const target = rect(100, 0, 200, 100)
  assert.equal(getCardInsertDirection(dragged, target, { x: 140, y: 50 }), -1)
  assert.equal(getCardInsertDirection(dragged, target, { x: 160, y: 50 }), 1)
})

test('不同行和不同宽度的卡片按目标垂直中心判断', () => {
  const dragged = rect(0, 0, 100, 80)
  const target = rect(0, 120, 320, 280)
  assert.equal(getCardInsertDirection(dragged, target, { x: 200, y: 180 }), -1)
  assert.equal(getCardInsertDirection(dragged, target, { x: 200, y: 220 }), 1)
})
