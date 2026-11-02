import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const page=readFileSync(new URL('../src/pages/Income.jsx',import.meta.url),'utf8')
test('income has compact entry/year control, synchronized year selection and category drilldown',()=>{
 assert.match(page,/>录入<\/TargetEditButton>/)
 assert.doesNotMatch(page,/income-year-select/)
 assert.match(page, /\{selected.year\}年/)
 assert.doesNotMatch(page,/>录入收入<\/button>/)
 assert.match(page,/奋斗\/双薪/)
 assert.match(page,/chooseYear\(row.year\)/)
 assert.match(page,/incomeMonthDetail\(selected,category\)/)
 assert.match(page,/返回分类/)
 assert.match(page,/aria-pressed/)
 assert.match(page,/incomeSamePeriod\(data,calendar.month\)/)
 assert.match(page,/往年同期/)
 assert.match(page,/暂无已记录月度金额/)
 assert.match(page,/暂无完整月度数据/)
})
