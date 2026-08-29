import { requireAuth } from './_auth.js'
import { isConfigured } from './_google.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { MAX_AI_MODELS, readAiModels, writeAiModels } from './_ai-models.js'

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
  if (!['GET', 'PUT'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' })

  try {
    await requireAuth(req)
    if (!isConfigured()) return json(res, 503, { error: 'Google Sheets 未配置' })
    if (req.method === 'GET') return json(res, 200, { models: await readAiModels({ initialize: true }), maxModels: MAX_AI_MODELS })
    const body = await readJsonBody(req)
    return json(res, 200, { models: await writeAiModels(body.models), savedAt: new Date().toISOString() })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'AI 模型清单保存失败' })
  }
}
