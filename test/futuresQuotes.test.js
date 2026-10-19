import test from 'node:test'
import assert from 'node:assert/strict'
import { buildIcQuotes, calculateIcQuote, inferIcSettleDate } from '../shared/futuresQuotes.js'
const now = Date.parse('2026-10-20T04:00:00Z')
test('IC 列出所有合约并保留 Market 名称，不限三档和类别', () => {
  const items = [{name:'中证500',symbol:'sh000905',price:7000,group:'指数'},
    ...['IC2611','IC2612','IC2701','IC2703'].map(name=>({name,symbol:name,price:6900,group:'其他'})),
    {name:'IF2611',symbol:'IF2611',price:4000,group:'期货'}]
  const result = buildIcQuotes(items,now)
  assert.deepEqual(result.slice(1).map(x=>x.name),['IC2611','IC2612','IC2701','IC2703'])
  assert.equal(result[1].spread,100)
  assert.equal(result[1].daysToSettle,31)
  assert.equal(result[1].annualRate,100/6900*365/31*100)
})
test('无效价格、升水、到期和上海自然日边界', () => {
  assert.equal(calculateIcQuote({code:'IC2611',price:null},7000,now).annualRate,null)
  assert.equal(calculateIcQuote({code:'IC2611',price:0},7000,now).spread,null)
  assert.ok(calculateIcQuote({code:'IC2611',price:7100},7000,now).annualRate<0)
  assert.equal(calculateIcQuote({code:'IC2610',price:6900},7000,now).annualRate,null)
  assert.equal(calculateIcQuote({code:'IC2611',price:6900},7000,Date.parse('2026-11-19T16:01:00Z')).daysToSettle,0)
  assert.equal(inferIcSettleDate('IC2613'),'')
  assert.equal(inferIcSettleDate('IC2611'),'2026-11-20')
})
