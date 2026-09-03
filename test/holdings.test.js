import test from 'node:test'
import assert from 'node:assert/strict'
import {
  default as holdingsHandler,
  parseInput,
  buildRow,
  rowVersion,
  mapAssetType,
  findVersionedRow,
} from '../api/holdings.js'

const headers = [
  'AssetType', 'Market', 'Account', 'Symbol', 'Name', 'Currency',
  'Quantity', 'Price', 'MarketValue', 'MarketValueCNY',
]

const market = [
  { rowNumber: 2, name: '美元', symbol: 'USD', price: 7.1 },
  { rowNumber: 3, name: '苹果', symbol: 'AAPL', price: 200 },
  { rowNumber: 4, name: '中证期货', symbol: 'IC2612', price: 6000 },
  { rowNumber: 5, name: '港币', symbol: 'HKD', price: 0.91 },
  { rowNumber: 6, name: '日元', symbol: 'JPY', price: 0.048 },
]

test('持仓接口接受浏览器 OPTIONS 预检请求', async () => {
  let status = null
  let ended = false
  await holdingsHandler(
    { method: 'OPTIONS', headers: {} },
    {
      writeHead(code) { status = code },
      end() { ended = true },
    },
  )
  assert.equal(status, 204)
  assert.equal(ended, true)
})

test('股票按类别锁定市场并生成行情、市值和汇率公式', () => {
  const input = parseInput({
    category: '美股', name: 'Apple', symbol: 'aapl', market: 'CN',
    account: 'IBKR', currency: 'USD', quantity: '2',
  }, market)
  const row = buildRow(headers, 8, input)
  assert.equal(input.market, 'US')
  assert.equal(row[0], 'Stock')
  assert.match(row[7], /MATCH\(D8/)
  assert.match(row[8], /G8\*H8/)
  assert.ok(row[9].includes('Market!$C$2'))
})

test('现金只写入原币市值并自动生成人民币市值公式', () => {
  const input = parseInput({
    category: '现金', name: '现金', market: 'CN', account: 'Card',
    currency: 'CNY', marketValueInput: '1000',
  }, market)
  const row = buildRow(headers, 9, input)
  assert.equal(row[3], '-')
  assert.equal(row[6], '')
  assert.equal(row[7], '')
  assert.equal(row[8], 1000)
  assert.match(row[9], /I9/)
})

test('独立现金和证券账户现金允许使用安全公式填写原币市值', () => {
  const independentCash = parseInput({
    category: '现金', valuationMode: 'amount', name: '人民币现金', market: 'CN', account: '银行',
    currency: 'CNY', marketValueInput: '=1000+250',
  }, market)
  assert.equal(independentCash.originalValue, '=1000+250')
  assert.equal(buildRow(headers, 12, independentCash)[8], '=1000+250')

  const accountCash = parseInput({
    category: 'A股', valuationMode: 'amount', name: '人民币现金', market: 'CN', account: '证券账户',
    currency: 'CNY', marketValueInput: '=3000+500',
  }, market)
  assert.equal(accountCash.originalValue, '=3000+500')
  assert.equal(buildRow(headers, 13, accountCash)[8], '=3000+500')

  assert.throws(
    () => parseInput({
      category: '现金', valuationMode: 'amount', name: '人民币现金', market: 'CN', account: '银行',
      currency: 'CNY', marketValueInput: '=IMPORTRANGE("x","A1")',
    }, market),
    /不能调用外部数据/,
  )
})

test('证券账户现金保持 Stock 归属，但按金额估值', () => {
  const input = parseInput({
    category: '美股', valuationMode: 'amount', name: '美元现金',
    account: 'IBKR', currency: 'USD', marketValueInput: '2500',
  }, market)
  const row = buildRow(headers, 12, input)
  assert.equal(row[0], 'Stock')
  assert.equal(row[1], 'US')
  assert.equal(row[3], '-')
  assert.equal(row[7], '')
  assert.equal(row[8], 2500)
  assert.ok(row[9].includes('Market!$C$2'))
})

test('日股账户现金保持 Stock + JP 归属', () => {
  const input = parseInput({
    category: '日股', valuationMode: 'amount', name: '日元现金',
    account: 'IBKR', currency: 'JPY', marketValueInput: '50000',
  }, market)
  const row = buildRow(headers, 14, input)
  assert.equal(row[0], 'Stock')
  assert.equal(row[1], 'JP')
  assert.equal(row[3], '-')
  assert.equal(row[8], 50000)
  assert.ok(row[9].includes('Market!$C$6'))
})

test('直接填金额的债基保持 Bond 归属', () => {
  const input = parseInput({
    category: '债基', valuationMode: 'amount', name: '港币现金', market: 'HK',
    account: '汇丰', currency: 'HKD', marketValueInput: '10000',
  }, market)
  const row = buildRow(headers, 13, input)
  assert.equal(row[0], 'Bond')
  assert.equal(row[1], 'HK')
  assert.equal(row[3], '-')
  assert.equal(row[8], 10000)
})

test('期货保留合法公式并拒绝外部数据公式', () => {
  const base = {
    category: '期货', name: '期货', symbol: 'IC2612', market: 'CN',
    account: '期货', currency: 'CNY', quantity: 1,
  }
  const input = parseInput({ ...base, marketValueInput: '=6000*200*0.14' }, market)
  assert.equal(buildRow(headers, 10, input)[8], '=6000*200*0.14')
  assert.throws(
    () => parseInput({ ...base, marketValueInput: '=IMPORTRANGE("x","A1")' }, market),
    /不能调用外部数据/,
  )
  const withoutMarketPrice = parseInput({ ...base, symbol: 'NEW9999', marketValueInput: '25000' }, market)
  assert.equal(buildRow(headers, 11, withoutMarketPrice)[8], 25000)
})

test('没有 Market 行情时禁止新增普通资产', () => {
  assert.throws(() => parseInput({
    category: '债基', name: '债基', symbol: 'BOND', market: 'CN',
    account: '账户', currency: 'CNY', quantity: 1,
  }, market), /Market 表中找不到/)
})

test('黄金等跟踪型资产不允许绕过行情直接填市值', () => {
  assert.throws(() => parseInput({
    category: '黄金', valuationMode: 'amount', name: '黄金', market: 'GLOBAL',
    account: '银行', currency: 'CNY', marketValueInput: 1000,
  }, market), /不支持直接填写/)
})

test('债券旧名称归一为债基，行版本只随输入或公式变化', () => {
  assert.equal(mapAssetType('债券'), '债基')
  assert.equal(rowVersion(['Bond']), rowVersion(['Bond']))
  assert.notEqual(rowVersion(['Bond']), rowVersion(['Cash']))
})

test('删除和更新都必须通过行号及行版本校验', () => {
  const formulaRow = ['Stock', 'US', 'IBKR', 'AAPL']
  const loaded = {
    evaluated: { rawRows: [['Stock', 'US', 'IBKR', 'AAPL']] },
    formulas: { rawRows: [formulaRow] },
  }
  assert.deepEqual(
    findVersionedRow({ rowNumber: 2, rowVersion: rowVersion(formulaRow) }, loaded),
    { rowNumber: 2, formulaRow },
  )
  assert.throws(
    () => findVersionedRow({ rowNumber: 2, rowVersion: 'stale' }, loaded),
    /数据已经变化/,
  )
  assert.throws(
    () => findVersionedRow({ rowNumber: 3, rowVersion: 'missing' }, loaded),
    /已不存在/,
  )
})
