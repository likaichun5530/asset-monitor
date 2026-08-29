// Vercel Function: POST /api/auth/login
import { secureTextEqual, signAuthToken } from '../_auth.js'
import { readJsonBody, setPrivateResponseHeaders } from '../_http.js'
import {
  clearLoginFailures,
  loginFailureDelay,
  loginRateLimitStatus,
  registerLoginFailure,
} from '../_login-rate-limit.js'

function json(res, status, body, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  return res.end(JSON.stringify(body))
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default async function handler(req, res) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const authUsername = String(process.env.AUTH_USERNAME || '')
  const authPassword = String(process.env.AUTH_PASSWORD || '')
  if (!String(process.env.JWT_SECRET || '').trim()) return json(res, 503, { error: '服务端 JWT_SECRET 未配置' })
  if (!authUsername || !authPassword) return json(res, 503, { error: '服务端登录凭据未配置' })

  let credentials
  try {
    credentials = await readJsonBody(req)
  } catch {
    return json(res, 400, { error: '请求体必须是有效的 JSON' })
  }
  const username = String(credentials?.username || '')
  const password = String(credentials?.password || '')
  const rateLimit = loginRateLimitStatus(req, username)
  if (rateLimit.blocked) {
    return json(res, 429, { error: '登录尝试过于频繁，请稍后再试' }, { 'Retry-After': String(rateLimit.retryAfter) })
  }

  // 位运算符确保用户名和密码都完成恒定时间摘要比较，不因用户名错误提前返回。
  const credentialsValid = secureTextEqual(username, authUsername) & secureTextEqual(password, authPassword)
  if (!credentialsValid) {
    const failure = registerLoginFailure(req, username)
    await delay(loginFailureDelay(failure.failures))
    if (failure.blocked) {
      return json(res, 429, { error: '登录尝试过于频繁，请稍后再试' }, { 'Retry-After': String(failure.retryAfter) })
    }
    return json(res, 401, { error: '用户名或密码错误' })
  }

  clearLoginFailures(req, username)
  const now = Math.floor(Date.now() / 1000)
  const token = signAuthToken({ username: authUsername, iat: now, exp: now + 86400 * 30 })
  return json(res, 200, { ok: true, token, username: authUsername })
}
