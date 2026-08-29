import { isConfigured } from './_google.js'
import { requireAuth } from './_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { buildAssetAiContext } from './_ai-context.js'
import { normalizeAiMessages } from './_deepseek.js'
import { createAiStream, extractAiStreamEvent } from './_ai-provider.js'
import { readAiRules } from './_ai-rules.js'
import { createSseDataParser, readStreamWithDeadline } from './_ai-stream.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    await requireAuth(req)
    if (process.env.AI_ASSISTANT_ENABLED === 'false') return json(res, 503, { error: 'AI 助手已在服务端关闭' })
    if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })
    const body = await readJsonBody(req)
    const messages = normalizeAiMessages(body.messages)
    if (!messages.length || messages.at(-1).role !== 'user') return json(res, 400, { error: '请输入需要分析的问题' })
    const page = String(body.page || '/').slice(0, 80)
    const [context, rules] = await Promise.all([buildAssetAiContext(page), readAiRules()])
    if (!context.holdings.length && !context.history.length) return json(res, 422, { error: '没有可供 AI 分析的资产数据' })
    const selection = { provider: body.provider, model: body.model }
    const { response, model, provider, selectionId, fallback, streamTimeoutMs = 110_000 } = await createAiStream(selection, context, messages, rules)

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store, no-transform',
      'X-Content-Type-Options': 'nosniff',
      'X-AI-Model': model,
      'X-AI-Provider': provider,
      'X-AI-Selection': selectionId,
      'X-AI-Fallback': fallback ? 'true' : 'false',
      'X-Asset-As-Of': context.dataAsOf || '',
    })
    res.flushHeaders?.()

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let finishReason = null
    const parser = createSseDataParser((event) => {
      const parsed = extractAiStreamEvent(provider, event)
      if (parsed.content) res.write(parsed.content)
      if (parsed.finishReason) finishReason = parsed.finishReason
    })
    await readStreamWithDeadline(reader, streamTimeoutMs, (value) => {
      parser.push(decoder.decode(value, { stream: true }))
    })
    parser.finish(decoder.decode())
    if (finishReason === 'MAX_TOKENS') {
      console.warn('AI stream finished at token limit', { provider, model, finishReason })
      res.write('\n\n（回答达到长度上限）')
    } else if (finishReason && finishReason !== 'STOP') {
      console.warn('AI stream ended with non-standard reason', { provider, model, finishReason })
    }
    return res.end()
  } catch (error) {
    if (res.headersSent) {
      console.warn('AI stream interrupted', { statusCode: error.statusCode || 500, code: error.code || 'AI_STREAM_ERROR' })
      return res.end('\n\nAI回答中断，请稍后重试。')
    }
    console.warn('AI request failed before streaming', { statusCode: error.statusCode || 500, code: error.code || 'AI_REQUEST_ERROR' })
    return json(res, error.statusCode || 500, { error: error.message || 'AI 分析失败' })
  }
}
