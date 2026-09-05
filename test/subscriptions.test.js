import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { getShanghaiDate, normalizeSubscription } from '../api/_subscription-data.js'

test('申购日历按上海时区判断当天', () => {
  assert.equal(getShanghaiDate(new Date('2026-09-04T16:30:00.000Z')), '2026-09-05')
})

test('新股申购数据只保留首页提醒需要的公开字段', () => {
  assert.deepEqual(normalizeSubscription({
    SECURITY_NAME_ABBR: '信诺维',
    SECURITY_CODE: '688837',
    APPLY_CODE: '787837',
    ISSUE_PRICE: 27.6,
    ONLINE_APPLY_UPPER: 10000,
    MARKET_TYPE_NEW: '科创板',
  }, 'stock'), {
    type: 'stock',
    name: '信诺维',
    code: '688837',
    applyCode: '787837',
    price: 27.6,
    maxApply: 10000,
    market: '科创板',
  })
})

test('新债使用网上申购代码并保持统一结构', () => {
  assert.deepEqual(normalizeSubscription({
    SECURITY_NAME_ABBR: '四方转债',
    SECURITY_CODE: '113710',
    CORRECODE: '754339',
    ISSUE_PRICE: 100,
    TRADE_MARKET: 'CNSESH',
  }, 'bond'), {
    type: 'bond',
    name: '四方转债',
    code: '113710',
    applyCode: '754339',
    price: 100,
    maxApply: null,
    market: 'CNSESH',
  })
})

test('首页提醒位于总资产卡片之后且当天无数据时组件不占位', async () => {
  const home = await readFile(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')
  const ticker = await readFile(new URL('../src/components/SubscriptionTicker.jsx', import.meta.url), 'utf8')
  assert.ok(home.indexOf('<SubscriptionTicker') > home.indexOf('<HomeAssetHero'))
  assert.match(ticker, /if \(!messages\.length\) return null/)
  assert.match(ticker, /今日打新/)
  assert.match(ticker, /prefers-reduced-motion: reduce/)
})
