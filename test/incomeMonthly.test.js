import test from 'node:test'
import assert from 'node:assert/strict'
import * as income from '../shared/income.js'
const { normalizeIncome } = income
import { snapshotFromSheets } from '../shared/income-source.js'
const payload=values=>({valueRanges:[{range:"'2025'!A1:Z60",values}]})
test('real monthly rows survive normalization with blanks absent, source cents and historical aliases retained',()=>{
 const data=snapshotFromSheets(payload([[2025,'工资','双薪','合计'],['1月',1.23,'',1.23],['2月','','',0],['3月',0,2.34,2.34],['合计',1.23,2.34,3.57]]),'synthetic')
 assert.deepEqual(data.years[0].monthly,[{month:1,categories:{工资:123},total:123},{month:3,categories:{工资:0,奋斗:234},total:234}])
 assert.equal(data.monthlyAvailable,true)
})

test('historical same-period requires complete months; current year uses actual recorded cumulative total',()=>{
 assert.equal(typeof income.incomeSamePeriod,'function')
 const months=Array.from({length:12},(_,i)=>({month:i+1,categories:{工资:100,奋斗:i===0?0:20},total:120}))
 const row={year:2025,categories:{工资:99999},total:99999,without_fund:99999,complete:true,monthly:months}
 const data=normalizeIncome({unit:'CNY_cents',years:[row,{...row,year:2026,monthly:months.slice(0,10)},{...row,year:2024,monthly:[]}]})
 const result=income.incomeSamePeriod(data,11,2026)
 assert.equal(result.find(r=>r.year===2025).amount,1320)
 assert.equal(result.find(r=>r.year===2025).categories['工资'],1100)
 assert.equal(result.find(r=>r.year===2025).monthly.length,11)
 assert.equal(result.find(r=>r.year===2026).amount,99999)
 assert.equal(result.find(r=>r.year===2026).monthly.length,10)
 assert.deepEqual(result.find(r=>r.year===2026).missingMonths,[11])
 assert.equal(result.find(r=>r.year===2024).amount,null)
 assert.equal(income.incomeSamePeriod(data,12).find(r=>r.year===2025).amount,1440)
 assert.deepEqual(income.incomeMonthDetail(data.years.find(r=>r.year===2025),'奋斗')[0],{month:1,amount:0})
 assert.deepEqual(income.incomeMonthDetail(data.years.find(r=>r.year===2024),'工资'),[])
 assert.deepEqual(income.incomeCalendar(new Date('2026-10-31T16:01:00Z')),{year:2026,month:11})
})
