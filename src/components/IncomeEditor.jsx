import { useState } from 'react'
import AppDialog from './AppDialog.jsx'
import { requestApiJson } from '../utils/api.js'
export default function IncomeEditor({ entry, onClose, onSaved }) {
 const [amount,setAmount]=useState(entry.amount==null?'':String(entry.amount))
 const [saving,setSaving]=useState(false)
 const [error,setError]=useState('')
 const [uncertain,setUncertain]=useState(false)
 async function save(e) {
  e.preventDefault()
  if(saving||uncertain)return
  setSaving(true);setError('')
  try {
   const result=await requestApiJson('income',{method:'PUT',timeoutMs:60000,headers:{'Content-Type':'application/json'},body:JSON.stringify({year:entry.year,month:entry.month,category:entry.category,rowVersion:entry.rowVersion,amount})})
   onSaved(result)
  } catch(e) {setError(e.message || '保存未确认，请刷新核对');setUncertain(Boolean(e.data?.writeUncertain)||!e.status||e.status===409)}
  finally {setSaving(false)}
 }
 return <AppDialog open title={entry.amount==null?'录入收入':'编辑收入'} onClose={onClose} closeDisabled={saving} description={`${entry.year}年 · ${entry.month}月 · ${entry.category}（人民币元）`} maxWidth="sm:max-w-lg">
  <form onSubmit={save} className="space-y-4">
   <p className="text-sm text-slate-500">保存的是该月该分类的合计金额，不是新增一笔累加；不会修改汇总公式。</p>
   {entry.amount!=null && <p className="text-sm">当前金额：{entry.amount.toLocaleString('zh-CN',{minimumFractionDigits:2})} 元</p>}
   <label className="block text-sm">金额（元）<input autoFocus required inputMode="decimal" aria-label="收入金额" value={amount} onChange={e=>setAmount(e.target.value)} pattern="(0|[1-9][0-9]{0,8})(\.[0-9]{1,2})?" className="mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-3" /></label>
   <p className="text-xs text-slate-500">最多两位小数，非负；0 表示明确记录零收入，不会删除月份。</p>
   {error && <p role="alert" className="text-sm text-red-500">{error}{uncertain?' 请关闭后刷新页面核对，再重新编辑。':''}</p>}
   <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600">取消</button><button type="submit" disabled={saving||uncertain} className="px-4 py-2 rounded-xl bg-brand-500 text-white disabled:opacity-50">{saving?'正在保存并核验…':'保存'}</button></div>
  </form>
 </AppDialog>
}
