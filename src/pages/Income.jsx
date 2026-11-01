import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { getApiJson } from '../utils/api.js'
import IncomeEntryDialog from '../components/IncomeEntryDialog.jsx'
import { incomeView } from '../../shared/income.js'
import { TREND_MARGIN, TREND_X_AXIS, TREND_Y_AXIS, TREND_CARD_CLASS, toWanNum } from '../components/trendChartStyle.js'
const money = cents => (cents / 100).toLocaleString('zh-CN', { style: 'currency', currency: 'CNY' })
export default function Income({ isLoggedIn, refreshKey = 0 }) {
 const [data,setData]=useState(null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(true)
 const [attempt,setAttempt]=useState(0)
 const [year,setYear]=useState(null)
 const [editing,setEditing]=useState(false)
 const [saved,setSaved]=useState(false)
 useEffect(()=>{let active=true;setData(null);setError('');if(!isLoggedIn){setLoading(false);return()=>{active=false}}setLoading(true);getApiJson('income',{forceRefresh:true}).then(result=>{if(active)setData(result)}).catch(e=>{if(active)setError(e.message||'收入读取失败')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[isLoggedIn,refreshKey,attempt])
 if(!isLoggedIn)return <div className="card p-6 text-sm text-slate-500">收入为私人数据，请登录后查看。演示模式不展示真实收入。</div>
 if(loading)return <div role="status" className="card p-6 text-sm text-slate-500">正在加载收入…</div>
 if(error)return <div role="alert" className="card p-6"><p className="text-sm text-red-500">{error}</p><button className="mt-4 text-brand-500" onClick={()=>setAttempt(v=>v+1)}>重新加载</button></div>
 if(!data?.years?.length)return <div className="card p-6 text-slate-500">暂无收入年度数据</div>
 const rows=incomeView(data,true)
 const selected=rows.find(row=>row.year===Number(year))||rows[rows.length-1]
 return <div className="space-y-4">
 <section className="card p-5 space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><h2 className="font-semibold">年度总览</h2><button className="text-sm text-brand-500" onClick={()=>{setSaved(false);setEditing(true)}}>录入收入</button></div><label className="text-sm text-slate-500">年度 <select aria-label="收入年度" value={selected.year} onChange={e=>setYear(Number(e.target.value))} className="bg-transparent rounded-lg border border-slate-300 dark:border-slate-600 p-2">{[...rows].reverse().map(row=><option key={row.year} value={row.year}>{row.year}</option>)}</select></label></div><p className="text-3xl font-bold tabular-nums">{money(selected.amount)}</p><p className="text-sm text-slate-500">{selected.year===new Date().getFullYear()?'今年截至目前收入':`${selected.year} 年收入`}</p></section>
 <section className={TREND_CARD_CLASS}><h2 className="font-semibold mb-2 px-3 sm:px-0">历年趋势</h2><p className="text-xs text-slate-500 mb-2 px-3 sm:px-0">单位：万元</p><div className="income-chart-canvas w-full min-w-0 h-[200px] lg:h-[255px]" aria-label="年度收入柱状图"><ResponsiveContainer width="100%" height="100%"><BarChart margin={TREND_MARGIN} data={rows.map(row=>({year:String(row.year),amount:row.amount/100}))}><CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.12}/><XAxis {...TREND_X_AXIS} dataKey="year" minTickGap={24}/><YAxis {...TREND_Y_AXIS} tickFormatter={toWanNum}/><Tooltip cursor={false} contentStyle={{borderRadius:12,border:'1px solid #e2e8f0',fontSize:12}} formatter={value=>[`${Number(value/10000).toFixed(2)} 万元`,'收入']}/><Bar dataKey="amount" fill="#3b82f6" activeBar={{fill:'#2563eb'}} maxBarSize={18} radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></div><details className="mt-3 text-sm px-3 sm:px-0"><summary className="cursor-pointer text-slate-500">查看年度明细</summary><ul className="mt-3 space-y-2">{rows.map(row=><li key={row.year} className="flex justify-between gap-3"><span>{row.year}</span><span className="tabular-nums">{money(row.amount)}</span></li>)}</ul></details></section>
 <section className="card p-5"><h2 className="font-semibold mb-4">分类明细 · {selected.year}</h2><ul className="space-y-4">{selected.categories.map(item=><li key={item.name}><div className="flex justify-between gap-3 text-sm"><span>{item.name}</span><span className="tabular-nums">{money(item.value)} <span className="text-slate-500">{selected.amount>0?`${(item.value/selected.amount*100).toFixed(1)}%`:'—'}</span></span></div><div className="h-1.5 rounded bg-slate-100 dark:bg-slate-700 mt-2"><div className="h-full rounded bg-brand-500" style={{width:`${Math.max(0,Math.min(100,selected.amount>0?item.value/selected.amount*100:0))}%`}}/></div></li>)}</ul></section>
 {saved&&<p role="status" className="text-sm text-green-600">已保存并重新读取核验。</p>}
 {editing&&<IncomeEntryDialog data={data} initialYear={selected.year} onClose={()=>setEditing(false)} onSaved={result=>{setData(result);setEditing(false);setSaved(true)}}/>}
 {data.source!=='live'&&<p role="status" className="text-xs text-amber-600">实时读取失败，当前显示快照；暂不可录入。</p>}
 </div>
}
