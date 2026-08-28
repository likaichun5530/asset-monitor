import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { findHistoryRowNumber, normalizeHistoryNote } from '../api/history.js'

test('History 备注按日期定位到对应工作表行', () => {
  const rows = [
    ['2026/8/27', 1000],
    ['2026/8/28', 1100],
  ]

  assert.equal(findHistoryRowNumber(rows, '2026-08-28'), 3)
  assert.equal(findHistoryRowNumber(rows, '2026-08-29'), -1)
})

test('History 备注允许清空但拒绝公式和超长内容', () => {
  assert.equal(normalizeHistoryNote('  工资到账  '), '工资到账')
  assert.equal(normalizeHistoryNote(''), '')
  assert.throws(() => normalizeHistoryNote('=IMPORTDATA("url")'), /不能以等号开头/)
  assert.throws(() => normalizeHistoryNote('a'.repeat(501)), /不能超过 500 个字符/)
})

test('手机收益详情使用可视窗口滚动并直接显示备注输入区', async () => {
  const source = await readFile(new URL('../src/components/CalendarHeatmap.jsx', import.meta.url), 'utf8')
  assert.match(source, /max-h-\[calc\(100dvh-8px\)\]/)
  assert.match(source, />备注<\/span>/)
  assert.match(source, /placeholder="记录当天的重要事项"/)
  assert.match(source, /role="dialog" aria-modal="true" aria-label="每日资产变化"/)
  assert.ok(source.indexOf('placeholder="记录当天的重要事项"') < source.indexOf('selectedDetail.categories.length'))
})
