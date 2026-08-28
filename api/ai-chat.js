import { isConfigured } from './_google.js'
import { requireAuth } from './_auth.js'
import { readJsonBody } from './_http.js'
import { buildAssetAiContext } from './_ai-context.js'
import { createDeepSeekStream, normalizeAiMessages } from './_deepseek.js'
import { readAiRules } from './_ai-rules.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    requireAuth(req)
    if (process.env.AI_ASSISTANT_ENABLED === 'false') return json(res, 503, { error: 'AI 助手已在服务端关闭' })
    if (!process.env.DEEPSEEK_API_KEY) return json(res, 503, { error: 'DeepSeek API 尚未配置' })
    if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })
    const body = await readJsonBody(req)
    const messages = normalizeAiMessages(body.messages)
    if (!messages.length || messages.at(-1).role !== 'user') return json(res, 400, { error: '请输入需要分析的问题' })
    const page = String(body.page || '/').slice(0, 80)
    const [context, rules] = await Promise.all([buildAssetAiContext(page), readAiRules()])
    if (!context.holdings.length && !context.history.length) return json(res, 422, { error: '没有可供 AI 分析的资产数据' })
    const { response, model } = await createDeepSeekStream(context, messages, rules)

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'X-AI-Model': model,
      'X-Asset-As-Of': context.dataAsOf || '',
    })
    res.flushHeaders?.()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line.startsWith('data:')) continue
        const data = line.slice(5).trim()
        if (!data || data === '[DONE]') continue
        try {
          const event = JSON.parse(data)
          const content = event.choices?.[0]?.delta?.content
          if (content) res.write(content)
        } catch {
          // 忽略不完整或非 JSON 的供应商事件
        }
      }
    }
    return res.end()
  } catch (error) {
    if (res.headersSent) return res.end('\n\nAI回答中断，请稍后重试。')
    return json(res, error.statusCode || 500, { error: error.message || 'AI 分析失败' })
  }
}
