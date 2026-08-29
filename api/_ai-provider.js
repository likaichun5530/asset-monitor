import { createDeepSeekStream } from './_deepseek.js'
import { createGeminiStream, extractGeminiText, getGeminiFinishReason } from './_gemini.js'

export const AI_MODELS = Object.freeze({
  'gemini-3.5-flash-lite': Object.freeze({
    id: 'gemini-3.5-flash-lite', provider: 'gemini', apiModel: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Lite',
  }),
  'gemini-3.5-flash': Object.freeze({
    id: 'gemini-3.5-flash', provider: 'gemini', apiModel: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash',
  }),
  'deepseek-v4-flash': Object.freeze({
    id: 'deepseek-v4-flash', provider: 'deepseek', apiModel: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash',
  }),
})

export const DEFAULT_AI_MODEL_ID = 'gemini-3.5-flash-lite'
export const DEFAULT_AI_PROVIDER = 'gemini'

export function normalizeAiProvider(value) {
  const provider = String(value || DEFAULT_AI_PROVIDER).trim().toLowerCase()
  if (!['deepseek', 'gemini'].includes(provider)) {
    throw Object.assign(new Error('不支持的 AI 模型服务商'), { statusCode: 400 })
  }
  return provider
}

export function getAiProviderAvailability() {
  return {
    deepseek: Boolean(process.env.DEEPSEEK_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  }
}

function requestedModelId(selection) {
  if (typeof selection === 'string') {
    if (selection === 'gemini') return DEFAULT_AI_MODEL_ID
    if (selection === 'deepseek') return 'deepseek-v4-flash'
    return String(selection).trim().toLowerCase()
  }
  if (!selection?.model && selection?.provider) return selection.provider === 'deepseek' ? 'deepseek-v4-flash' : DEFAULT_AI_MODEL_ID
  return String(selection?.model || DEFAULT_AI_MODEL_ID).trim().toLowerCase()
}

export function resolveAiModel(selection, availability = getAiProviderAvailability()) {
  const requested = AI_MODELS[requestedModelId(selection)]
  if (!requested) throw Object.assign(new Error('不支持的 AI 模型'), { statusCode: 400 })
  if (selection?.provider && normalizeAiProvider(selection.provider) !== requested.provider) {
    throw Object.assign(new Error('AI 模型与服务商不匹配'), { statusCode: 400 })
  }
  if (availability[requested.provider]) return { ...requested, fallback: false }

  const fallbackId = availability.gemini
    ? DEFAULT_AI_MODEL_ID
    : availability.deepseek
      ? 'deepseek-v4-flash'
      : null
  if (!fallbackId) throw Object.assign(new Error('当前模型暂不可用，请切换其他模型'), { statusCode: 503 })
  return { ...AI_MODELS[fallbackId], fallback: true }
}

export async function createAiStream(selection, context, messages, rules) {
  const selected = resolveAiModel(selection)
  const result = selected.provider === 'gemini'
    ? await createGeminiStream(context, messages, rules, selected.apiModel)
    : await createDeepSeekStream(context, messages, rules, selected.apiModel)
  return {
    ...result,
    provider: selected.provider,
    selectionId: selected.id,
    fallback: selected.fallback,
  }
}

export function extractAiStreamEvent(provider, event) {
  if (provider === 'gemini') {
    return { content: extractGeminiText(event), finishReason: getGeminiFinishReason(event) }
  }
  return {
    content: String(event?.choices?.[0]?.delta?.content || ''),
    finishReason: String(event?.choices?.[0]?.finish_reason || '').trim().toUpperCase() || null,
  }
}

export function extractAiStreamText(provider, event) {
  return extractAiStreamEvent(provider, event).content
}
