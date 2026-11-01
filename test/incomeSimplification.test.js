import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { normalizeIncome } from '../shared/income.js'
import { snapshotFromSheets } from '../shared/income-source.js'
import { incomeEntries, planIncomeWrite } from '../lib/income-service.js'
const rows = (year=2030)=>[[year,'工资','奋斗','绩效','奖金','出差','公积金','补贴','合计'],...Array.from({length:12},(_,i)=>[`${i+1}月`,'','','','','','','',`=SUM(B${i+2}:H${i+2})`]),['合计',...Array.from({length:7},(_,i)=>`=SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}13)`),'=SUM(I2:I13)']]
test('current categories normalize legacy snapshots without changing source totals or fund exclusion',()=>{
 const data=normalizeIncome({unit:'CNY_cents',years:[{year:2025,total:1000,without_fund:800,complete:true,categories:{'双薪/奋斗':100,'年奖/绩效奖':400,'提取公积金':200,'车补/补贴':300}}]})
 assert.deepEqual(data.years[0].categories,{奋斗:100,绩效:400,公积金:200,补贴:300})
 assert.equal(data.years[0].total,1000)
})
test('unknown source labels retain their amounts; invalid text is not guessed as bonus',()=>{
 const result=snapshotFromSheets({valueRanges:[{range:"'2023'!A1:I14",values:[[2023,'工资','���金','公积金','合计'],['1月',1,2,3,6],['合计',1,2,3,6]]}]},'synthetic')
 assert.deepEqual(result.years[0].categories,{工资:100,'原表分类（C列）':200,公积金:300})
 assert.equal(result.years[0].reconciliation,0)
 const sheet=rows();sheet[0][4]='���金'
 const entries=incomeEntries(2030,sheet)
 assert.equal(entries.find(e=>e.category==='���金').writable,false)
 assert.throws(()=>planIncomeWrite({year:2030,month:1,category:'���金',amount:'1',rowVersion:entries[0].rowVersion},sheet))
})
test('safe future year is discovered from formulas, not a hardcoded current-year allowlist',()=>{
 assert.equal(incomeEntries(2030,rows()).filter(e=>e.writable).length,84)
 const historical=rows(2025);historical[13][1]=12
 assert.equal(incomeEntries(2025,historical).find(e=>e.category==='工资').writable,false)
})
test('entry dialog discovers years and writability while keeping entry lists out of the page',()=>{
 const dialog=readFileSync(new URL('../src/components/IncomeEntryDialog.jsx',import.meta.url),'utf8')
 assert.match(dialog,/aria-label="录入年份"/)
 assert.match(dialog,/data.years/)
 assert.match(dialog,/entries.some\(e=>e.writable\)/)
 assert.match(dialog,/该年度为只读/)
 assert.doesNotMatch(dialog,/year===2026/)
})
