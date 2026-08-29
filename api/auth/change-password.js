import { requireAuth, secureTextEqual } from '../_auth.js'
import { DEFAULT_TOKEN_VERSION, getAuthConfig, writeAuthConfig } from '../_auth-config.js'
import { readJsonBody, setPrivateResponseHeaders } from '../_http.js'
import { hashPassword, validateNewPassword, verifyPassword } from '../_password.js'
import { assertPasswordNotPwned } from '../_pwned-password.js'

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(body))
}

export async function handleChangePassword(req, res, {
  loadAuthConfig = getAuthConfig,
  saveAuthConfig = writeAuthConfig,
  checkPasswordCompromised = assertPasswordNotPwned,
} = {}) {
  setPrivateResponseHeaders(res)
  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    return res.end()
  }
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' })

  try {
    const auth = await requireAuth(req, { loadAuthConfig })
    let body
    try {
      body = await readJsonBody(req)
    } catch {
      return json(res, 400, { error: '请求体必须是有效的 JSON' })
    }
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    if (!currentPassword) return json(res, 400, { error: '请输入当前密码' })
    validateNewPassword(newPassword)

    const authPassword = String(process.env.AUTH_PASSWORD || '')
    if (!auth.authConfig.initialized && !authPassword) {
      return json(res, 503, { error: '服务端登录密码未配置' })
    }
    const currentPasswordValid = auth.authConfig.initialized
      ? await verifyPassword(currentPassword, auth.authConfig.passwordHash, auth.authConfig.passwordSalt)
      : secureTextEqual(currentPassword, authPassword)
    if (!currentPasswordValid) return json(res, 401, { error: '当前密码错误' })
    if (secureTextEqual(newPassword, currentPassword)) {
      return json(res, 400, { error: '新密码不能与当前密码相同' })
    }

    await checkPasswordCompromised(newPassword)
    const { passwordHash, passwordSalt } = await hashPassword(newPassword)
    const tokenVersion = (auth.authConfig.initialized
      ? auth.authConfig.tokenVersion
      : DEFAULT_TOKEN_VERSION) + 1
    await saveAuthConfig({
      username: String(process.env.AUTH_USERNAME || ''),
      passwordHash,
      passwordSalt,
      tokenVersion,
      updatedAt: new Date().toISOString(),
    })
    return json(res, 200, { ok: true, message: '密码修改成功，请重新登录' })
  } catch (error) {
    const status = error.statusCode || 500
    const message = error.statusCode ? error.message : '密码保存失败，请稍后重试'
    return json(res, status, { error: message })
  }
}

export default function handler(req, res) {
  return handleChangePassword(req, res)
}
