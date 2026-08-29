import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createAuthConfigStore } from '../api/_auth-config.js'
import { requireAuth, signAuthToken } from '../api/_auth.js'
import { hashPassword, validateNewPassword, verifyPassword } from '../api/_password.js'
import { assertPasswordNotPwned, getPwnedPasswordCount } from '../api/_pwned-password.js'
import { handleChangePassword } from '../api/auth/change-password.js'
import { handleLogin } from '../api/auth/login.js'
import { validateChangePasswordForm } from '../src/utils/password.js'
import { resetLoginRateLimitForTests } from '../api/_login-rate-limit.js'

const TEST_SECRET = crypto.randomBytes(32).toString('hex')
const OLD_PASSWORD = 'old-password-123'
const NEW_PASSWORD = 'new-password-456'

function mockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(statusCode, headers = {}) { this.statusCode = statusCode; Object.assign(this.headers, headers) },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(chunk = '') { this.body += chunk; return this },
  }
}

function request(method, { body, token, ip = '203.0.113.80' } = {}) {
  return {
    method,
    body,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      'x-forwarded-for': ip,
    },
  }
}

async function withAuthEnvironment(fn) {
  const names = ['JWT_SECRET', 'AUTH_USERNAME', 'AUTH_PASSWORD']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  process.env.JWT_SECRET = TEST_SECRET
  process.env.AUTH_USERNAME = 'owner'
  process.env.AUTH_PASSWORD = OLD_PASSWORD
  try {
    return await fn()
  } finally {
    names.forEach((name) => {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    })
  }
}

function createSheetHarness({ failWrites = false } = {}) {
  let exists = false
  let rows = null
  let reads = 0
  const writes = []
  const store = createAuthConfigStore({
    isConfiguredFn: () => true,
    readSheetFn: async () => {
      reads += 1
      if (!exists) throw new Error('sheet not found')
      if (!rows) return { headers: [], rawRows: [] }
      return { headers: rows[0], rawRows: rows.slice(1) }
    },
    sheetExistsFn: async () => exists,
    ensureSheetFn: async () => { exists = true },
    updateRowsFn: async (sheetName, range, values, options) => {
      writes.push({ sheetName, range, values, options })
      if (failWrites) throw new Error('write failed')
      rows = values.map((row) => [...row])
      return { updatedRange: `${sheetName}!${range}` }
    },
  })
  return {
    store,
    writes,
    getRows: () => rows,
    getReadCount: () => reads,
  }
}

async function login(password, store, ip = '203.0.113.81') {
  const response = mockResponse()
  await handleLogin(request('POST', {
    body: { username: 'owner', password },
    ip,
  }), response, { loadAuthConfig: store.read })
  return response
}

async function changePassword(token, body, store, saveAuthConfig = store.write) {
  const response = mockResponse()
  await handleChangePassword(request('POST', { body, token }), response, {
    loadAuthConfig: store.read,
    saveAuthConfig,
    checkPasswordCompromised: async () => {},
  })
  return response
}

test('前后端密码规则保持一致', () => {
  assert.throws(() => validateNewPassword('12345'), /不能少于 6 位/)
  assert.equal(validateNewPassword('123456'), '123456')
  assert.throws(() => validateNewPassword('      '), /不能全部为空格/)
  assert.throws(() => validateNewPassword('x'.repeat(129)), /不能超过 128 位/)

  assert.equal(validateChangePasswordForm({ currentPassword: 'old', newPassword: '12345', confirmPassword: '12345' }), '新密码不能少于 6 位')
  assert.equal(validateChangePasswordForm({ currentPassword: 'old', newPassword: '      ', confirmPassword: '      ' }), '新密码不能全部为空格')
  assert.equal(validateChangePasswordForm({ currentPassword: '123456', newPassword: '123456', confirmPassword: '123456' }), '新密码不能与当前密码相同')
  assert.equal(validateChangePasswordForm({ currentPassword: 'old', newPassword: '123456', confirmPassword: '123456' }), '')
})

