// Vercel Function: POST /api/auth/login
import { assertJwtConfigured, secureTextEqual, signAuthToken } from '../_auth.js'
import { DEFAULT_TOKEN_VERSION, getAuthConfig } from '../_auth-config.js'
import { readJsonBody, setPrivateResponseHeaders } from '../_http.js'
import { verifyPassword } from '../_password.js'
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

export async function handleLogin(req, res, { loadAuthConfig = getAuthConfig } = {}) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  const authUsername = String(process.env.AUTH_USERNAME || '')
  const authPassword = String(process.env.AUTH_PASSWORD || '')
  try {
    assertJwtConfigured()
  } catch (error) {
    return json(res, error.statusCode || 503, { error: error.message || '服务端认证配置错误' })
  }
  if (!authUsername) return json(res, 503, { error: '服务端登录用户名未配置' })

  let authConfig
  try {
    authConfig = await loadAuthConfig()
  } catch (error) {
    return json(res, error.statusCode || 503, { error: error.statusCode ? error.message : '认证配置读取失败' })
  }
  if (authConfig.initialized && !secureTextEqual(authConfig.username, authUsername)) {
    return json(res, 503, { error: 'AuthConfig 用户名与服务端配置不一致' })
  }
  if (!authConfig.initialized && !authPassword) {
    return json(res, 503, { error: '服务端登录密码未配置' })
  }

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

  // 用户名错误时仍完成密码校验，避免通过响应耗时判断用户名是否存在。
  const passwordValid = authConfig.initialized
    ? await verifyPassword(password, authConfig.passwordHash, authConfig.passwordSalt)
    : secureTextEqual(password, authPassword)
  const credentialsValid = Boolean(secureTextEqual(username, authUsername) & passwordValid)
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
  const tokenVersion = authConfig.initialized ? authConfig.tokenVersion : DEFAULT_TOKEN_VERSION
  const token = signAuthToken({ username: authUsername, tokenVersion, iat: now, exp: now + 86400 * 30 })
  return json(res, 200, { ok: true, token, username: authUsername })
}

export default function handler(req, res) {
  return handleLogin(req, res)
}
