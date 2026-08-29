import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { requireAuth, signAuthToken } from '../api/_auth.js'
import loginHandler, { handleLogin } from '../api/auth/login.js'
import holdingsHandler from '../api/holdings.js'
import historyHandler from '../api/history.js'
import snapshotAutoHandler from '../api/snapshot-auto.js'
import {
  loginRateLimitStatus,
  registerLoginFailure,
  resetLoginRateLimitForTests,
} from '../api/_login-rate-limit.js'

const TEST_SECRET = crypto.randomBytes(32).toString('hex')
const TEST_PASSWORD = crypto.randomBytes(20).toString('hex')
const UNINITIALIZED_AUTH = Object.freeze({ initialized: false, tokenVersion: 1 })
const loadUninitializedAuth = async () => UNINITIALIZED_AUTH

function mockResponse() {
  return {
    statusCode: null,
    headers: {},
    body: '',
    writeHead(statusCode, headers = {}) { this.statusCode = statusCode; Object.assign(this.headers, headers) },
    setHeader(name, value) { this.headers[name.toLowerCase()] = value },
    end(chunk = '') { this.body += chunk; return this },
    json(body) { this.body = JSON.stringify(body); return this },
    status(statusCode) { this.statusCode = statusCode; return this },
  }
}

function request(method, { body, authorization, ip = '203.0.113.10' } = {}) {
  return {
    method,
    body,
    headers: {
      ...(authorization ? { authorization } : {}),
      'x-forwarded-for': ip,
    },
  }
}

function withAuthEnvironment(values, fn) {
  const names = ['JWT_SECRET', 'AUTH_USERNAME', 'AUTH_PASSWORD']
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  for (const name of names) {
    if (values[name] === undefined) delete process.env[name]
    else process.env[name] = values[name]
  }
  return Promise.resolve(fn()).finally(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name]
      else process.env[name] = previous[name]
    }
  })
}

test('JWT_SECRET 未配置时拒绝签发和验证 token', async () => {
  await withAuthEnvironment({ JWT_SECRET: undefined }, () => {
    assert.throws(() => signAuthToken({ username: 'owner', exp: Date.now() / 1000 + 60 }), /JWT_SECRET 未配置/)
    return assert.rejects(requireAuth(request('GET')), (error) => error.statusCode === 503)
  })
})

test('无 token 和无效 token 访问私人 API 返回 401', async () => {
  await withAuthEnvironment({ JWT_SECRET: TEST_SECRET }, async () => {
    for (const handler of [holdingsHandler, historyHandler]) {
      const missing = mockResponse()
      await handler(request('GET'), missing)
      assert.equal(missing.statusCode, 401)
      assert.equal(missing.headers['cache-control'], 'private, no-store')

      const invalid = mockResponse()
      await handler(request('GET', { authorization: 'Bearer invalid.token.value' }), invalid)
      assert.equal(invalid.statusCode, 401)
    }
  })
})

test('有效 token 可通过鉴权并让私人 API 继续执行', async () => {
  await withAuthEnvironment({ JWT_SECRET: TEST_SECRET, AUTH_USERNAME: 'owner' }, async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = signAuthToken({ username: 'owner', tokenVersion: 1, iat: now, exp: now + 60 })
    assert.equal((await requireAuth(
      request('GET', { authorization: `Bearer ${token}` }),
      { loadAuthConfig: loadUninitializedAuth }
    )).username, 'owner')

    // 测试环境没有 Google 凭据；503 说明请求已越过鉴权并进入后续配置检查。
    for (const handler of [holdingsHandler, historyHandler]) {
      const response = mockResponse()
      await handler(request('GET', { authorization: `Bearer ${token}` }), response)
      assert.equal(response.statusCode, 503)
      assert.match(response.body, /Google Sheets 未配置/)
    }
  })
})

