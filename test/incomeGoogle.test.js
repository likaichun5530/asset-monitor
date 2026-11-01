import test from 'node:test'
import assert from 'node:assert/strict'
import {generateKeyPairSync} from 'node:crypto'
test('收入 Google adapter 复用服务账号 JWT、固定收入目标与 RAW 单格写；mock only',async()=>{
 const oldFetch=globalThis.fetch
 const names=['GOOGLE_SERVICE_ACCOUNT_EMAIL','GOOGLE_PRIVATE_KEY','SPREADSHEET_ID'];const old=names.map(k=>process.env[k])
 process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL='synthetic@example.invalid'
 process.env.GOOGLE_PRIVATE_KEY=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'})
 process.env.SPREADSHEET_ID='never-write-assets'
 const calls=[]
 globalThis.fetch=async(url,options={})=>{
  calls.push({url:String(url),options})
  if(String(url).includes('oauth2.googleapis.com'))return {ok:true,json:async()=>({access_token:'synthetic-only',expires_in:3600})}
  if(String(url).includes('?fields='))return {ok:true,json:async()=>({sheets:[{properties:{title:'2026'}},{properties:{title:'汇总'}}]})}
  return {ok:true,json:async()=>({valueRanges:[],updatedCells:1})}
 }
 try {
  const {incomeGoogle,INCOME_SPREADSHEET_ID}=await import('../lib/income-google.js')
  await incomeGoogle.read('FORMULA');await incomeGoogle.write({range:"'2026'!B2",values:[[12.34]]})
  const tokenCall=calls[0];const jwt=new URLSearchParams(tokenCall.options.body).get('assertion');const claims=JSON.parse(Buffer.from(jwt.split('.')[1],'base64url'))
  assert.equal(claims.scope,'https://www.googleapis.com/auth/spreadsheets')
  assert.equal(claims.iss,'synthetic@example.invalid')
  for(const call of calls.slice(1)){assert.ok(call.url.includes(INCOME_SPREADSHEET_ID));assert.ok(!call.url.includes('never-write-assets'))}
  assert.match(calls[2].url,/valueRenderOption=FORMULA/)
  assert.ok(decodeURIComponent(calls[2].url).includes("'2026'!A1:Z60"))
  assert.match(calls[3].url,/valueInputOption=RAW/);assert.equal(calls[3].options.method,'PUT')
  assert.deepEqual(JSON.parse(calls[3].options.body),{values:[[12.34]]})
 } finally {globalThis.fetch=oldFetch;names.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i])}
})