test('scrypt 使用随机 salt，且只接受正确密码', async () => {
  const first = await hashPassword(NEW_PASSWORD)
  const second = await hashPassword(NEW_PASSWORD)
  assert.notEqual(first.passwordSalt, second.passwordSalt)
  assert.notEqual(first.passwordHash, second.passwordHash)
  assert.equal(await verifyPassword(NEW_PASSWORD, first.passwordHash, first.passwordSalt), true)
  assert.equal(await verifyPassword('wrong-password', first.passwordHash, first.passwordSalt), false)
  assert.doesNotMatch(JSON.stringify(first), new RegExp(NEW_PASSWORD))
})

test('泄漏密码检查只发送 SHA-1 前 5 位，并启用响应填充', async () => {
  const password = 'password'
  const expectedHash = '5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8'
  let capturedUrl = ''
  let capturedOptions
  const fetchImpl = async (url, options) => {
    capturedUrl = url
    capturedOptions = options
    return {
      ok: true,
      text: async () => `${expectedHash.slice(5)}:3861493\r\n${'0'.repeat(35)}:0`,
    }
  }

  const count = await getPwnedPasswordCount(password, { fetchImpl })
  assert.equal(count, 3861493)
  assert.equal(capturedUrl, `https://api.pwnedpasswords.com/range/${expectedHash.slice(0, 5)}`)
  assert.doesNotMatch(new URL(capturedUrl).pathname, new RegExp(password, 'i'))
  assert.doesNotMatch(capturedUrl, new RegExp(expectedHash, 'i'))
  assert.equal(capturedOptions.headers['Add-Padding'], 'true')

  await assert.rejects(
    getPwnedPasswordCount(password, { fetchImpl: async () => { throw new Error('offline') } }),
    (error) => error.statusCode === 503 && error.code === 'PASSWORD_BREACH_CHECK_UNAVAILABLE'
  )
})

test('公开泄漏密码会在生成和保存 hash 前被拒绝', async () => {
  await assert.rejects(
    assertPasswordNotPwned('compromised-password', {
      fetchImpl: async () => {
        const hash = crypto.createHash('sha1').update('compromised-password').digest('hex').toUpperCase()
        return { ok: true, text: async () => `${hash.slice(5)}:42` }
      },
    }),
    (error) => error.statusCode === 400 && error.code === 'PASSWORD_COMPROMISED'
  )

  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const harness = createSheetHarness()
    const token = JSON.parse((await login(OLD_PASSWORD, harness.store)).body).token
    const response = mockResponse()
    await handleChangePassword(request('POST', {
      token,
      body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
    }), response, {
      loadAuthConfig: harness.store.read,
      saveAuthConfig: harness.store.write,
      checkPasswordCompromised: async () => {
        throw Object.assign(new Error('该密码已出现在公开泄漏数据中'), {
          statusCode: 400,
          code: 'PASSWORD_COMPROMISED',
        })
      },
    })
    assert.equal(response.statusCode, 400)
    assert.equal(JSON.parse(response.body).code, 'PASSWORD_COMPROMISED')
    assert.equal(harness.writes.length, 0)

    const confirmed = mockResponse()
    await handleChangePassword(request('POST', {
      token,
      body: {
        currentPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        allowCompromisedPassword: true,
      },
    }), confirmed, {
      loadAuthConfig: harness.store.read,
      saveAuthConfig: harness.store.write,
      checkPasswordCompromised: async () => {
        throw Object.assign(new Error('该密码已出现在公开泄漏数据中'), {
          statusCode: 400,
          code: 'PASSWORD_COMPROMISED',
        })
      },
    })
    assert.equal(confirmed.statusCode, 200)
    assert.equal(harness.writes.length, 1)
  })
})

