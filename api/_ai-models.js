import { SYSTEM_SETTING_KEYS, systemSettingsStore } from './_system-settings.js'

export const DEFAULT_AI_MODELS = Object.freeze([
  Object.freeze({ id: 'gemini-3.5-flash-lite', provider: 'gemini', label: 'Gemini 3.5 Lite', description: '快速 · 默认 · 低成本' }),
  Object.freeze({ id: 'gemini-3.5-flash', provider: 'gemini', label: 'Gemini 3.5 Flash', description: '更强 · 深度分析' }),
  Object.freeze({ id: 'deepseek-v4-flash', provider: 'deepseek', label: 'DeepSeek V4 Flash', description: '低成本 · 备用' }),
])

export const MAX_AI_MODELS = 12
const MODEL_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/

function modelError(message) {
  return Object.assign(new Error(message), { statusCode: 400 })
}

export function normalizeAiModels(value, { useDefaults = true } = {}) {
  let parsed = value
  if (typeof value === 'string') {
    if (!value.trim()) return useDefaults ? DEFAULT_AI_MODELS.map((model) => ({ ...model })) : []
    try { parsed = JSON.parse(value) } catch { throw modelError('AI 模型清单格式无效') }
  }
  if (!Array.isArray(parsed)) throw modelError('AI 模型清单格式无效')
  if (!parsed.length) throw modelError('至少需要保留一个 AI 模型')
  if (parsed.length > MAX_AI_MODELS) throw modelError(`AI 模型不能超过 ${MAX_AI_MODELS} 个`)

  const ids = new Set()
  return parsed.map((item, index) => {
    const provider = String(item?.provider || '').trim().toLowerCase()
    const id = String(item?.id || '').trim()
    const label = String(item?.label || '').trim().slice(0, 40)
    const description = String(item?.description || '').trim().slice(0, 80)
    if (!['gemini', 'deepseek'].includes(provider)) throw modelError(`第 ${index + 1} 个模型服务商无效`)
    if (!MODEL_ID_PATTERN.test(id)) throw modelError(`第 ${index + 1} 个 API 模型 ID 无效`)
    if (!label) throw modelError(`第 ${index + 1} 个模型名称不能为空`)
    if (ids.has(id)) throw modelError(`模型 ID 重复：${id}`)
    ids.add(id)
    return { id, provider, label, description }
  })
}

export function modelsToMap(models) {
  return Object.fromEntries(models.map((model) => [model.id, { ...model, apiModel: model.id }]))
}

export async function readAiModels({ settingsStore = systemSettingsStore, initialize = false } = {}) {
  const { settings } = await settingsStore.read()
  const saved = settings.get(SYSTEM_SETTING_KEYS.aiModels)?.value
  const models = normalizeAiModels(saved || '')
  if (!saved && initialize) {
    await settingsStore.upsert([{
      key: SYSTEM_SETTING_KEYS.aiModels,
      value: JSON.stringify(models),
      description: 'Editable AI model list; first item is the default model',
    }])
  }
  return models
}

export async function writeAiModels(models, { settingsStore = systemSettingsStore } = {}) {
  const normalized = normalizeAiModels(models, { useDefaults: false })
  await settingsStore.upsert([{
    key: SYSTEM_SETTING_KEYS.aiModels,
    value: JSON.stringify(normalized),
    description: 'Editable AI model list; first item is the default model',
  }])
  const { settings } = await settingsStore.read()
  const persisted = normalizeAiModels(settings.get(SYSTEM_SETTING_KEYS.aiModels)?.value, { useDefaults: false })
  if (JSON.stringify(persisted) !== JSON.stringify(normalized)) {
    throw Object.assign(new Error('AI 模型清单未能完整写入 Google Sheet，请重试'), { statusCode: 503 })
  }
  return persisted
}
