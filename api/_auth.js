import crypto from 'crypto'

const JWT_SECRET = process.env.JWT_SECRET || 'youshu-default-secret-change-me'

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function requireAuth(req) {
  const header = String(req.headers?.authorization || '')
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  const parts = token.split('.')
  if (parts.length !== 3) throw Object.assign(new Error('请重新登录后再操作'), { statusCode: 401 })

  const [headerB64, payloadB64, signature] = parts
  const expected = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest()
  )
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw Object.assign(new Error('登录凭据无效'), { statusCode: 401 })
  }

  let payload
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'))
  } catch {
    throw Object.assign(new Error('登录凭据无效'), { statusCode: 401 })
  }
  if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw Object.assign(new Error('登录已过期，请重新登录'), { statusCode: 401 })
  }
  return payload
}
