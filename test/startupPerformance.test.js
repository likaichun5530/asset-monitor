import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const viteSource = await readFile(new URL('../vite.config.js', import.meta.url), 'utf8')
const vercelConfig = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))

test('生产构建拆分稳定的 React 和图表依赖', () => {
  assert.match(viteSource, /'react-vendor': \['react', 'react-dom', 'react-router-dom'\]/)
  assert.match(viteSource, /'chart-vendor': \['recharts'\]/)
})

test('带哈希的静态资源使用长期不可变缓存', () => {
  const assetRule = vercelConfig.headers.find((rule) => rule.source === '/assets/(.*)')
  assert.ok(assetRule)
  assert.ok(assetRule.headers.some(({ key, value }) => key === 'Cache-Control' && value === 'public, max-age=31536000, immutable'))
})

test('PWA 静态资源只通过构建产物规则收集一次', () => {
  assert.doesNotMatch(viteSource, /includeAssets/)
  assert.match(viteSource, /globPatterns/)
})
