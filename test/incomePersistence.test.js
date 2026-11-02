import test from 'node:test'
import assert from 'node:assert/strict'
const storage = new Map()
globalThis.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,String(v)), removeItem: k => storage.delete(k) }
const token = (username, iat = 1, exp = Date.now()/1000+3600) => `header.${Buffer.from(JSON.stringify({username,iat,exp})).toString('base64url')}.signature`
const fresh = () => import(`../src/utils/api.js?cold=${Math.random()}`)
test('late background income cannot overwrite a verified edit', async () => {
 const api = await fresh()
 localStorage.setItem(api.AUTH_STORAGE_KEY, token('synthetic-edit'))
 let release
 globalThis.fetch=()=>new Promise(resolve=>{release=resolve})
 const request=api.getApiJson('income',{forceRefresh:true})
 const saved={years:[{year:2026,total:456}],source:'live'}
 api.cacheIncome(saved)
 release(new Response(JSON.stringify({years:[{year:2026,total:123}]})))
 await request
 assert.deepEqual((await fresh()).getCachedIncome(),saved)
})
test('income persists across cold module startup and token rotation, isolates users and clears on logout/401', async () => {
 const api = await fresh()
 localStorage.setItem(api.AUTH_STORAGE_KEY, token('synthetic-a'))
 const data = { years: [{year:2026,total:123}], source:'live' }
 api.cacheIncome(data)
 const cold = await fresh()
 assert.deepEqual(cold.getCachedIncome(), data)
 localStorage.setItem(api.AUTH_STORAGE_KEY, token('synthetic-a',2))
 assert.deepEqual(cold.getCachedIncome(), data)
 assert.ok(![...storage.keys()].some(k=>k.includes('signature')))
 localStorage.setItem(api.AUTH_STORAGE_KEY, token('synthetic-b'))
 assert.equal(cold.getCachedIncome(),null)
 cold.cacheIncome(data)
 cold.clearPrivateApiCache()
 assert.equal((await fresh()).getCachedIncome(),null)
 cold.cacheIncome(data)
 globalThis.fetch = async()=>new Response('{}',{status:401})
 await cold.apiFetch('income')
 assert.equal((await fresh()).getCachedIncome(),null)
})
