import { useEffect, useMemo, useRef, useState } from 'react'
import { TARGET_CATEGORIES } from '../../shared/targetCategories.js'
import { saveTargetConfig } from '../utils/dataStore.js'
import AppDialog from './AppDialog.jsx'

function initialFields(targets = []) {
  const values = new Map(targets.map((item) => [item.category === '债券' ? '债基' : item.category, item.targetPercent]))
  return Object.fromEntries(TARGET_CATEGORIES.map((category) => [category, String(values.get(category) ?? 0)]))
}

function analyzeFields(fields) {
  let totalCents = 0
  let valid = true
  for (const category of TARGET_CATEGORIES) {
    const raw = String(fields[category] ?? '').trim()
    const value = Number(raw)
    const cents = Math.round(value * 100)
    if (!raw || !Number.isFinite(value) || value < 0 || value > 100 || Math.abs(value * 100 - cents) > 1e-7) {
      valid = false
      continue
    }
    totalCents += cents
  }
  return { totalCents, total: totalCents / 100, valid: valid && totalCents === 10_000 }
}

function displayPercent(value) {
  return Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function sortedCategories(targets = []) {
  const values = new Map(targets.map((item) => [item.category === '债券' ? '债基' : item.category, Number(item.targetPercent) || 0]))
  return [...TARGET_CATEGORIES].sort((a, b) => (values.get(b) || 0) - (values.get(a) || 0) || TARGET_CATEGORIES.indexOf(a) - TARGET_CATEGORIES.indexOf(b))
}

export default function TargetConfigDialog({ open, targets, onClose, onSaved }) {
  const [fields, setFields] = useState(() => initialFields(targets))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [categoryOrder, setCategoryOrder] = useState(() => sortedCategories(targets))
  const closeTimerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    setFields(initialFields(targets))
    setCategoryOrder(sortedCategories(targets))
    setSaving(false)
    setError('')
    setSuccess(false)
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }, [open])

  const analysis = useMemo(() => analyzeFields(fields), [fields])
  const difference = Math.round((100 - analysis.total) * 100) / 100

  function updateField(category, value) {
    if (value.length > 6 || !/^\d{0,3}(?:\.\d{0,2})?$/.test(value)) return
    setFields((current) => ({ ...current, [category]: value }))
    setError('')
    setSuccess(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (!analysis.valid) {
      setError('各类资产目标比例填写完整后，合计必须为 100%')
      return
    }
    setSaving(true)
    setError('')
    try {
      const result = await saveTargetConfig(TARGET_CATEGORIES.map((category) => ({
        category,
        targetPercent: Number(fields[category]),
      })))
      setSuccess(true)
      onSaved?.(result)
      closeTimerRef.current = window.setTimeout(() => onClose?.(), 700)
    } catch (requestError) {
      setError(requestError.message || '目标配置保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  const action = (
    <button form="target-config-form" type="submit" disabled={saving || success || !analysis.valid} className="h-10 rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition-all active:scale-95 disabled:scale-100 disabled:opacity-50">
      {saving ? '保存中…' : success ? '✓ 已保存' : '保存目标'}
    </button>
  )

  return (
    <AppDialog
      open={open}
      onClose={() => { if (!saving) onClose?.() }}
      title="调整配置目标"
      description="各类资产目标比例合计需要等于 100%"
      ariaLabel="调整配置目标"
      maxWidth="sm:max-w-lg"
      closeDisabled={saving}
      actions={action}
    >
      <form id="target-config-form" onSubmit={submit} className="space-y-3">
        <div className={`flex items-center justify-between rounded-xl border px-3.5 py-3 ${analysis.valid ? 'border-emerald-100 bg-emerald-50/70 dark:border-emerald-500/20 dark:bg-emerald-500/10' : 'border-amber-100 bg-amber-50/70 dark:border-amber-500/20 dark:bg-amber-500/10'}`}>
          <div>
            <div className="text-xs text-gray-500 dark:text-gray-400">目标比例合计</div>
            <div className={`font-num mt-0.5 text-xl font-semibold ${analysis.valid ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>{displayPercent(analysis.total)}%</div>
          </div>
          <div className="text-right text-xs">
            {analysis.valid
              ? <span className="font-medium text-emerald-600 dark:text-emerald-400">分配完成</span>
              : <><span className="block text-gray-400">{difference >= 0 ? '尚未分配' : '已经超出'}</span><span className="font-num mt-0.5 block text-sm font-medium text-amber-600 dark:text-amber-400">{displayPercent(Math.abs(difference))}%</span></>}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
          {categoryOrder.map((category, index) => (
            <label key={category} className={`flex min-h-12 items-center justify-between gap-4 px-3.5 py-2 ${index ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{category}</span>
              <span className="flex items-center gap-1.5">
                <input
                  type="text"
                  inputMode="decimal"
                  value={fields[category]}
                  onChange={(event) => updateField(category, event.target.value)}
                  disabled={saving || success}
                  aria-label={`${category}目标比例`}
                  className="font-num h-9 w-24 rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-right text-sm font-medium text-gray-800 outline-none transition-colors focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:focus:bg-gray-800"
                />
                <span className="w-4 text-sm text-gray-400">%</span>
              </span>
            </label>
          ))}
        </div>

        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-5 text-red-500 dark:bg-red-500/10">{error}</div>}
        {success && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">目标配置已保存并更新</div>}
      </form>
    </AppDialog>
  )
}
