import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('income hero is compact, seamless and has no redundant amount subtitle',()=>{
 const page=read('src/pages/Income.jsx')
 const hero=page.slice(page.indexOf('<section className="income-hero'),page.indexOf('<section className={TREND_CARD_CLASS}'))
 assert.match(hero,/income-hero px-4 py-2 space-y-2/)
 assert.doesNotMatch(hero,/className="card|text-sm text-slate-500|今年截至目前收入/)
 assert.doesNotMatch(page,/style: 'currency'|currency: 'CNY'/)
 assert.match(page,/minimumFractionDigits: 2, maximumFractionDigits: 2/)
})
test('income month ranges use fullwidth wave without altering arithmetic',()=>{
 const page=read('src/pages/Income.jsx')
 assert.doesNotMatch(page,/1[—－-]/)
 assert.match(page,/1～/)
})
test('income trend unit caption stays minimal in same-period mode',()=>{
 assert.match(read('src/pages/Income.jsx'),/>单位：万元<\/p>/)
})
test('income card gaps match actual home page spacing',()=>{
 const home=read('src/pages/Home.jsx')
 assert.match(home,/home-page space-y-2/)
 assert.match(read('src/pages/Income.jsx'),/return <div className="space-y-2">/)
})
test('selected year heads overview with entry right and dialog year selection preserved',()=>{
 const page=read('src/pages/Income.jsx')
 assert.match(page,/<h2 className="font-semibold">\{selected.year\}年\{samePeriod\?'同期':''\}<\/h2>\s*<button/)
 assert.doesNotMatch(page,/aria-label="收入年度"|income-year-select|年度总览/)
 assert.match(page,/onClick=\{selectBar\}/)
 assert.match(page,/initialYear=\{selected.year\}/)
 assert.match(read('src/components/IncomeEntryDialog.jsx'),/<select/)
})
