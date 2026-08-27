import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const homeSource = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')

test('首页编辑模式使用整张卡片拖动并移除手柄', () => {
  assert.match(homeSource, /draggable: '\[data-id\]'/)
  assert.doesNotMatch(homeSource, /className="drag-handle/)
  assert.match(homeSource, /filter: 'button, a, input, select, textarea, \.no-sort'/)
})

test('首页编辑卡片在拖动过程中仍保持抖动', () => {
  assert.match(homeSource, /@keyframes home-card-wiggle/)
  assert.doesNotMatch(homeSource, /animation-play-state: paused/)
  assert.doesNotMatch(homeSource, /\.sortable-drag > \.home-card-wobble/)
  assert.match(homeSource, /prefers-reduced-motion: reduce/)
})

test('拖动目标根据卡片实际重叠面积判定', () => {
  assert.match(homeSource, /swapThreshold: 1/)
  assert.match(homeSource, /onMove: \(evt, originalEvent\)/)
  assert.match(homeSource, /getCardOverlapRatio\(movingRect, evt\.relatedRect\) < 0\.5/)
  assert.doesNotMatch(homeSource, /invertSwap:/)
  assert.match(homeSource, /sortable-drop-target/)
})
