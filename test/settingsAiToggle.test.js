import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('AI 助手默认启用且设置页不再提供开关', async () => {
  const source = await readFile(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8')
  const layout = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /role="switch"|handleAiToggle|aiControlEnabled/)
  assert.match(source, /AI 助手默认在登录后的业务页面显示/)
  assert.match(layout, /const showAiButton = auth\?\.isLoggedIn && !demoMode && AI_BUSINESS_PAGES\.has\(location\.pathname\)/)
  assert.doesNotMatch(layout, /youshu-ai-enabled|isAiEnabled/)
  assert.match(layout, /aria-label="返回持仓"[\s\S]*?\{pageTitle\}/)
  assert.doesNotMatch(layout, /pointer-events-none absolute left-1\/2 max-w-\[30vw\]/)
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
  assert.match(source, /navigate\('\/settings', \{ replace: true, state: \{ pageTransition: 'back' \} \}\)/)
  assert.match(source, /aria-label="返回设置一级菜单"/)
  assert.match(source, /<SettingsSubpage/)
  assert.match(source, /settings-root-menu[\s\S]*divide-y divide-gray-200/)
  assert.doesNotMatch(source, /settings-root-menu[^"\n]*\bcard\b/)
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
  assert.match(source, /settings-subpage-content/)
  assert.doesNotMatch(source, /className="-mt-2 sm:mt-0"/)

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
