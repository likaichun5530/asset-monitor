import crypto from 'crypto'

const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const MAX_TRACKED_KEYS = 1000

// Vercel Functions 不保证同一实例处理后续请求，因此该 Map 只能在单个暖实例内
// 提供 best-effort 防护，不能冒充跨实例严格限流。严格全局限流应由 Vercel Firewall
// 或外部 KV 完成；当前项目按要求不引入新的持久化基础设施。
const attempts = new Map()

function requestIp(req) {
  const forwarded = req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || ''
  return String(forwarded).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
}

function attemptKey(req, username) {
  const identity = `${requestIp(req)}\n${String(username || '').trim().toLowerCase()}`
  return crypto.createHash('sha256').update(identity).digest('hex')
}

function prune(now) {
  for (const [key, entry] of attempts) {
    if (entry.blockedUntil <= now && now - entry.firstFailureAt > WINDOW_MS) attempts.delete(key)
  }
  if (attempts.size <= MAX_TRACKED_KEYS) return
  const oldest = [...attempts.entries()].sort((a, b) => a[1].firstFailureAt - b[1].firstFailureAt)
  for (const [key] of oldest.slice(0, attempts.size - MAX_TRACKED_KEYS)) attempts.delete(key)
}

export function loginRateLimitStatus(req, username, now = Date.now()) {
  prune(now)
  const entry = attempts.get(attemptKey(req, username))
  if (!entry || entry.blockedUntil <= now) return { blocked: false, retryAfter: 0 }
  return { blocked: true, retryAfter: Math.max(1, Math.ceil((entry.blockedUntil - now) / 1000)) }
}

export function registerLoginFailure(req, username, now = Date.now()) {
  const key = attemptKey(req, username)
  const previous = attempts.get(key)
  const entry = !previous || now - previous.firstFailureAt > WINDOW_MS
    ? { failures: 0, firstFailureAt: now, blockedUntil: 0 }
    : previous
  entry.failures += 1
  if (entry.failures >= MAX_FAILURES) entry.blockedUntil = now + BLOCK_MS
  attempts.set(key, entry)
  return {
    failures: entry.failures,
    blocked: entry.blockedUntil > now,
    retryAfter: entry.blockedUntil > now ? Math.ceil((entry.blockedUntil - now) / 1000) : 0,
  }
}

export function clearLoginFailures(req, username) {
  attempts.delete(attemptKey(req, username))
}

export function loginFailureDelay(failures) {
  return Math.min(1000, 150 * (2 ** Math.max(0, Number(failures || 1) - 1)))
}

export function resetLoginRateLimitForTests() {
  attempts.clear()
}
