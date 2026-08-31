import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

test('PWA 让软键盘缩小布局视口，避免 fixed 弹窗延伸到键盘区域', () => {
  const indexHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  const assistant = fs.readFileSync(new URL('../src/components/AiAssistant.jsx', import.meta.url), 'utf8')

  assert.match(indexHtml, /interactive-widget=resizes-content/)
  assert.doesNotMatch(indexHtml, /interactive-widget=overlays-content/)
  assert.match(assistant, /display-mode: standalone/)
  assert.match(assistant, /navigator\.virtualKeyboard/)
  assert.match(assistant, /virtualKeyboard\.overlaysContent = true/)
  assert.match(assistant, /virtualKeyboard\.addEventListener\('geometrychange'/)
  assert.match(assistant, /bottom: `\$\{keyboardInset\}px`/)
  assert.doesNotMatch(assistant, /guardBottomGesture/)
  assert.doesNotMatch(assistant, /flex h-\[100dvh\] min-h-0 flex-col/)
})
