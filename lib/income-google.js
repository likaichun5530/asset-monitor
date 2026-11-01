import { getAccessToken } from '../api/_google.js'
// Deliberately independent of the asset SPREADSHEET_ID.
export const INCOME_SPREADSHEET_ID = '1zRY0Ov4MLu1pTSXLMFh6_1bj8DBDW-0-rjUGm2jPJm0'
const base = `https://sheets.googleapis.com/v4/spreadsheets/${INCOME_SPREADSHEET_ID}`
async function request(path, options={}) {
 const token=await getAccessToken()
 const response=await fetch(base+path,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000)})
 if(!response.ok) throw Object.assign(new Error(response.status===403?'收入表写入权限不足，请检查服务账号共享权限':'收入表服务暂时不可用'),{statusCode:response.status===403?403:503})
 return response.json()
}
export const incomeGoogle = {
 async read(valueRenderOption='UNFORMATTED_VALUE') {
  const metadata=await request('?fields=sheets(properties(title))')
  const query=new URLSearchParams({valueRenderOption})
  for(const s of metadata.sheets || []) if(/^\d{4}$/.test(s.properties.title)) query.append('ranges',`'${s.properties.title}'!A1:Z60`)
  if(!query.has('ranges')) throw Error('No annual sheets')
  return request('/values:batchGet?'+query)
 },
 async write(plan) {
  return request('/values/'+encodeURIComponent(plan.range)+'?valueInputOption=RAW',{method:'PUT',body:JSON.stringify({values:plan.values})})
 }
}
