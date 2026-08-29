import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { clearAiMessages, getAiModels, saveAiModels } from '../utils/ai.js'

const EMPTY_MODEL = { provider: 'gemini', id: '', label: '', description: '' }

export default function AiModelSettingsDialog({ open, onClose }) {
  const [models, setModels] = useState([])
  const [maxModels, setMaxModels] = useState(12)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.dataset.modalOpen = 'true'
    document.body.style.overflow = 'hidden'
    document.body.style.overscrollBehavior = 'none'
    return () => {
      delete document.body.dataset.modalOpen
      document.body.style.overflow = previousOverflow
      document.body.style.overscrollBehavior = previousOverscroll
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setLoading(true)
    setError('')
    setSaved(false)
    getAiModels().then((data) => {
      if (!active) return
      setModels(data.models)
      setMaxModels(data.maxModels || 12)
    }).catch((requestError) => {
      if (active) setError(requestError.message || '读取模型清单失败')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [open])

  if (!open) return null

  const updateModel = (index, field, value) => {
    setModels((current) => current.map((model, modelIndex) => (
      modelIndex === index ? { ...model, [field]: value } : model
    )))
    setSaved(false)
    setError('')
  }

  const removeModel = (index) => {
    if (models.length <= 1) { setError('至少需要保留一个模型'); return }
    setModels((current) => current.filter((_, modelIndex) => modelIndex !== index))
    setSaved(false)
  }

  const addModel = () => {
    if (models.length >= maxModels) return
    setModels((current) => [...current, { ...EMPTY_MODEL }])
    setSaved(false)
    setError('')
  }

  const handleSave = async () => {
    if (saving) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const data = await saveAiModels(models)
      setModels(data.models)
      clearAiMessages()
      setSaved(true)
    } catch (requestError) {
      setError(requestError.message || '保存模型清单失败')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[86] flex items-end justify-center overflow-hidden overscroll-none sm:items-center sm:px-4" data-pull-refresh-ignore="true">
      <button type="button" className="fixed inset-0 touch-none bg-black/40" onClick={onClose} aria-label="关闭AI模型设置" />
      <section role="dialog" aria-modal="true" aria-label="AI模型清单" className="relative flex max-h-[calc(100dvh-8px)] min-h-0 w-full flex-col overflow-hidden overscroll-none rounded-t-2xl bg-white shadow-2xl dark:bg-gray-800 sm:max-h-[92dvh] sm:max-w-2xl sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">AI 模型清单</h3>
            <p className="mt-0.5 text-[10px] text-gray-400">保存到 SystemSettings；第一项为默认模型</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={handleSave} disabled={loading || saving || !models.length} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white disabled:opacity-50">{saving ? '保存中…' : '保存'}</button>
            <button type="button" onClick={onClose} className="p-2 text-gray-400" aria-label="关闭"><svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 6 12 12M18 6 6 18" /></svg></button>
          </div>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]" style={{ WebkitOverflowScrolling: 'touch' }}>
          {!loading && (
            <button type="button" onClick={addModel} disabled={models.length >= maxModels} className="w-full rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs font-medium text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-500/30 dark:bg-brand-500/10">
              ＋ 新增模型（当前 {models.length}/{maxModels}）
            </button>
          )}
          {loading ? <div className="py-16 text-center text-sm text-gray-400">正在读取模型清单…</div> : models.map((model, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">模型 {index + 1}{index === 0 ? ' · 默认' : ''}</span>
                <button type="button" onClick={() => removeModel(index)} disabled={models.length <= 1} className="rounded-md px-2 py-1 text-[11px] font-medium text-red-500 disabled:cursor-not-allowed disabled:opacity-35">删除模型</button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-[10px] text-gray-400">服务商
                  <select value={model.provider} onChange={(event) => updateModel(index, 'provider', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"><option value="gemini">Google Gemini</option><option value="deepseek">DeepSeek</option></select>
                </label>
                <label className="text-[10px] text-gray-400">API 模型 ID
                  <input value={model.id} onChange={(event) => updateModel(index, 'id', event.target.value)} placeholder="gemini-..." className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
                <label className="text-[10px] text-gray-400">显示名称
                  <input value={model.label} onChange={(event) => updateModel(index, 'label', event.target.value)} placeholder="模型名称" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
                <label className="text-[10px] text-gray-400">简短说明
                  <input value={model.description} onChange={(event) => updateModel(index, 'description', event.target.value)} placeholder="速度、成本或用途" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
              </div>
            </div>
          ))}
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{error}</div>}
          {saved && <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-600 dark:bg-green-500/10 dark:text-green-400">模型清单已保存到 Google Sheet。</div>}
        </div>
      </section>
    </div>,
    document.body,
  )
}
