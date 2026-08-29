import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTH_STORAGE_KEY,
  apiFetch,
  clearPrivateApiCache,
  getApiJson,
  invalidateApiCache,
  requestApiJson,
} from '../src/utils/api.js'

const storage = new Map()
globalThis.localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key),
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function resetCache(token = 'session-a') {
  storage.set(AUTH_STORAGE_KEY, token)
  clearPrivateApiCache()
  invalidateApiCache(['holdings', 'history', 'target', 'market', 'futures'])
}

test('短 TTL GET 缓存复用结果，强制刷新会绕过缓存', async () => {
  resetCache()
  let calls = 0
  globalThis.fetch = async () => jsonResponse({ call: ++calls })

  const first = await getApiJson('holdings')
  const cached = await getApiJson('holdings')
  const refreshed = await getApiJson('holdings', { forceRefresh: true })

  assert.equal(first.call, 1)
  assert.equal(cached.call, 1)
  assert.equal(refreshed.call, 2)
  assert.equal(calls, 2)
})

test('强制刷新会同时失效同一资源的查询参数变体', async () => {
  resetCache()
  let calls = 0
  globalThis.fetch = async () => jsonResponse({ call: ++calls })

  await getApiJson('holdings')
  await getApiJson('holdings?editor=1')
  await getApiJson('holdings', { forceRefresh: true })
  await getApiJson('holdings?editor=1')
  assert.equal(calls, 4)
})

test('并发 GET 继续共享同一个在途请求', async () => {
  resetCache()
  let calls = 0
  let resolveFetch
  globalThis.fetch = () => {
    calls += 1
    return new Promise((resolve) => { resolveFetch = () => resolve(jsonResponse({ ok: true })) })
  }

  const first = getApiJson('holdings')
  const second = getApiJson('holdings')
  assert.equal(first, second)
  assert.equal(calls, 1)
  resolveFetch()
  await Promise.all([first, second])
})

test('Holdings 写入后立即失效 holdings 和 target，且写请求本身不缓存', async () => {
  resetCache()
  const calls = { holdings: 0, target: 0, writes: 0 }
  globalThis.fetch = async (url, options = {}) => {
    const resource = String(url).includes('/target') ? 'target' : 'holdings'
    if (options.method === 'POST') {
      calls.writes += 1
      return jsonResponse({ ok: true })
    }
    calls[resource] += 1
    return jsonResponse({ resource, call: calls[resource] })
  }

  await getApiJson('holdings')
  await getApiJson('target')
  await requestApiJson('holdings', { method: 'POST' })
  await requestApiJson('holdings', { method: 'POST' })
  const holdings = await getApiJson('holdings')
  const target = await getApiJson('target')

  assert.equal(calls.writes, 2)
  assert.equal(holdings.call, 2)
  assert.equal(target.call, 2)
})

test('Snapshot 和 History 修改会失效 History 缓存，生产默认不周期缓存 History', async () => {
  resetCache()
  let historyReads = 0
  globalThis.fetch = async (url, options = {}) => {
    if (options.method && options.method !== 'GET') return jsonResponse({ ok: true })
    historyReads += 1
    return jsonResponse({ read: historyReads })
  }

  await getApiJson('history')
  await getApiJson('history')
  assert.equal(historyReads, 2)

  await getApiJson('history', { cacheTtlMs: 10_000 })
  await requestApiJson('snapshot', { method: 'POST' })
  await getApiJson('history', { cacheTtlMs: 10_000 })
  await requestApiJson('history', { method: 'PUT' })
  await getApiJson('history', { cacheTtlMs: 10_000 })
  assert.equal(historyReads, 5)
})

test('私人缓存按登录 token 隔离，清理私人缓存不会清理公开行情缓存', async () => {
  resetCache('session-a')
  let calls = 0
  const observed = []
  globalThis.fetch = async (url, options = {}) => {
    calls += 1
    observed.push({ url: String(url), authorization: new Headers(options.headers).get('Authorization') })
    return jsonResponse({ call: calls })
  }

  await getApiJson('holdings')
  storage.set(AUTH_STORAGE_KEY, 'session-b')
  await getApiJson('holdings')
  await getApiJson('market', { auth: false })
  clearPrivateApiCache()
  await getApiJson('market', { auth: false })
  await getApiJson('holdings')

  assert.equal(calls, 4)
  assert.equal(observed[0].authorization, 'Bearer session-a')
  assert.equal(observed[1].authorization, 'Bearer session-b')
  assert.ok(observed.every(({ url }) => !url.includes('session-')))
})

test('当前会话 401 会清理 token，旧会话迟到的 401 不影响新登录', async () => {
  resetCache('session-current')
  globalThis.fetch = async () => jsonResponse({ error: 'unauthorized' }, 401)
  await apiFetch('holdings')
  assert.equal(storage.has(AUTH_STORAGE_KEY), false)

  resetCache('session-old')
  let resolveFetch
  globalThis.fetch = () => new Promise((resolve) => { resolveFetch = resolve })
  const oldRequest = apiFetch('holdings')
  storage.set(AUTH_STORAGE_KEY, 'session-new')
  resolveFetch(jsonResponse({ error: 'unauthorized' }, 401))
  await oldRequest
  assert.equal(storage.get(AUTH_STORAGE_KEY), 'session-new')
})
