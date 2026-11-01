import { useState } from 'react'
import AppDialog from './AppDialog.jsx'
import IncomeEditor from './IncomeEditor.jsx'
import { incomeCategoryName } from '../../shared/income-categories.js'
export default function IncomeEntryDialog({ data, initialYear, onClose, onSaved }) {
 const [year,setYear]=useState(initialYear)
 const [month,setMonth]=useState(1)
 const [category,setCategory]=useState('')
 const [editing,setEditing]=useState(null)
 const entries=(data.entries || []).filter(e=>e.year===year&&e.month===month)
 const entry=entries.find(e=>e.category===category)||entries[0]
 const writable=entries.some(e=>e.writable)
 const selectClass='mt-2 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-transparent p-3'
 return <><AppDialog open title="录入收入" onClose={onClose} maxWidth="sm:max-w-lg"><div className="space-y-4">
 <div className="grid grid-cols-2 gap-3"><label className="text-sm">年份<select aria-label="录入年份" className={selectClass} value={year} onChange={e=>{setYear(Number(e.target.value));setCategory('')}}>{[...data.years].reverse().map(y=><option key={y.year} value={y.year}>{y.year}</option>)}</select></label><label className="text-sm">月份<select aria-label="录入月份" className={selectClass} value={month} onChange={e=>setMonth(Number(e.target.value))}>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}月</option>)}</select></label></div>
 {data.source!=='live'?<p role="status" className="text-sm text-amber-600">当前为快照，暂不可录入。请刷新重试。</p>:!writable?<p role="status" className="text-sm text-slate-500">该年度为只读，无法安全更新原表汇总。</p>:<><label className="block text-sm">分类<select aria-label="录入分类" className={selectClass} value={entry?.category || ''} onChange={e=>setCategory(e.target.value)}>{entries.map(e=><option key={e.category} value={e.category}>{incomeCategoryName(e.category,e.column)}{e.writable?'':'（只读）'}</option>)}</select></label><p className="text-sm text-slate-500">当前金额：{entry?.amount==null?'未填':`${entry.amount.toLocaleString('zh-CN',{minimumFractionDigits:2})} 元`}</p><button disabled={!entry?.writable} className="w-full rounded-xl bg-brand-500 py-3 text-white disabled:opacity-50" onClick={()=>setEditing(entry)}>填写金额</button></>}
 </div></AppDialog>{editing&&<IncomeEditor entry={editing} onClose={()=>setEditing(null)} onSaved={onSaved}/>}</>
}
