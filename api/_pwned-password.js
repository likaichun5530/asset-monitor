import crypto from 'node:crypto'

const PWNED_PASSWORDS_RANGE_URL = 'https://api.pwnedpasswords.com/range/'
const DEFAULT_TIMEOUT_MS = 5_000

function lookupError(message, cause) {
  return Object.assign(new Error(message), {
    statusCode: 503,
    code: 'PASSWORD_BREACH_CHECK_UNAVAILABLE',
    ...(cause ? { cause } : {}),
  })
}

// SHA-1 仅用于 HIBP k-anonymity 范围查询，不用于保存或验证登录密码。
export async function getPwnedPasswordCount(password, {
  fetchImpl = fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
} = {}) {
  const hash = crypto.createHash('sha1').update(String(password), 'utf8').digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  let response
  try {
    response = await fetchImpl(PWNED_PASSWORDS_RANGE_URL + prefix, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'asset-monitor-password-security',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw lookupError('密码泄漏检查暂时不可用，请稍后重试', error)
  }
  if (!response.ok) {
    throw lookupError('密码泄漏检查暂时不可用，请稍后重试')
  }

  const body = await response.text()
  for (const line of body.split(/\r?\n/)) {
    const separator = line.indexOf(':')
    if (separator < 0) continue
    if (line.slice(0, separator).trim().toUpperCase() !== suffix) continue
    const count = Number(line.slice(separator + 1).trim())
    return Number.isFinite(count) && count > 0 ? count : 0
  }
  return 0
}

export async function assertPasswordNotPwned(password, options) {
  const count = await getPwnedPasswordCount(password, options)
  if (count > 0) {
    throw Object.assign(
      new Error('该密码已出现在公开泄漏数据中，请使用密码管理器生成全新的随机密码'),
      { statusCode: 400, code: 'PASSWORD_COMPROMISED' }
    )
  }
}
