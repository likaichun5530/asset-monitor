import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const indexSource = await readFile(new URL('../index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
const settingsSource = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')

test('PWA 首次启动使用浅色页面状态栏回退色', () => {
  assert.equal(manifest.theme_color, '#f9fafb')
  assert.match(indexSource, /meta name="theme-color" content="#f9fafb"/)
})

test('首屏和运行时都按应用主题同步状态栏颜色', () => {
  assert.match(indexSource, /meta\[name="theme-color"\].*isDark \? '#21262f' : '#f9fafb'/s)
  assert.match(settingsSource, /themeMeta\.content = isDark \? '#21262f' : '#f9fafb'/)
})

test('PWA 在 React 启动前提供可绘制的首页启动壳', () => {
  assert.match(indexSource, /<div id="root">\s*<div id="app-boot-shell"/)
  assert.match(indexSource, /#app-boot-shell\{[^}]*min-height:100vh/)
  assert.match(indexSource, /class="boot-card boot-trend"/)
  assert.match(indexSource, /class="boot-stats"/)
  assert.match(indexSource, /html\.dark,html\.dark body,html\.dark #root,html\.dark #app-boot-shell/)
})

test('原生 APK 启动时不显示 PWA 首页骨架', () => {
  assert.match(indexSource, /location\.protocol === 'https:' && location\.hostname === 'localhost'/)
  assert.match(indexSource, /html\.native-app #app-boot-shell\{visibility:hidden\}/)
})