test('登录凭据或 JWT 配置缺失时安全失败', async () => {
  await withAuthEnvironment({ JWT_SECRET: undefined, AUTH_USERNAME: 'owner', AUTH_PASSWORD: TEST_PASSWORD }, async () => {
    const response = mockResponse()
    await loginHandler(request('POST', { body: { username: 'owner', password: TEST_PASSWORD } }), response)
    assert.equal(response.statusCode, 503)
    assert.match(response.body, /JWT_SECRET 未配置/)
  })

  await withAuthEnvironment({ JWT_SECRET: TEST_SECRET, AUTH_USERNAME: undefined, AUTH_PASSWORD: undefined }, async () => {
    const response = mockResponse()
    await loginHandler(request('POST', { body: { username: 'owner', password: TEST_PASSWORD } }), response)
    assert.equal(response.statusCode, 503)
    assert.match(response.body, /登录用户名未配置/)
  })
})

test('正确登录签发可验证 token，错误信息不泄露用户名存在性', async () => {
  await withAuthEnvironment({
    JWT_SECRET: TEST_SECRET,
    AUTH_USERNAME: 'owner',
    AUTH_PASSWORD: TEST_PASSWORD,
  }, async () => {
    resetLoginRateLimitForTests()
    const invalid = mockResponse()
    await handleLogin(
      request('POST', { body: { username: 'unknown', password: `${TEST_PASSWORD}-invalid` } }),
      invalid,
      { loadAuthConfig: loadUninitializedAuth }
    )
    assert.equal(invalid.statusCode, 401)
    assert.equal(JSON.parse(invalid.body).error, '用户名或密码错误')

    const valid = mockResponse()
    await handleLogin(
      request('POST', { body: { username: 'owner', password: TEST_PASSWORD } }),
      valid,
      { loadAuthConfig: loadUninitializedAuth }
    )
    assert.equal(valid.statusCode, 200)
    const data = JSON.parse(valid.body)
    assert.equal((await requireAuth(
      request('GET', { authorization: `Bearer ${data.token}` }),
      { loadAuthConfig: loadUninitializedAuth }
    )).username, 'owner')
  })
})

test('连续登录失败在当前 serverless 暖实例内触发限流', () => {
  resetLoginRateLimitForTests()
  const req = request('POST', { ip: '198.51.100.20' })
  const start = 1_000_000
  for (let index = 0; index < 5; index += 1) registerLoginFailure(req, 'owner', start + index)
  const status = loginRateLimitStatus(req, 'owner', start + 10)
  assert.equal(status.blocked, true)
  assert.ok(status.retryAfter > 0)
})

test('定时快照拒绝缺失配置和伪造的 Vercel Cron 头', async () => {
  const previous = process.env.CRON_SECRET
  try {
    delete process.env.CRON_SECRET
    const missingConfig = mockResponse()
    await snapshotAutoHandler(request('GET'), missingConfig)
    assert.equal(missingConfig.statusCode, 503)

    process.env.CRON_SECRET = crypto.randomBytes(32).toString('hex')
    const forged = mockResponse()
    const forgedRequest = request('GET')
    forgedRequest.headers['x-vercel-cron'] = '1'
    await snapshotAutoHandler(forgedRequest, forged)
    assert.equal(forged.statusCode, 401)
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = previous
  }
})

test('前端私人请求统一添加 Authorization 并集中处理 401', () => {
  const apiClient = fs.readFileSync(new URL('../src/utils/api.js', import.meta.url), 'utf8')
  const dataStore = fs.readFileSync(new URL('../src/utils/dataStore.js', import.meta.url), 'utf8')
  const aiClient = fs.readFileSync(new URL('../src/utils/ai.js', import.meta.url), 'utf8')
  assert.match(apiClient, /requestHeaders\.set\('Authorization'/)
  assert.match(apiClient, /response\.status === 401/)
  assert.doesNotMatch(dataStore, /Authorization\s*:/)
  assert.doesNotMatch(aiClient, /Authorization\s*:/)
})
