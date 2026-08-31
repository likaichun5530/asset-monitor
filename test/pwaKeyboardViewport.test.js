import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('PWA 让软键盘缩小布局视口，避免 fixed 弹窗延伸到键盘区域', () => {
  const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')

  assert.match(indexHtml, /interactive-widget=resizes-content/)
  assert.doesNotMatch(indexHtml, /interactive-widget=overlays-content/)
})
