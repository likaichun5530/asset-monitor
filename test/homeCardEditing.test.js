import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const homeSource = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
const styleSource = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
const layoutSource = await readFile(new URL('../src/components/Layout.jsx', import.meta.url), 'utf8')
const overviewSource = await readFile(new URL('../src/components/HomeOverviewCards.jsx', import.meta.url), 'utf8')
const heroSource = await readFile(new URL('../src/components/HomeAssetHero.jsx', import.meta.url), 'utf8')

test('首页编辑模式使用整张卡片拖动并移除手柄', () => {
  assert.match(homeSource, /draggable: '\[data-id\]'/)
  assert.doesNotMatch(homeSource, /className="drag-handle/)
  assert.match(homeSource, /filter: 'button, a, input, select, textarea, \.no-sort'/)
  assert.match(homeSource, /forceFallback: coarsePointer/)
})

test('桌面首页使用完整货币圆环和简洁总资产卡片', () => {
  assert.match(overviewSource, /2 \* Math\.PI \* 46/)
  assert.match(overviewSource, /<circle cx="64" cy="64" r="46"/)
  assert.doesNotMatch(overviewSource, /halfRing|M 14 60 A 50 50/)
  assert.doesNotMatch(styleSource, /border-top: 3px solid #2563eb/)
  assert.doesNotMatch(heroSource, /bg-brand-500.*总资产/)
})

test('总资产头部使用纯数字并展示今日盈亏，不再提供手动快照按钮', () => {
  assert.match(heroSource, /formatNumber\(total\)/)
  assert.match(heroSource, /font-num.*font-bold.*tracking-\[-0\.04em\]/)
  assert.match(heroSource, /今日盈亏/)
  assert.match(heroSource, /formatChange\(todayChange\)/)
  assert.doesNotMatch(heroSource, /SnapshotIcon|生成快照|onSnapshot/)
})

test('盈亏小卡片使用统一金融字体与 500 字重', () => {
  assert.match(styleSource, /font-family: "SF Pro Display", "Arial Narrow", -apple-system/)
  assert.match(styleSource, /font-family: "Youshu Numerals"/)
  assert.match(styleSource, /unicode-range: U\+0025/)
  assert.match(styleSource, /\.font-num\.font-bold[\s\S]*font-weight: 700/)
  assert.match(overviewSource, /font-num.*font-medium.*formatChange\(change\)/)
  assert.match(overviewSource, /font-num.*font-medium.*formatPercent\(Math\.abs\(changePct\)\)/s)
  assert.match(overviewSource, /relative flex w-full items-center justify-center/)
  assert.match(homeSource, /近7日盈亏.*近1月盈亏.*今年盈亏/)
  assert.doesNotMatch(homeSource, /近7天涨跌|近1月涨跌|今年涨跌/)
})

test('今日盈亏入口驱动收益日历打开今日明细', () => {
  assert.match(heroSource, /onClick=\{onOpenTodayDetail\}/)
  assert.match(heroSource, /font-num flex flex-col items-end/)
  assert.match(heroSource, /今日盈亏[\s\S]*font-normal/)
  assert.match(heroSource, /aria-label="查看今日盈亏明细"/)
  assert.match(homeSource, /openTodayRequest=\{todayDetailRequest\}/)
  assert.match(homeSource, /setTodayDetailRequest\(\(value\) => value \+ 1\)/)
})

test('桌面导航使用应用 Logo、浅色侧栏和精简工作台名称', () => {
  assert.match(layoutSource, /src="\/icon\.png" alt="有数 App Logo"/)
  assert.match(layoutSource, /border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/)
  for (const label of ['总览', '行情', '持仓', '目标']) assert.match(layoutSource, new RegExp(`label: '${label}'`))
  assert.doesNotMatch(layoutSource, /label: '持仓明细'|label: '配置目标'/)
  assert.doesNotMatch(layoutSource, /auth\.username\?\.slice\(0, 1\)/)
})

test('资产详情桌面概览保持简洁，不显示仪表盘式附加指标', async () => {
  const detailSource = await readFile(new URL('../src/pages/AssetDetail.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(detailSource, /持仓与账户|最大持仓|accountCount|largestHolding/)
  assert.match(detailSource, /共 \{rows\.length\} 项/)
})

test('首页编辑卡片在拖动过程中仍保持抖动', () => {
  assert.match(homeSource, /@keyframes home-card-wiggle/)
  assert.doesNotMatch(homeSource, /animation-play-state: paused/)
  assert.doesNotMatch(homeSource, /\.sortable-drag > \.home-card-wobble/)
  assert.match(homeSource, /prefers-reduced-motion: reduce/)
})

test('拖动目标根据卡片实际重叠面积判定', () => {
  assert.match(homeSource, /sort: !coarsePointer/)
  assert.match(homeSource, /swapThreshold: 0\.5/)
  assert.match(homeSource, /if \(coarsePointer\) collisionFrame = requestAnimationFrame\(checkCardCollision\)/)
  assert.match(homeSource, /requestAnimationFrame\(checkCardCollision\)/)
  assert.match(homeSource, /best\.ratio < 0\.5/)
  assert.match(homeSource, /best\.ratio < 0\.35/)
  assert.match(homeSource, /sortInstance\.current\.sort\(nextOrder, true\)/)
  assert.doesNotMatch(homeSource, /onMove:/)
  assert.doesNotMatch(homeSource, /invertSwap:/)
  assert.match(homeSource, /sortable-drop-target/)
})

test('桌面首页同排卡片使用等高伸缩槽位', () => {
  assert.match(homeSource, /home-card-slot-stat mb-2 w-1\/3 px-1 sm:w-1\/2 lg:w-1\/4/)
  assert.match(homeSource, /home-card-slot-compact mb-2 w-1\/2 px-1/)
  assert.match(homeSource, /home-card-slot-analysis mb-2 w-full px-1 lg:w-1\/2/)
  assert.match(styleSource, /\.home-card-slot\s*{\s*display: flex;/)
  assert.match(styleSource, /\.home-card-slot > div > \.card\s*{[^}]*height: 100%;/s)
  assert.match(styleSource, /\.home-card-slot-analysis > div > \.card\s*{[^}]*height: 350px;[^}]*max-height: 350px;/s)
  assert.doesNotMatch(homeSource, /共展示.*张数据卡片/)
})

test('手机首页顶部和卡片横向间距保持统一', () => {
  assert.match(layoutSource, /mx-auto px-3 pt-2 pb-24/)
  assert.match(homeSource, /home-card-slot-analysis mb-2 w-full px-1 lg:w-1\/2/)
  assert.match(homeSource, /home-card-slot-stat mb-2 w-1\/3 px-1 sm:w-1\/2 lg:w-1\/4/)
  assert.doesNotMatch(homeSource, /space-y-\[4px\]|space-y-3|mb-\[4px\]|mb-3|px-0\.5|px-1\.5/)
})

test('主要业务页面使用 8px 卡片间距', async () => {
  for (const file of ['AssetDetail.jsx', 'Cash.jsx', 'Future.jsx', 'Holdings.jsx', 'Market.jsx', 'Target.jsx']) {
    const source = await readFile(new URL(`../src/pages/${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /space-y-\[4px\]|gap-\[4px\]|space-y-2 sm:space-y-3|space-y-4 sm:space-y-3/, file)
    assert.match(source, /space-y-2|flex flex-col gap-2/, file)
  }
})

test('持仓和目标页隐藏的桌面概览不会叠加手机顶部间距', async () => {
  for (const file of ['Holdings.jsx', 'Target.jsx']) {
    const source = await readFile(new URL(`../src/pages/${file}`, import.meta.url), 'utf8')
    assert.match(source, /return \(\s*<div className="flex flex-col gap-2">/)
  }
})
