import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const homeSource = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')

test('首页编辑模式使用整张卡片拖动并移除手柄', () => {
  assert.match(homeSource, /draggable: '\[data-id\]'/)
  assert.doesNotMatch(homeSource, /className="drag-handle/)
  assert.match(homeSource, /filter: 'button, a, input, select, textarea, \.no-sort'/)
})

test('首页编辑卡片有抖动效果，拖动时停止抖动', () => {
  assert.match(homeSource, /@keyframes home-card-wiggle/)
  assert.match(homeSource, /\.sortable-chosen > \.home-card-wobble/)
  assert.match(homeSource, /prefers-reduced-motion: reduce/)
})

test('拖动目标使用普通交换和中心点插入判定', () => {
  assert.match(homeSource, /swapThreshold: 0\.7/)
  assert.match(homeSource, /onMove: \(evt, originalEvent\)/)
  assert.doesNotMatch(homeSource, /invertSwap:/)
  assert.match(homeSource, /sortable-drop-target/)
})