test('泄漏查询不可用时不能通过风险确认绕过', async () => {
  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const harness = createSheetHarness()
    const token = JSON.parse((await login(OLD_PASSWORD, harness.store)).body).token
    const response = mockResponse()
    await handleChangePassword(request('POST', {
      token,
      body: {
        currentPassword: OLD_PASSWORD,
        newPassword: NEW_PASSWORD,
        allowCompromisedPassword: true,
      },
    }), response, {
      loadAuthConfig: harness.store.read,
      saveAuthConfig: harness.store.write,
      checkPasswordCompromised: async () => {
        throw Object.assign(new Error('密码泄漏检查暂时不可用'), {
          statusCode: 503,
          code: 'PASSWORD_BREACH_CHECK_UNAVAILABLE',
        })
      },
    })
    assert.equal(response.statusCode, 503)
    assert.equal(harness.writes.length, 0)
  })
})

test('AuthConfig 不存在时原 AUTH_PASSWORD 可登录，JWT 默认 tokenVersion 为 1', async () => {
  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const { store } = createSheetHarness()
    const response = await login(OLD_PASSWORD, store)
    assert.equal(response.statusCode, 200)
    const token = JSON.parse(response.body).token
    const auth = await requireAuth(request('GET', { token }), { loadAuthConfig: store.read })
    assert.equal(auth.tokenVersion, 1)
  })
})

test('认证配置的 20 秒缓存会复用并发读取，并允许主动刷新', async () => {
  const harness = createSheetHarness()
  const [first, second, third] = await Promise.all([
    harness.store.read(),
    harness.store.read(),
    harness.store.read(),
  ])
  assert.equal(first.initialized, false)
  assert.equal(second, first)
  assert.equal(third, first)
  // SystemSettings 与旧 AuthConfig 各读取一次；并发调用仍共享同一轮读取。
  assert.equal(harness.getReadCount(), 2)

  await harness.store.read({ forceRefresh: true })
  assert.equal(harness.getReadCount(), 4)
})

test('错误当前密码和不合规新密码都会拒绝修改', async () => {
  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const { store } = createSheetHarness()
    const token = JSON.parse((await login(OLD_PASSWORD, store)).body).token

    const wrongCurrent = await changePassword(token, {
      currentPassword: 'wrong-password',
      newPassword: NEW_PASSWORD,
    }, store)
    assert.equal(wrongCurrent.statusCode, 401)

    const tooShort = await changePassword(token, {
      currentPassword: OLD_PASSWORD,
      newPassword: '12345',
    }, store)
    assert.equal(tooShort.statusCode, 400)

    const allSpaces = await changePassword(token, {
      currentPassword: OLD_PASSWORD,
      newPassword: '      ',
    }, store)
    assert.equal(allSpaces.statusCode, 400)

    const same = await changePassword(token, {
      currentPassword: OLD_PASSWORD,
      newPassword: OLD_PASSWORD,
    }, store)
    assert.equal(same.statusCode, 400)
  })
})

test('成功修改后只保存 hash/salt，新旧密码和 JWT 按 tokenVersion 切换', async () => {
  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const harness = createSheetHarness()
    const oldLogin = await login(OLD_PASSWORD, harness.store)
    const oldToken = JSON.parse(oldLogin.body).token

    const changed = await changePassword(oldToken, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    }, harness.store)
    assert.equal(changed.statusCode, 200)
    assert.equal(changed.headers['cache-control'], 'private, no-store')

    const storedText = JSON.stringify(harness.getRows())
    assert.doesNotMatch(storedText, new RegExp(OLD_PASSWORD))
    assert.doesNotMatch(storedText, new RegExp(NEW_PASSWORD))
    assert.match(storedText, /passwordHash/)
    assert.match(storedText, /passwordSalt/)
    assert.match(storedText, /tokenVersion/)
    assert.equal(harness.writes[0].options.valueInputOption, 'RAW')

    const oldPasswordLogin = await login(OLD_PASSWORD, harness.store, '203.0.113.82')
    assert.equal(oldPasswordLogin.statusCode, 401)
    const newPasswordLogin = await login(NEW_PASSWORD, harness.store, '203.0.113.83')
    assert.equal(newPasswordLogin.statusCode, 200)
    const newToken = JSON.parse(newPasswordLogin.body).token

    await assert.rejects(
      requireAuth(request('GET', { token: oldToken }), { loadAuthConfig: harness.store.read }),
      (error) => error.statusCode === 401 && error.code === 'AUTH_TOKEN_VERSION_MISMATCH'
    )
    const newAuth = await requireAuth(request('GET', { token: newToken }), { loadAuthConfig: harness.store.read })
    assert.equal(newAuth.tokenVersion, 2)
    assert.doesNotMatch(JSON.stringify(newAuth), /passwordHash|passwordSalt/)
  })
})

