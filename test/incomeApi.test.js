import test from 'node:test'
import assert from 'node:assert/strict'
import handler, { createIncomeHandler } from '../lib/income-handler.js'
import { requireAuth } from '../api/_auth.js'
import { signAuthToken } from '../api/_auth.js'
process.env.JWT_SECRET = 'test-only-income-secret'
process.env.AUTH_USERNAME = 'income-test'
const sample = { unit: 'CNY_cents', years: [{year: 2025, categories: {工资: 100}, total: 100, without_fund: 100, complete: true}] }
function response() { return { headers: {}, setHeader(k,v) {this.headers[k]=v}, writeHead(s,h) {this.status=s;Object.assign(this.headers,h)}, end(b) {this.body=b} } }
test('income rejects unauthenticated access and disallows writes', async () => {
  const res=response(); await handler({method:'GET',headers:{}},res)
  assert.equal(res.status,401); assert.equal(res.headers['Cache-Control'],'private, no-store')
  const write=response();await handler({method:'POST',headers:{}},write);assert.equal(write.status,401)
})
test('income returns verified snapshot only after existing auth', async () => {
  process.env.INCOME_SNAPSHOT_JSON=JSON.stringify({ ...sample, snapshotAt: '2026-11-01T10:00:00.000Z' })
  process.env.INCOME_SNAPSHOT_AT='2026-01-01'
  const token=signAuthToken({username:'income-test',exp:Math.floor(Date.now()/1000)+60})
  const authenticatedHandler = createIncomeHandler(req => requireAuth(req, { loadAuthConfig: async () => ({ initialized: false }) }))
  const res=response();await authenticatedHandler({method:'GET',headers:{authorization:`Bearer ${token}`}},res)
  assert.equal(res.status,200)
  const body=JSON.parse(res.body);assert.equal(body.years[0].total,100);assert.equal(body.source,'snapshot');assert.equal(body.monthlyAvailable,false)
  assert.equal(body.snapshotAt,'2026-11-01T10:00:00.000Z')
  delete process.env.INCOME_SNAPSHOT_JSON
  delete process.env.INCOME_SNAPSHOT_AT
})
