import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const homeSource = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
const styleSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

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
  assert.match(homeSource, /sort: false/)
  assert.match(homeSource, /requestAnimationFrame\(checkCardCollision\)/)
  assert.match(homeSource, /best\.ratio < 0\.5/)
  assert.match(homeSource, /best\.ratio < 0\.35/)
  assert.match(homeSource, /sortInstance\.current\.sort\(nextOrder, true\)/)
  assert.doesNotMatch(homeSource, /onMove:/)
  assert.doesNotMatch(homeSource, /invertSwap:/)
  assert.match(homeSource, /sortable-drop-target/)
})

test('桌面首页同排卡片使用等高伸缩槽位', () => {
  assert.match(homeSource, /home-card-slot-stat w-1\/3 sm:w-1\/2 lg:w-1\/4/)
  assert.match(homeSource, /home-card-slot-compact w-1\/2/)
  assert.match(homeSource, /home-card-slot-analysis w-full lg:w-1\/2/)
  assert.match(styleSource, /\.home-card-slot\s*{\s*display: flex;/)
  assert.match(styleSource, /\.home-card-slot > div > \.card\s*{[^}]*height: 100%;/s)
  assert.match(styleSource, /\.home-card-slot-analysis > div > \.card\s*{[^}]*height: 350px;[^}]*max-height: 350px;/s)
  assert.doesNotMatch(homeSource, /共展示.*张数据卡片/)
})
