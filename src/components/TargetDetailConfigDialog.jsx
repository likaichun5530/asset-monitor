import { useEffect, useMemo, useRef, useState } from 'react'
import { saveTargetDetailTargets, saveTargetStrategy } from '../utils/dataStore.js'
import AppDialog from './AppDialog.jsx'

function percentInput(value) {
  return Number.isFinite(Number(value)) ? String(Math.round(Number(value) * 10_000) / 100) : ''
}

export default function TargetDetailConfigDialog({ open, row, detail, onClose, onSaved }) {
  const [items, setItems] = useState([])
  const [strategy, setStrategy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const sequenceRef = useRef(0)
  const allocation = detail?.allocation || null

  useEffect(() => {
    if (!open) return
    sequenceRef.current = 0
    setItems((detail?.allocation?.items || []).filter((item) => item.targetRatio !== null).slice().sort((a, b) => b.targetRatio - a.targetRatio).map((item) => ({ id: `saved-${sequenceRef.current++}`, name: item.name, targetPercent: percentInput(item.targetRatio) })))
    setStrategy(detail?.strategy || '')
    setSaving(false)
    setError('')
    setSuccess(false)
  }, [open, row?.category])

  const analysis = useMemo(() => {
    const names = new Set()
    let totalCents = 0
    let valid = true
    for (const item of items) {
      const name = item.name.trim().toLocaleUpperCase('zh-CN')
      const percentage = Number(item.targetPercent)
      const cents = Math.round(percentage * 100)
      if (!name || names.has(name) || !String(item.targetPercent).trim() || !Number.isFinite(percentage) || percentage < 0 || percentage > 100 || Math.abs(percentage * 100 - cents) > 1e-7) valid = false
      names.add(name)
      if (Number.isFinite(cents)) totalCents += cents
    }
    return { total: totalCents / 100, valid: valid && totalCents <= 10_000 }
  }, [items])

  if (!row) return null

  function updateItem(id, patch) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item))
    setError('')
    setSuccess(false)
  }

  function addItem() {
    setItems((current) => [...current, { id: `new-${Date.now()}-${sequenceRef.current++}`, name: '', targetPercent: '' }])
    setError('')
    setSuccess(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (allocation && !analysis.valid) {
      setError('请填写不重复的名称和有效比例，目标合计不能超过 100%')
      return
    }
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const result = allocation
        ? await saveTargetDetailTargets(row.category, items.map((item) => ({ name: item.name.trim(), targetPercent: Number(item.targetPercent) })))
        : await saveTargetStrategy(row.category, strategy)
      setSuccess(true)
      onSaved?.(result)
    } catch (requestError) {
      setError(requestError.message || '配置保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const action = <button form="target-detail-config-form" type="submit" disabled={saving || (allocation && !analysis.valid)} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-50">{saving ? '保存中…' : success ? '✓ 已保存' : '保存'}</button>

  return (
    <AppDialog open={open} onClose={() => { if (!saving) onClose?.() }} title={allocation ? `调整${row.category}细分目标` : `编辑${row.category}配置思路`} description={allocation ? '细分目标按该类资产内部占比填写' : '记录该类资产的配置原则'} ariaLabel={allocation ? `调整${row.category}细分目标` : `编辑${row.category}配置思路`} maxWidth="sm:max-w-lg" closeDisabled={saving} actions={action}>
      <form id="target-detail-config-form" onSubmit={submit} className="space-y-3">
        {allocation ? (
          <>
            <div className={`flex items-center justify-between rounded-xl border px-3.5 py-3 ${analysis.valid ? 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10'}`}><span className="text-xs text-gray-500 dark:text-gray-400">细分目标合计</span><span className={`font-num text-lg font-semibold ${analysis.total > 100 ? 'text-red-500' : 'text-gray-800 dark:text-gray-100'}`}>{analysis.total.toFixed(2).replace(/\.00$/, '')}%</span></div>
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
              {items.map((item, index) => (
                <div key={item.id} className={`grid grid-cols-[minmax(0,1fr)_84px_32px] items-center gap-2 px-3 py-2.5 ${index ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                  <input type="text" value={item.name} onChange={(event) => updateItem(item.id, { name: event.target.value.slice(0, 80) })} disabled={saving} placeholder="名称或代码" aria-label={`细分目标${index + 1}名称或代码`} className="h-9 min-w-0 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm text-gray-800 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
                  <label className="flex items-center gap-1"><input type="text" inputMode="decimal" value={item.targetPercent} onChange={(event) => { if (/^\d{0,3}(?:\.\d{0,2})?$/.test(event.target.value)) updateItem(item.id, { targetPercent: event.target.value }) }} disabled={saving} placeholder="0" aria-label={`${item.name || `细分目标${index + 1}`}目标比例`} className="font-num h-9 w-[66px] rounded-lg border border-gray-200 bg-gray-50 px-2 text-right text-sm font-medium text-gray-800 outline-none focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" /><span className="text-sm text-gray-400">%</span></label>
                  <button type="button" onClick={() => setItems((current) => current.filter((entry) => entry.id !== item.id))} disabled={saving} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500 active:scale-95 dark:hover:bg-red-500/10" aria-label={`删除${item.name || `第${index + 1}行`}`}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h16M9 7V4h6v3m-9 0 1 13h10l1-13M10 11v5m4-5v5" /></svg></button>
                </div>
              ))}
              {!items.length && <div className="px-4 py-8 text-center text-sm text-gray-400">暂无细分目标，点击下方按钮新增</div>}
            </div>
            <button type="button" onClick={addItem} disabled={saving || items.length >= 100} className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-200 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50 active:scale-[0.99] disabled:opacity-40 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"><span className="text-lg leading-none">＋</span>新增行</button>
            {analysis.total < 100 && <p className="text-xs leading-5 text-amber-600 dark:text-amber-400">尚有 {(100 - analysis.total).toFixed(2).replace(/\.00$/, '')}% 未分配，可以继续新增标的。</p>}
          </>
        ) : (
          <label className="block"><span className="text-sm font-medium text-gray-700 dark:text-gray-200">配置思路</span><textarea value={strategy} onChange={(event) => { setStrategy(event.target.value.slice(0, 2000)); setError(''); setSuccess(false) }} rows={10} placeholder={`填写${row.category}的配置思路`} className="mt-2 min-h-48 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" /><span className="mt-1 block text-right text-[11px] text-gray-400">{strategy.length}/2000</span></label>
        )}
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-500 dark:bg-red-500/10">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">已保存到 Google Sheets target 表</div>}
      </form>
    </AppDialog>
  )
}
