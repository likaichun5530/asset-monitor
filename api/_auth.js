import crypto from 'crypto'

function authError(statusCode, message, code) {
  return Object.assign(new Error(message), { statusCode, code })
}

function jwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim()
  if (!secret) {
    throw authError(503, '服务端 JWT_SECRET 未配置', 'AUTH_CONFIGURATION_ERROR')
  }
  return secret
}

function signatureFor(input, secret) {
  return crypto.createHmac('sha256', secret).update(input).digest()
}

export function secureTextEqual(actual, expected) {
  const actualHash = crypto.createHash('sha256').update(String(actual ?? '')).digest()
  const expectedHash = crypto.createHash('sha256').update(String(expected ?? '')).digest()
  return crypto.timingSafeEqual(actualHash, expectedHash)
}

export function signAuthToken(payload) {
  const secret = jwtSecret()
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = signatureFor(`${headerB64}.${payloadB64}`, secret).toString('base64url')
  return `${headerB64}.${payloadB64}.${signature}`
}

export function requireAuth(req) {
  // 配置校验必须先于 token 校验，JWT_SECRET 缺失时所有私人接口 fail closed。
  const secret = jwtSecret()
  const authorization = String(req.headers?.authorization || '')
  const token = /^Bearer\s+/i.test(authorization) ? authorization.replace(/^Bearer\s+/i, '').trim() : ''
  const parts = token.split('.')
  if (parts.length !== 3) throw authError(401, '请重新登录后再操作', 'AUTH_REQUIRED')

  const [headerB64, payloadB64, signatureB64] = parts
  let header
  let payload
  let actualSignature
  try {
    header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'))
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
    actualSignature = Buffer.from(signatureB64, 'base64url')
  } catch {
    throw authError(401, '登录凭据无效', 'AUTH_INVALID')
  }

  if (header?.alg !== 'HS256' || header?.typ !== 'JWT') {
    throw authError(401, '登录凭据无效', 'AUTH_INVALID')
  }
  const expectedSignature = signatureFor(`${headerB64}.${payloadB64}`, secret)
  if (actualSignature.length !== expectedSignature.length || !crypto.timingSafeEqual(actualSignature, expectedSignature)) {
    throw authError(401, '登录凭据无效', 'AUTH_INVALID')
  }

  const now = Math.floor(Date.now() / 1000)
  if (!Number.isFinite(payload?.exp) || payload.exp <= now) {
    throw authError(401, '登录已过期，请重新登录', 'AUTH_EXPIRED')
  }
  if (payload.nbf && payload.nbf > now) throw authError(401, '登录凭据无效', 'AUTH_INVALID')
  if (!payload.username) throw authError(401, '登录凭据无效', 'AUTH_INVALID')
  return payload
}