test('tokenVersion 不一致及未登录修改密码均返回 401', async () => {
  await withAuthEnvironment(async () => {
    const hash = await hashPassword(NEW_PASSWORD)
    const config = {
      initialized: true,
      username: 'owner',
      ...hash,
      tokenVersion: 2,
      updatedAt: new Date().toISOString(),
    }
    const now = Math.floor(Date.now() / 1000)
    const oldToken = signAuthToken({ username: 'owner', tokenVersion: 1, iat: now, exp: now + 60 })
    await assert.rejects(
      requireAuth(request('GET', { token: oldToken }), { loadAuthConfig: async () => config }),
      (error) => error.statusCode === 401
    )

    const response = mockResponse()
    await handleChangePassword(request('POST', {
      body: { currentPassword: OLD_PASSWORD, newPassword: NEW_PASSWORD },
    }), response, { loadAuthConfig: async () => config })
    assert.equal(response.statusCode, 401)
  })
})

test('AuthConfig 写入失败时旧密码和旧 token 继续有效', async () => {
  await withAuthEnvironment(async () => {
    resetLoginRateLimitForTests()
    const harness = createSheetHarness({ failWrites: true })
    const oldLogin = await login(OLD_PASSWORD, harness.store, '203.0.113.84')
    const oldToken = JSON.parse(oldLogin.body).token
    const changed = await changePassword(oldToken, {
      currentPassword: OLD_PASSWORD,
      newPassword: NEW_PASSWORD,
    }, harness.store)
    assert.equal(changed.statusCode, 500)
    assert.equal(harness.getRows(), null)

    const config = await harness.store.read({ forceRefresh: true })
    assert.equal(config.initialized, false)
    const oldStillWorks = await login(OLD_PASSWORD, harness.store, '203.0.113.85')
    assert.equal(oldStillWorks.statusCode, 200)
    const auth = await requireAuth(request('GET', { token: oldToken }), { loadAuthConfig: harness.store.read })
    assert.equal(auth.tokenVersion, 1)
  })
})

test('设置页仅通过 password 输入框和请求体提交密码，不写入浏览器存储', async () => {
  const dialog = await readFile(new URL('../src/components/ChangePasswordDialog.jsx', import.meta.url), 'utf8')
  assert.equal((dialog.match(/type="password"/g) || []).length, 3)
  assert.match(dialog, /requestApiJson\('auth\/change-password'/)
  assert.match(dialog, /currentPassword: form\.currentPassword/)
  assert.match(dialog, /newPassword: form\.newPassword/)
  assert.match(dialog, /allowCompromisedPassword: compromisedWarning && allowCompromisedPassword/)
  assert.match(dialog, /requestError\.data\?\.code === 'PASSWORD_COMPROMISED'/)
  assert.match(dialog, /我了解风险，仍然使用这个密码/)
  assert.doesNotMatch(dialog, /localStorage|sessionStorage|console\./)
  assert.match(dialog, /onChanged\(\)/)
})
