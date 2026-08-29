import { requireAuth } from './_auth.js'
import { isConfigured } from './_google.js'
import { readJsonBody, setPrivateResponseHeaders } from './_http.js'
import { DEFAULT_AI_RULES, MAX_AI_RULES_LENGTH, readAiRules, writeAiRules } from './_ai-rules.js'

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
    if (req.method === 'GET') {
      const rules = await readAiRules()
      return json(res, 200, { rules, defaultRules: DEFAULT_AI_RULES, maxLength: MAX_AI_RULES_LENGTH })
    }
    const body = await readJsonBody(req)
    const rules = await writeAiRules(body.rules)
    return json(res, 200, { rules, savedAt: new Date().toISOString() })
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message || 'AI 规则保存失败' })
  }
}
