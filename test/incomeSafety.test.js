import test from 'node:test'
import assert from 'node:assert/strict'
import {createIncomeHandler} from '../lib/income-handler.js'
import {incomeEntries,planIncomeWrite} from '../lib/income-service.js'
const rows=()=>[[2026,'工资','奋斗','绩效','奖金','出差','公积金','补贴','合计'],...Array.from({length:12},(_,i)=>[`${i+1}月`,'','','','','','','',`=SUM(B${i+2}:H${i+2})`]),['合计',...Array.from({length:8},(_,i)=>`=SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}13)`)]]
const res=()=>({setHeader(){},writeHead(s){this.status=s},end(b){this.body=JSON.parse(b)}})
test('write transport failures must mark outcome uncertain and never expose credentials',async()=>{
 const r=rows(), cell=incomeEntries(2026,r)[0]
 const h=createIncomeHandler(async()=>{},{read:async()=>({valueRanges:[{range:"'2026'!A1:Z60",values:r}]}),write:async()=>{throw Error('SECRET')}})
 const o=res();await h({method:'PUT',body:{...cell,amount:'1'}},o)
 assert.equal(o.status,503);assert.equal(o.body.writeUncertain,true);assert.ok(!JSON.stringify(o.body).includes('SECRET'))
})
test('formula cells, summaries, stale sheets and malformed schema cannot be written',()=>{
 const r=rows(), cell=incomeEntries(2026,r)[0],body={...cell,amount:'1'}
 r[1][1]='=1+2';assert.throws(()=>planIncomeWrite(body,r),/只读/)
 r[1][1]='';r[2][2]=1;assert.throws(()=>planIncomeWrite(body,r),/已经变化/)
 r[0][2]='工资';assert.throws(()=>incomeEntries(2026,r),/结构/)
})
