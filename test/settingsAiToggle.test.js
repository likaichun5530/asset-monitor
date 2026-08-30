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

test('设置页使用一级分类进入对应的二级设置', async () => {
  const source = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')

  for (const section of ['数据与外观', 'AI 与智能分析', '账户与安全', '关于应用']) {
    assert.match(source, new RegExp(section))
  }

  assert.match(source, /const \{ section \} = useParams\(\)/)
  assert.match(source, /!activeSection/)
  assert.match(source, /navigate\(`\/settings\/\$\{nextSection\}`\)/)
  assert.doesNotMatch(source, /navigate\(-1\)/)
  assert.match(source, /navigate\('\/settings', \{ replace: true \}\)/)
  assert.match(source, /aria-label="返回设置一级菜单"/)
  assert.match(source, /<SettingsSubpage/)
  assert.match(source, /settings-panel-forward/)
  assert.match(source, /settings-panel-back/)
  assert.match(source, /<SettingsGroup/)
  assert.match(source, /activeSection === 'appearance'/)
  assert.match(source, /activeSection === 'ai'/)
  assert.match(source, /activeSection === 'security'/)
  assert.match(source, /activeSection === 'about'/)
  assert.match(source, /value: `v\$\{packageJson\.version\}`/)

  const securityIndex = source.indexOf("key: 'security'")
  const appearanceIndex = source.indexOf("key: 'appearance'")
  const aiIndex = source.indexOf("key: 'ai'")
  const aboutIndex = source.indexOf("key: 'about'")
  assert.ok(securityIndex < appearanceIndex)
  assert.ok(appearanceIndex < aiIndex)
  assert.ok(aiIndex < aboutIndex)

  const about = await readFile(new URL('../src/components/AboutApp.jsx', import.meta.url), 'utf8')
  assert.match(about, /有数 App Logo/)
  assert.match(about, /资产配置，心中有数/)
  assert.match(about, /Version \{version\}/)
  assert.match(about, /功能介绍/)
  assert.match(about, /scale-\[1\.22\]/)
  assert.match(about, />Google Sheets</)
  assert.match(about, />Web · PWA</)
  assert.doesNotMatch(about, /Android|本地缓存与离线浏览|Google Sheets 数据源/)
  assert.match(source, /className="-mt-2 sm:mt-0"/)

  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8')
  assert.match(app, /path="settings\/:section"/)

  const layout = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  assert.match(layout, /settingsSectionTitles/)
  assert.match(layout, /<NavLink to="\/settings" replace/)
  assert.match(layout, /\{settingsSectionTitle\}/)
  assert.doesNotMatch(layout, /<span>设置<\/span>/)
  assert.match(layout, /text-gray-900/)
  assert.match(layout, /h-\[22px\] w-\[22px\]/)
})
