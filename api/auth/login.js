// Vercel Function: POST /api/auth/login
import crypto from 'crypto'

const AUTH_USERNAME = process.env.AUTH_USERNAME || ''
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || ''
const JWT_SECRET = process.env.JWT_SECRET || 'youshu-default-secret-change-me'

function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = base64url(Buffer.from(JSON.stringify(header)))
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload)))
  const signature = base64url(
    crypto.createHmac('sha256', JWT_SECRET).update(`${headerB64}.${payloadB64}`).digest()
  )
  return `${headerB64}.${payloadB64}.${signature}`
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: 'Method not allowed' }))
  }

  if (!AUTH_USERNAME || !AUTH_PASSWORD) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '未配置登录凭据' }))
  }

  let body = ''
  for await (const chunk of req) body += chunk
  const { username, password } = JSON.parse(body)

  if (username !== AUTH_USERNAME || password !== AUTH_PASSWORD) {
    res.writeHead(401, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify({ error: '用户名或密码错误' }))
  }

  const token = signToken({
    username,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 30,
  })

  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify({ ok: true, token, username }))
}