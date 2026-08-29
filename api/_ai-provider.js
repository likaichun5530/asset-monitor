import { createDeepSeekStream } from './_deepseek.js'
import { createGeminiStream, extractGeminiText } from './_gemini.js'

export const AI_PROVIDERS = Object.freeze({
  deepseek: Object.freeze({ id: 'deepseek', label: 'DeepSeek' }),
  gemini: Object.freeze({ id: 'gemini', label: 'Google Gemini' }),
})
export const DEFAULT_AI_PROVIDER = 'deepseek'

export function normalizeAiProvider(value) {
  const provider = String(value || DEFAULT_AI_PROVIDER).trim().toLowerCase()
  if (!AI_PROVIDERS[provider]) {
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

export async function createAiStream(providerValue, context, messages, rules) {
  const provider = normalizeAiProvider(providerValue)
  const result = provider === 'gemini'
    ? await createGeminiStream(context, messages, rules)
    : await createDeepSeekStream(context, messages, rules)
  return { ...result, provider }
}

export function extractAiStreamText(provider, event) {
  if (provider === 'gemini') return extractGeminiText(event)
  return String(event?.choices?.[0]?.delta?.content || '')
}
