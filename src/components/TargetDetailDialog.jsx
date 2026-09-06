import { useEffect, useState } from 'react'
import { formatCurrency } from '../utils/format.js'
import { saveTargetStrategy } from '../utils/dataStore.js'
import { getTargetAdjustmentAmount, getTargetAllocationStatus, getTargetAllowedRange } from '../utils/targetAllocation.js'
import AppDialog from './AppDialog.jsx'

function percent(value, digits = 1) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(digits)}%` : '未设置'
}

export default function TargetDetailDialog({ open, row, detail, totalMarketValue, onClose, onEditTarget, onSaved }) {
  const [strategy, setStrategy] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!open) return
    setStrategy(detail?.strategy || '')
    setSaving(false)
    setError('')
    setSuccess(false)
  }, [open, row?.category])

  if (!row) return null
  const allocation = getTargetAllocationStatus(row.currentRatio, row.targetRatio)
  const allowedRange = getTargetAllowedRange(row.targetRatio)
  const difference = Number.isFinite(Number(row.diff)) ? Number(row.diff) : null
  const adjustment = Math.abs(getTargetAdjustmentAmount(Number(row.marketValue), Number(totalMarketValue), Number(row.targetRatio)) || 0)
  const statusLabel = allocation.status === 'over' ? '超出合理范围' : allocation.status === 'under' ? '低于合理范围' : allocation.status === 'balanced' ? '处于合理范围' : '尚未设置目标'
  const statusClass = allocation.status === 'over' ? 'text-red-500' : allocation.status === 'under' ? 'text-green-600' : allocation.status === 'balanced' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'

  async function submit(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      const result = await saveTargetStrategy(row.category, strategy)
      setSuccess(true)
      onSaved?.(result)
    } catch (requestError) {
      setError(requestError.message || '配置思路保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppDialog
      open={open}
      onClose={() => { if (!saving) onClose?.() }}
      title={`${row.category}配置详情`}
      description="查看配置目标、当前符合度与配置思路"
      ariaLabel={`${row.category}配置详情`}
      maxWidth="sm:max-w-lg"
      closeDisabled={saving}
      actions={<button form="target-strategy-form" type="submit" disabled={saving} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-50">{saving ? '保存中…' : success ? '✓ 已保存' : '保存配置思路'}</button>}
    >
      <form id="target-strategy-form" onSubmit={submit} className="space-y-4">
        <section className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-gray-400">配置符合度</div>
              <div className={`mt-1 text-base font-semibold ${statusClass}`}>{statusLabel}</div>
            </div>
            <button type="button" onClick={onEditTarget} className="h-9 shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-600 active:scale-95 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">调整目标比例</button>
          </div>
          <div className="mt-3 grid grid-cols-3 border-t border-gray-100 pt-3 text-center dark:border-gray-700">
            <div className="border-r border-gray-100 dark:border-gray-700"><div className="text-[11px] text-gray-400">当前配置</div><div className="font-num mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{percent(row.currentRatio)}</div></div>
            <div className="border-r border-gray-100 dark:border-gray-700"><div className="text-[11px] text-gray-400">计划目标</div><div className="font-num mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{percent(row.targetRatio)}</div></div>
            <div><div className="text-[11px] text-gray-400">目标偏差</div><div className={`font-num mt-1 text-sm font-medium ${statusClass}`}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${(difference * 100).toFixed(1)}%`}</div></div>
          </div>
          {allowedRange && <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-700/40 dark:text-gray-300">合理区间：{percent(allowedRange.lower)}～{percent(allowedRange.upper)}</div>}
          {(allocation.status === 'over' || allocation.status === 'under') && (
            <div className={`mt-2 text-xs ${statusClass}`}>{allocation.status === 'over' ? '建议减少' : '建议增加'} {formatCurrency(adjustment, { decimals: 0 })}</div>
          )}
        </section>

        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">配置思路</span>
          <span className="mt-1 block text-xs leading-5 text-gray-400">记录该类资产的配置原则、持有理由或调整条件；允许暂时留空。</span>
          <textarea value={strategy} onChange={(event) => { setStrategy(event.target.value.slice(0, 2000)); setError(''); setSuccess(false) }} rows={8} placeholder={`填写${row.category}的配置思路`} className="mt-2 min-h-40 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm leading-6 text-gray-800 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100" />
          <span className="mt-1 block text-right text-[11px] text-gray-400">{strategy.length}/2000</span>
        </label>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">配置思路已保存到 Google Sheets target 表</div>}
      </form>
    </AppDialog>
  )
}
