import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import historyHandler from '../api/history.js'

process.env.JWT_SECRET = 'test-only-routing-secret'

function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v }, writeHead(s, h) { this.status = s; Object.assign(this.headers, h) }, end(body) { this.body = body } }
}

test('income keeps its public URL without adding a thirteenth function', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)))
  assert.ok(config.rewrites?.some(r => r.source === '/api/income' && r.destination === '/api/history?resource=income'))
  const entries = readdirSync(new URL('../api/', import.meta.url), { recursive: true }).filter(p => p.endsWith('.js') && !p.split('/').some(part => part.startsWith('_')))
  assert.equal(entries.length, 12)
  const server = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
  assert.ok(server.includes("['/api/income', '../lib/income-handler.js']"))
})

test('history dispatches income with unchanged authentication and read-only semantics', async () => {
  const unauth = response()
  await historyHandler({ method: 'GET', query: { resource: 'income' }, headers: {} }, unauth)
  assert.equal(unauth.status, 401)
  assert.equal(unauth.headers['Cache-Control'], 'private, no-store')
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const res = response()
    await historyHandler({ method, query: { resource: 'income' }, headers: {} }, res)
    assert.equal(res.status, method === 'DELETE' ? 405 : 401)
  }
  const options = response()
  await historyHandler({ method: 'OPTIONS', query: { resource: 'income' }, headers: {} }, options)
  assert.equal(options.status, 204)
})

test('original history routes keep their original behavior', async () => {
  for (const query of [{}, { resource: 'other' }]) {
    const write = response()
    await historyHandler({ method: 'POST', query, headers: {} }, write)
    assert.equal(write.status, 405)
    assert.equal(JSON.parse(write.body).error, 'Method not allowed')
    const read = response()
    await historyHandler({ method: 'GET', query, headers: {} }, read)
    assert.equal(read.status, 401)
  }
})
