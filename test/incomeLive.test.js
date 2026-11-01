import test from 'node:test'
import assert from 'node:assert/strict'
import { createIncomeHandler } from '../lib/income-handler.js'
const rows=()=>[[2026,'工资','奋斗','绩效','奖金','出差','公积金','补贴','合计'],...Array.from({length:12},(_,i)=>[`${i+1}月`,'','','','','','','',`=SUM(B${i+2}:H${i+2})`]),['合计',...Array.from({length:8},(_,i)=>`=SUM(${String.fromCharCode(66+i)}2:${String.fromCharCode(66+i)}13)`)]]
function res(){return {setHeader(){},writeHead(s){this.status=s},end(b){this.body=JSON.parse(b)}}}
test('live income save validates versions, readbacks, refuses formulas and never falls back on mutation errors',async()=>{
 let r=rows(),writes=[];const payload=()=>({valueRanges:[{range:"'2026'!A1:Z60",values:r}]})
 const source={read:async option=>option==='FORMULA'?payload():({valueRanges:payload().valueRanges.map(s=>({...s,values:s.values.map(row=>row.map(v=>String(v).startsWith('=')?0:v))}))}),write:async plan=>{writes.push(plan);r[1][1]=123.45}}
 const h=createIncomeHandler(async()=>{},source)
 let out=res();await h({method:'GET'},out);assert.equal(out.body.source,'live');const cell=out.body.entries[0]
 out=res();await h({method:'PUT',body:{...cell,amount:'123.45'}},out);assert.equal(out.status,200);assert.equal(out.body.entries[0].amount,123.45);assert.equal(writes.length,1)
 out=res();await h({method:'PUT',body:{...cell,amount:'99'}},out);assert.equal(out.status,409);assert.equal(writes.length,1)
 for(const amount of ['=1+2','-1','NaN','1.234','1e3','']){out=res();await h({method:'PUT',body:{...out.body,...cell,rowVersion:(await get()).entries[0].rowVersion,amount}},out);assert.equal(out.status,400)}
 async function get(){const o=res();await h({method:'GET'},o);return o.body}
 const broken=createIncomeHandler(async()=>{},{read:async()=>{throw Error('private')},write:async()=>{throw Error('private')}})
 out=res();await broken({method:'PUT',body:{year:2026,month:1,category:'工资',amount:'1',rowVersion:'a'}},out);assert.equal(out.status,503);assert.ok(!JSON.stringify(out.body).includes('private'))
})
