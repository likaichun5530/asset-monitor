import test from 'node:test'
import assert from 'node:assert/strict'
import { incomeEntries, planIncomeWrite } from '../lib/income-service.js'
const rows = () => [[2026,'工资','奋斗','绩效','奖金','出差','公积金','补贴','合计'],...Array.from({length:12},(_,i)=>[`${i+1}月`,'','','','','','','',`=SUM(B${i+2}:H${i+2})`]),['合计',...Array.from({length:8},(_,i)=>`=SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}13)`)]]
test('only formula-backed monthly input cells writable; RAW numeric absolute update',()=>{
 const r=rows(); const e=incomeEntries('2026',r);assert.equal(e.length,84)
 const cell=e[0];const plan=planIncomeWrite({year:2026,month:1,category:'工资',amount:'123.45',rowVersion:cell.rowVersion},r)
 assert.equal(plan.range,"'2026'!B2");assert.deepEqual(plan.values,[[123.45]])
 assert.equal(incomeEntries('2026',rows().map(row=>row.map(v=>String(v).startsWith('=')?0:v))).filter(e=>e.writable).length,0)
})
