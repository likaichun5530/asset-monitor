import { useEffect, useState } from 'react'
import { clearAiMessages, getAiModels, saveAiModels } from '../utils/ai.js'
import AppDialog from './AppDialog.jsx'
import SaveButton from './SaveButton.jsx'

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

  const moveModel = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= models.length) return
    setModels((current) => {
      const reordered = [...current]
      const moved = reordered[index]
      reordered[index] = reordered[nextIndex]
      reordered[nextIndex] = moved
      return reordered
    })
    setSaved(false)
    setError('')
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

  return (
    <AppDialog open={open} onClose={onClose} title="AI 模型清单" description="账户配置 · SystemSettings / ai.models" ariaLabel="AI模型清单" actions={(
      <SaveButton saving={saving} saved={saved} disabled={loading || !models.length} onClick={handleSave} savedText="模型清单已保存" />
    )}>
        <div className="space-y-3">
          <p className="rounded-lg bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-500 dark:bg-gray-700/50 dark:text-gray-400">模型清单跟随账户，整份清单保存在 Google Sheet 的 <span className="font-medium text-gray-700 dark:text-gray-300">SystemSettings / ai.models</span>；当前选中的模型仅保存在本设备。</p>
          {!loading && (
            <button type="button" onClick={addModel} disabled={models.length >= maxModels} className="w-full rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-3 py-2.5 text-xs font-medium text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-brand-500/30 dark:bg-brand-500/10">
              ＋ 新增模型（当前 {models.length}/{maxModels}）
            </button>
          )}
          {loading ? <div className="py-16 text-center text-sm text-gray-400">正在读取模型清单…</div> : models.map((model, index) => (
            <div key={index} className="rounded-xl border border-gray-200 p-3 dark:border-gray-600">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">模型 {index + 1}{index === 0 ? ' · 默认' : ''}</span>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => moveModel(index, -1)} disabled={index === 0} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:text-gray-300" aria-label={`上移${model.label || `模型${index + 1}`}`}>上移</button>
                  <button type="button" onClick={() => moveModel(index, 1)} disabled={index === models.length - 1} className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 disabled:cursor-not-allowed disabled:opacity-30 dark:border-gray-600 dark:text-gray-300" aria-label={`下移${model.label || `模型${index + 1}`}`}>下移</button>
                  <button type="button" onClick={() => removeModel(index)} disabled={models.length <= 1} className="rounded-md px-2 py-1 text-xs font-medium text-red-500 disabled:cursor-not-allowed disabled:opacity-35">删除</button>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-gray-400">服务商
                  <select value={model.provider} onChange={(event) => updateModel(index, 'provider', event.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"><option value="gemini">Google Gemini</option><option value="deepseek">DeepSeek</option></select>
                </label>
                <label className="text-xs text-gray-400">API 模型 ID
                  <input value={model.id} onChange={(event) => updateModel(index, 'id', event.target.value)} placeholder="gemini-..." className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
                <label className="text-xs text-gray-400">显示名称
                  <input value={model.label} onChange={(event) => updateModel(index, 'label', event.target.value)} placeholder="模型名称" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
                <label className="text-xs text-gray-400">简短说明
                  <input value={model.description} onChange={(event) => updateModel(index, 'description', event.target.value)} placeholder="速度、成本或用途" className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200" />
                </label>
              </div>
            </div>
          ))}
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-500 dark:bg-red-500/10">{error}</div>}
        </div>
    </AppDialog>
  )
}
