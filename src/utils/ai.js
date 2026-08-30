import { apiFetch, requestApiJson } from './api.js'

export const AI_ENABLED_KEY = 'youshu-ai-enabled'
export const AI_CONSENT_KEY = 'youshu-ai-consent'
export const AI_MESSAGES_KEY = 'youshu-ai-messages'
export const AI_SETTING_EVENT = 'youshu-ai-setting-changed'
export const AI_MESSAGES_CLEARED_EVENT = 'youshu-ai-messages-cleared'
export const AI_MODEL_KEY = 'youshu-ai-model'
export const AI_MODEL_CHANGED_EVENT = 'youshu-ai-model-changed'
export const AI_WEB_SEARCH_KEY = 'youshu-ai-web-search'
const LEGACY_AI_PROVIDER_KEY = 'youshu-ai-provider'
export const DEFAULT_AI_MODEL_ID = 'gemini-3.5-flash-lite'
export const AI_MODEL_OPTIONS = [
  { id: 'gemini-3.5-flash-lite', provider: 'gemini', label: 'Gemini 3.5 Lite', description: '快速 · 默认 · 低成本' },
  { id: 'gemini-3.5-flash', provider: 'gemini', label: 'Gemini 3.5 Flash', description: '更强 · 深度分析' },
  { id: 'deepseek-v4-flash', provider: 'deepseek', label: 'DeepSeek V4 Flash', description: '低成本 · 备用' },
]

export function getAiModelOption(modelId, models = AI_MODEL_OPTIONS) {
  return models.find((item) => item.id === modelId) || models[0] || AI_MODEL_OPTIONS[0]
}

export function normalizeClientAiModels(models) {
  if (!Array.isArray(models) || !models.length) return AI_MODEL_OPTIONS
  const normalized = models.filter((model) => (
    model && ['gemini', 'deepseek'].includes(model.provider) && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/.test(model.id) && model.label
  )).map((model) => ({
    id: String(model.id),
    provider: model.provider,
    label: String(model.label).slice(0, 40),
    description: String(model.description || '').slice(0, 80),
  }))
  return normalized.length ? normalized : AI_MODEL_OPTIONS
}

export function getCachedAiModel() {
  try {
    const stored = localStorage.getItem(AI_MODEL_KEY)
    if (/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/.test(stored || '')) return stored
    const legacyProvider = localStorage.getItem(LEGACY_AI_PROVIDER_KEY)
    return legacyProvider === 'deepseek' ? 'deepseek-v4-flash' : DEFAULT_AI_MODEL_ID
  } catch {
    return DEFAULT_AI_MODEL_ID
  }
}

export function cacheAiModel(modelId) {
  const normalized = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,79}$/.test(String(modelId || ''))
    ? String(modelId)
    : DEFAULT_AI_MODEL_ID
  localStorage.setItem(AI_MODEL_KEY, normalized)
  localStorage.removeItem(LEGACY_AI_PROVIDER_KEY)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AI_MODEL_CHANGED_EVENT, { detail: { model: normalized } }))
  }
  return normalized
}

export function isAiEnabled() {
  try { return localStorage.getItem(AI_ENABLED_KEY) === 'true' } catch { return false }
}

export function setAiEnabled(enabled) {
  localStorage.setItem(AI_ENABLED_KEY, enabled ? 'true' : 'false')
  window.dispatchEvent(new CustomEvent(AI_SETTING_EVENT, { detail: { enabled } }))
}

export function loadAiMessages() {
  try {
    const parsed = JSON.parse(localStorage.getItem(AI_MESSAGES_KEY) || '[]')
    return Array.isArray(parsed)
      ? parsed.filter((message) => ['user', 'assistant'].includes(message?.role) && message?.content).slice(-20)
      : []
  } catch {
    return []
  }
}

export function saveAiMessages(messages) {
  try {
    const saved = messages
      .filter((message) => ['user', 'assistant'].includes(message?.role) && message?.content)
      .slice(-20)
    localStorage.setItem(AI_MESSAGES_KEY, JSON.stringify(saved))
  } catch {
    // ignore
  }
}

export function clearAiMessages() {
  localStorage.removeItem(AI_MESSAGES_KEY)
  window.dispatchEvent(new CustomEvent(AI_MESSAGES_CLEARED_EVENT))
}

export async function getAiRules() {
  return requestApiJson('ai-rules')
}

export async function saveAiRules(rules) {
  return requestApiJson('ai-rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rules }),
  })
}

export async function getAiModels() {
  const data = await requestApiJson('ai-rules?resource=models')
  return { ...data, models: normalizeClientAiModels(data.models) }
}

export async function saveAiModels(models) {
  const data = await requestApiJson('ai-rules?resource=models', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ models }),
  })
  return { ...data, models: normalizeClientAiModels(data.models) }
}

export async function streamAiChat(messages, page, onChunk, { signal, model, webSearch = false } = {}) {
  const selectedModel = model || getAiModelOption(getCachedAiModel())
  let response
  try {
    response = await apiFetch('ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.slice(-8),
        page,
        provider: selectedModel.provider,
        model: selectedModel.id,
        webSearch: webSearch === true,
      }),
      signal,
      timeoutMs: 0,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    if (error?.status) throw error
    throw new Error('网络不可用，无法连接 AI 助手')
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || `AI 请求失败（${response.status}）`)
  }
  if (!response.body) throw new Error('浏览器不支持流式回答')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (chunk) onChunk(chunk)
  }
  const responseProvider = response.headers.get('X-AI-Provider')
  const responseSelection = response.headers.get('X-AI-Selection')
  const actualSelection = responseSelection
    ? cacheAiModel(responseSelection)
    : selectedModel.id
  return {
    model: response.headers.get('X-AI-Model') || 'DeepSeek',
    selectionId: actualSelection,
    provider: ['deepseek', 'gemini'].includes(responseProvider) ? responseProvider : getAiModelOption(actualSelection).provider,
    fallback: response.headers.get('X-AI-Fallback') === 'true',
    webSearch: response.headers.get('X-AI-Web-Search') === 'true',
    dataAsOf: response.headers.get('X-Asset-As-Of') || null,
  }
}
