import { apiUrl } from './api.js'

export const AI_ENABLED_KEY = 'youshu-ai-enabled'
export const AI_CONSENT_KEY = 'youshu-ai-consent'
export const AI_MESSAGES_KEY = 'youshu-ai-messages'
export const AI_SETTING_EVENT = 'youshu-ai-setting-changed'

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

export async function streamAiChat(messages, page, onChunk, { signal } = {}) {
  const token = localStorage.getItem('youshu-auth-token') || ''
  if (!token) throw new Error('请先登录实盘账户')
  let response
  try {
    response = await fetch(apiUrl('ai-chat'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ messages: messages.slice(-8), page }),
      signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
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
  return {
    model: response.headers.get('X-AI-Model') || 'DeepSeek',
    dataAsOf: response.headers.get('X-Asset-As-Of') || null,
  }
}
