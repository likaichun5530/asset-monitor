import { useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { getApiJson, getCachedIncome, cacheIncome } from '../utils/api.js'
import IncomeEntryDialog from '../components/IncomeEntryDialog.jsx'
import { incomeView, incomeSamePeriod, incomeMonthDetail, incomeCalendar } from '../../shared/income.js'
import { TREND_MARGIN, TREND_X_AXIS, TREND_Y_AXIS, TREND_CARD_CLASS, toWanNum } from '../components/trendChartStyle.js'
const money = cents => (cents / 100).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const categoryLabel = name => name === '奋斗' ? '奋斗/双薪' : name
export default function Income({ isLoggedIn, refreshKey = 0 }) {
 const [data,setData]=useState(()=>isLoggedIn?getCachedIncome():null)
 const [error,setError]=useState('')
 const [loading,setLoading]=useState(()=>isLoggedIn&&!getCachedIncome())
 const [attempt,setAttempt]=useState(0)
 const [year,setYear]=useState(null)
 const [editing,setEditing]=useState(false)
 const [saved,setSaved]=useState(false)
 const [category,setCategory]=useState(null)
 const [samePeriod,setSamePeriod]=useState(false)
 useEffect(()=>{
  let active=true
  if(!isLoggedIn){setData(null);setLoading(false);setEditing(false);return()=>{active=false}}
  if(editing)return()=>{active=false}
  const cached=getCachedIncome()
  setData(cached);setError('');setLoading(!cached)
  getApiJson('income',{forceRefresh:true}).then(result=>{if(active)setData(result)}).catch(e=>{if(active)setError(e.message||'收入读取失败')}).finally(()=>{if(active)setLoading(false)})
  return()=>{active=false}
 },[isLoggedIn,refreshKey,attempt,editing])
 if(!isLoggedIn)return <div className="card p-6 text-sm text-slate-500">收入为私人数据，请登录后查看。演示模式不展示真实收入。</div>
 if(loading)return <div role="status" className="card p-6 text-sm text-slate-500">正在加载收入…</div>
 if(error&&!data)return <div role="alert" className="card p-6"><p className="text-sm text-red-500">{error}</p><button className="mt-4 text-brand-500" onClick={()=>setAttempt(v=>v+1)}>重新加载</button></div>
 if(!data?.years?.length)return <div className="card p-6 text-slate-500">暂无收入年度数据</div>
 const calendar=incomeCalendar()
 const rows=incomeView(data,true)
 const periodRows=incomeSamePeriod(data,calendar.month)
 const detailRows=samePeriod?incomeView({years:periodRows},true):rows
 const selected=detailRows.find(row=>row.year===Number(year))||detailRows[detailRows.length-1]
 const chartRows=(samePeriod?periodRows:rows).map(row=>({...row,year:String(row.year),amount:row.amount===null?null:row.amount/100}))
 const unavailable=samePeriod?periodRows.filter(row=>row.amount===null):[]
 const monthDetails=category?incomeMonthDetail(selected,category):[]
 const chooseYear=value=>{setYear(Number(value));setCategory(null)}
 const selectBar=row=>{if(row?.year)chooseYear(row.year)}
 return <div className="space-y-2">
 {error&&<p role="alert" className="text-xs text-amber-600">收入更新失败，保留上次数据。<button className="ml-2 text-brand-500" onClick={()=>setAttempt(v=>v+1)}>重试</button></p>}
 <section className="income-hero px-4 py-2 space-y-2">
  <div className="flex items-center justify-between gap-3">
   <h2 className="font-semibold">{selected.year}年{samePeriod?'同期':''}</h2>
   <button className="text-sm text-brand-500" onClick={()=>{setSaved(false);setEditing(true)}}>录入</button>
  </div>
  <p className="text-3xl font-bold tabular-nums" data-testid="income-year-total">{selected.amount===null?'暂无完整月度数据':money(selected.amount)}</p>
 </section>
 <section className={TREND_CARD_CLASS}>
  <div className="flex items-center justify-between gap-3 mb-2 px-3 sm:px-0"><h2 className="font-semibold">历年趋势</h2><button type="button" aria-pressed={samePeriod} onClick={()=>setSamePeriod(value=>!value)} className={`rounded-lg px-2.5 py-1.5 text-xs transition-colors ${samePeriod?'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400':'bg-slate-100 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400'}`}>往年同期</button></div>
  <p className="text-xs text-slate-500 mb-2 px-3 sm:px-0">单位：万元</p>
  <div className="income-chart-canvas w-full min-w-0 h-[200px] lg:h-[255px]" aria-label={samePeriod?`各年1至${calendar.month}月收入柱状图`:'年度收入柱状图'}>
   <ResponsiveContainer width="100%" height="100%"><BarChart margin={TREND_MARGIN} data={chartRows} onClick={state=>selectBar(state?.activePayload?.[0]?.payload)}>
    <CartesianGrid vertical={false} stroke="#94a3b8" strokeOpacity={0.12}/><XAxis {...TREND_X_AXIS} dataKey="year" minTickGap={24}/><YAxis {...TREND_Y_AXIS} tickFormatter={toWanNum}/>
    <Tooltip cursor={false} contentStyle={{borderRadius:12,border:'1px solid #e2e8f0',fontSize:12}} formatter={(value,name,item)=>[`${Number(value/10000).toFixed(2)} 万元`,samePeriod?(Number(item?.payload?.year)===calendar.year?'今年截至目前收入':`1～${calendar.month}月收入`):'收入']}/>
    <Bar dataKey="amount" fill="#3b82f6" activeBar={{fill:'#2563eb'}} maxBarSize={18} radius={[4,4,0,0]} onClick={selectBar}>{chartRows.map(row=><Cell key={row.year} fill={Number(row.year)===selected.year?'#2563eb':'#3b82f6'} fillOpacity={Number(row.year)===selected.year?1:0.72} cursor="pointer" role="button" tabIndex={row.amount===null?-1:0} aria-label={`${row.year}年${row.amount===null?'暂无完整月度数据':samePeriod?`1至${calendar.month}月收入`:'收入'}`} aria-pressed={Number(row.year)===selected.year} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();chooseYear(row.year)}}}/>)}</Bar>
   </BarChart></ResponsiveContainer>
  </div>
  {unavailable.length>0&&<p role="status" className="text-xs text-slate-500 mt-2 px-3 sm:px-0">{unavailable.map(row=>row.year).join('、')}：暂无完整月度数据（1～{calendar.month}月），未纳入同期。</p>}
  <details className="mt-3 text-sm px-3 sm:px-0"><summary className="cursor-pointer text-slate-500">查看年度明细</summary><ul className="mt-3 space-y-1">{chartRows.map(row=><li key={row.year}><button type="button" className={`flex w-full justify-between gap-3 rounded-lg px-2 py-2 ${Number(row.year)===selected.year?'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400':''}`} aria-pressed={Number(row.year)===selected.year} onClick={()=>chooseYear(row.year)}><span>{row.year}</span><span className="tabular-nums">{row.amount===null?'暂无完整月度数据':money(Math.round(row.amount*100))}</span></button></li>)}</ul></details>
 </section>
 <section className="card p-5" aria-label="收入分类详情">
  {selected.amount===null?<p className="text-sm text-slate-500">暂无完整同期月度数据，不推算分类金额。</p>:category?<>
   <div className="flex items-center justify-between gap-3 mb-4"><h2 className="font-semibold">{categoryLabel(category)} · {selected.year}</h2><button type="button" className="text-sm text-brand-500" onClick={()=>setCategory(null)}>返回分类</button></div>
   <p className="text-xs text-slate-500 mb-3">各月领取金额</p>
   {monthDetails.length?<ul className="divide-y divide-slate-100 dark:divide-slate-700">{monthDetails.map(item=><li key={item.month} className="flex justify-between gap-3 py-3 text-sm"><span>{item.month}月</span><span className="tabular-nums">{money(item.amount)}</span></li>)}</ul>:<p className="text-sm text-slate-500 py-4">暂无已记录月度金额</p>}
  </>:<>
   <h2 className="font-semibold mb-4">分类明细 · {selected.year}</h2><ul className="space-y-4">{selected.categories.map(item=><li key={item.name}><button type="button" className="w-full text-left rounded-lg focus-visible:outline-brand-500" aria-label={`查看${categoryLabel(item.name)}月度金额`} onClick={()=>setCategory(item.name)}><div className="flex justify-between gap-3 text-sm"><span>{categoryLabel(item.name)} <span aria-hidden="true" className="text-slate-400">›</span></span><span className="tabular-nums">{money(item.value)} <span className="text-slate-500">{selected.amount>0?`${(item.value/selected.amount*100).toFixed(1)}%`:'—'}</span></span></div><div className="h-1.5 rounded bg-slate-100 dark:bg-slate-700 mt-2"><div className="h-full rounded bg-brand-500" style={{width:`${Math.max(0,Math.min(100,selected.amount>0?item.value/selected.amount*100:0))}%`}}/></div></button></li>)}</ul>
  </>}
 </section>
 {saved&&<p role="status" className="text-sm text-green-600">已保存并重新读取核验。</p>}
 {editing&&<IncomeEntryDialog data={data} initialYear={selected.year} onClose={()=>setEditing(false)} onSaved={result=>{cacheIncome(result);setData(result);setEditing(false);setSaved(true)}}/>}
 {data.source!=='live'&&<p role="status" className="text-xs text-amber-600">实时读取失败，当前显示快照；暂不可录入。</p>}
 </div>
}
