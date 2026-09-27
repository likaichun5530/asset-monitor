import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getNativeBackTarget } from '../src/utils/nativeBack.js'

test('Android 系统返回键按页面层级返回', () => {
  for (const detail of ['/us', '/cn', '/hk', '/jp', '/gold', '/bond', '/crypto', '/future', '/cash']) {
    assert.equal(getNativeBackTarget(detail), '/holdings')
  }
  assert.equal(getNativeBackTarget('/settings/appearance'), '/settings')
  assert.equal(getNativeBackTarget('/settings/security'), '/settings')
  for (const primary of ['/market', '/holdings', '/target', '/settings']) {
    assert.equal(getNativeBackTarget(primary), '/')
  }
  assert.equal(getNativeBackTarget('/'), null)
  assert.equal(getNativeBackTarget('/login'), null)
})

test('原生返回优先关闭弹窗和页面内编辑状态，根页面才退出应用', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  const home = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
  const calendar = await readFile(new URL('../src/components/CalendarHeatmap.jsx', import.meta.url), 'utf8')
  assert.match(app, /CapacitorApp\.addListener\('backButton'/)
  assert.ok(app.indexOf("document.body.dataset.modalOpen === 'true'") < app.indexOf('getNativeBackTarget(location.pathname)'))
  assert.match(app, /window\.history\.back\(\)/)
  assert.match(app, /requestInPageBack\(\)/)
  assert.match(app, /CapacitorApp\.exitApp\(\)/)
  assert.match(home, /NATIVE_BACK_EVENT[\s\S]*exitEditMode\(\)/)
  assert.match(calendar, /NATIVE_BACK_EVENT[\s\S]*setShowMonthPicker\(false\)/)
})

test('所有手机标题栏与页面使用相同背景色', async () => {
  const layout = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  assert.match(layout, /mobile-topbar[\s\S]*border-transparent bg-gray-50[\s\S]*dark:bg-gray-900/)
  assert.doesNotMatch(layout, /mobile-topbar[\s\S]{0,180}bg-white\/90/)
})
