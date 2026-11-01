import { readFile } from 'node:fs/promises'
import { requireAuth } from '../api/_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from '../api/_http.js'
import { normalizeIncome } from '../shared/income.js'
import { snapshotFromSheets } from '../shared/income-source.js'
import { incomeEntries, planIncomeWrite } from './income-service.js'
import { incomeGoogle } from './income-google.js'
function json(res,status,body){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))}
async function live(source) {
 const [evaluated,formulas]=await Promise.all([source.read('UNFORMATTED_VALUE'),source.read('FORMULA')])
 const snapshotAt=new Date().toISOString()
 const entries=formulas.valueRanges.flatMap(sheet=>incomeEntries(sheet.range.match(/\d{4}/)[0],sheet.values))
 return {ok:true,...snapshotFromSheets(evaluated,snapshotAt),entries,source:'live',sourceLabel:'Google Sheets 实时读取',snapshotAt}
}
export function createIncomeHandler(authenticate=requireAuth,source=incomeGoogle) {
 return async function handler(req,res) {
  setPrivateResponseHeaders(res)
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end()}
  if(!['GET','PUT','POST'].includes(req.method))return json(res,405,{error:'不支持的收入操作'})
  try {
   await authenticate(req)
   if(req.method==='GET') {
    try {return json(res,200,await live(source))}catch(error){
     if(req.query?.live==='1')throw error
     const text=process.env.INCOME_SNAPSHOT_JSON || (process.env.INCOME_SNAPSHOT_PATH?await readFile(process.env.INCOME_SNAPSHOT_PATH,'utf8'):'')
     if(!text)throw error
     const raw=JSON.parse(text)
     return json(res,200,{ok:true,...normalizeIncome(raw),source:'snapshot',sourceLabel:'实时读取失败，降级年度快照（不可录入）',snapshotAt:raw.snapshotAt||null,entries:[]})
    }
   }
   const body=await readJsonBody(req)
   if(!Number.isInteger(body.year)||!Number.isInteger(body.month)||body.month<1||body.month>12||typeof body.category!=='string'||typeof body.rowVersion!=='string'||typeof body.amount!=='string'||!/^(0|[1-9]\d{0,8})(\.\d{1,2})?$/.test(body.amount))return json(res,400,{error:'收入参数无效：请选择月份分类，金额最多两位小数'})
   const formulas=await source.read('FORMULA')
   const sheet=formulas.valueRanges.find(s=>Number(s.range.match(/\d{4}/)?.[0])===body.year)
   if(!sheet)return json(res,400,{error:'收入年度不存在'})
   const plan=planIncomeWrite(body,sheet.values)
   try {await source.write(plan)}catch(error){return json(res,error.statusCode===403?403:503,{error:error.statusCode===403?'收入表写入权限不足，请检查服务账号共享权限':'写入未确认，请刷新核对原表，勿盲目重复保存。',writeUncertain:error.statusCode!==403})}
   // A failed readback is NOT success and NEVER falls back to the old snapshot.
   let result
   try {result=await live(source)}catch {return json(res,503,{error:'写入已发送，但读取核验失败。请刷新核对原表，勿盲目重复保存。',writeUncertain:true})}
   const saved=result.entries.find(e=>e.year===body.year&&e.month===body.month&&e.category===body.category)
   if(saved?.amount!==Number(body.amount))return json(res,409,{error:'写入后金额发生变化，请刷新核对',writeUncertain:true})
   return json(res,200,result)
  }catch(error){return json(res,error.statusCode||503,{error:error.statusCode?error.message:'收入读取或写入失败，请刷新重试；未确认保存成功'})}
 }
}
export default createIncomeHandler()
