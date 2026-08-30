import { createDeepSeekSearchStream, createDeepSeekStream } from './_deepseek.js'
import { createGeminiStream, extractGeminiText, getGeminiFinishReason } from './_gemini.js'
import { DEFAULT_AI_MODELS, modelsToMap, readAiModels } from './_ai-models.js'

export const AI_MODELS = Object.freeze(modelsToMap(DEFAULT_AI_MODELS))

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

function requestedModelId(selection, availableModels) {
  const firstModel = Object.values(availableModels)[0]
  if (typeof selection === 'string') {
    if (['gemini', 'deepseek'].includes(selection)) {
      return Object.values(availableModels).find((model) => model.provider === selection)?.id || firstModel?.id
    }
    return String(selection).trim().toLowerCase()
  }
  if (!selection?.model && selection?.provider) {
    return Object.values(availableModels).find((model) => model.provider === selection.provider)?.id || firstModel?.id
  }
  return String(selection?.model || firstModel?.id || DEFAULT_AI_MODEL_ID).trim().toLowerCase()
}

export function resolveAiModel(selection, availability = getAiProviderAvailability(), availableModels = AI_MODELS) {
  const requested = availableModels[requestedModelId(selection, availableModels)]
  if (!requested) throw Object.assign(new Error('不支持的 AI 模型'), { statusCode: 400 })
  if (selection?.provider && normalizeAiProvider(selection.provider) !== requested.provider) {
    throw Object.assign(new Error('AI 模型与服务商不匹配'), { statusCode: 400 })
  }
  if (availability[requested.provider]) return { ...requested, fallback: false }

  const fallback = Object.values(availableModels).find((model) => availability[model.provider])
  if (!fallback) throw Object.assign(new Error('当前模型暂不可用，请切换其他模型'), { statusCode: 503 })
  return { ...fallback, fallback: true }
}

export async function createAiStream(selection, context, messages, rules, { models, webSearch = false } = {}) {
  const availableModels = modelsToMap(models || await readAiModels())
  const selected = resolveAiModel(selection, getAiProviderAvailability(), availableModels)
  const result = selected.provider === 'gemini'
    ? await createGeminiStream(context, messages, rules, selected.apiModel, { webSearch })
    : webSearch
      ? await createDeepSeekSearchStream(context, messages, rules, selected.apiModel)
      : await createDeepSeekStream(context, messages, rules, selected.apiModel)
  return {
    ...result,
    provider: selected.provider,
    selectionId: selected.id,
    fallback: selected.fallback,
  }
}

export function extractAiStreamEvent(provider, event, streamFormat = 'chat') {
  if (streamFormat === 'responses') {
    return {
      content: event?.type === 'response.output_text.delta' ? String(event.delta || '') : '',
      finishReason: event?.type === 'response.incomplete' ? 'MAX_TOKENS' : event?.type === 'response.completed' ? 'STOP' : null,
    }
  }
  if (provider === 'gemini') {
    return { content: extractGeminiText(event), finishReason: getGeminiFinishReason(event) }
  }
  return {
    content: String(event?.choices?.[0]?.delta?.content || ''),
    finishReason: String(event?.choices?.[0]?.finish_reason || '').trim().toUpperCase() || null,
  }
}

export function extractAiStreamText(provider, event, streamFormat) {
  return extractAiStreamEvent(provider, event, streamFormat).content
}
