import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldIgnorePullRefresh } from '../src/utils/pullRefresh.js'

test('弹窗内的触摸手势不会触发页面下拉刷新', () => {
  const modalTarget = {
    closest(selector) {
      return selector.includes('[role="dialog"]') ? { role: 'dialog' } : null
    },
  }
  const pageTarget = { closest() { return null } }

  assert.equal(shouldIgnorePullRefresh(modalTarget), true)
  assert.equal(shouldIgnorePullRefresh(pageTarget), false)
  assert.equal(shouldIgnorePullRefresh(null), false)
})
