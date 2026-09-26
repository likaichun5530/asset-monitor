import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const settingsSource = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')

test('PWA 首次启动使用白色状态栏回退色', () => {
  assert.equal(manifest.theme_color, '#ffffff')
  assert.match(indexSource, /meta name="theme-color" content="#ffffff"/)
})

test('首屏和运行时都按应用主题同步状态栏颜色', () => {
  assert.match(indexSource, /meta\[name="theme-color"\].*isDark \? '#1f2937' : '#ffffff'/s)
  assert.match(settingsSource, /themeMeta\.content = isDark \? '#1f2937' : '#ffffff'/)
})
