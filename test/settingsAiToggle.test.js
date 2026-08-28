import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('AI 机器人开关正确定位滑块并表达实际可用状态', async () => {
  const source = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')
  assert.match(source, /const aiControlEnabled = aiEnabled && isLoggedIn && !demoMode/)
  assert.match(source, /role="switch"/)
  assert.match(source, /aria-checked=\{aiControlEnabled\}/)
  assert.match(source, /left-0\.5 top-0\.5/)
  assert.match(source, /shrink-0/)
})
