import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('启动后的首页和页面导航使用 300ms 双向滑动', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const layout = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.match(app, /startup-content startup-content-\$\{phase\}/)
  assert.match(styles, /startup-content-reveal[\s\S]*startup-page-enter 300ms ease-out/)
  assert.match(styles, /@keyframes page-transition-forward[\s\S]*translateX\(100%\)/)
  assert.match(styles, /@keyframes page-transition-back[\s\S]*translateX\(-100%\)/)
  assert.match(styles, /page-transition-forward[\s\S]*300ms ease-out/)
  assert.match(styles, /page-transition-back[\s\S]*300ms ease-out/)
  assert.match(layout, /location\.state\?\.pageTransition === 'back'/)
  assert.match(layout, /key=\{location\.key\}[\s\S]*page-transition-\$\{pageTransitionDirection\}/)
})

test('设置首页使用平面列表和淡灰分割线', async () => {
  const settings = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')
  const styles = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')

  assert.match(settings, /settings-root-menu[\s\S]*divide-y divide-gray-200/)
  assert.doesNotMatch(settings, /settings-root-menu[^"\n]*\bcard\b/)
  assert.match(styles, /\.settings-menu-row\s*\{[\s\S]*border-radius: 0;[\s\S]*background: transparent;[\s\S]*box-shadow: none;/)
})
