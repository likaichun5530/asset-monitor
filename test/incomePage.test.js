import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = path => readFileSync(new URL('../'+path, import.meta.url),'utf8')
test('income navigation sits between holdings and target and page is read only', () => {
 const layout=read('src/components/Layout.jsx')
 assert.ok(layout.indexOf("to: '/holdings'") < layout.indexOf("to: '/income'"))
 assert.ok(layout.indexOf("to: '/income'") < layout.indexOf("to: '/target'"))
 assert.match(read('src/App.jsx'),/path="income"/)
 const page=read('src/pages/Income.jsx')
 for (const label of ['年度总览','历年趋势','分类明细','今年截至目前收入','当前显示快照','录入收入']) assert.ok(page.includes(label))
 assert.doesNotMatch(page,/localStorage\.setItem/)
 assert.match(page,/IncomeEntryDialog/)
 assert.doesNotMatch(page,/完整年度同比|已记录累计|setIncludeFund|未完整年度|<footer/)
})
