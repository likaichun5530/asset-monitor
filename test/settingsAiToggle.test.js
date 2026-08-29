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

test('设置页按数据、AI、安全和应用信息归类', async () => {
  const source = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')

  for (const section of ['数据与外观', 'AI 与智能分析', '账户与安全', '关于应用']) {
    assert.match(source, new RegExp(section))
  }

  assert.match(source, /sm:grid-cols-2/)
  assert.match(source, />v\{packageJson\.version\}<\/span>/)
})
