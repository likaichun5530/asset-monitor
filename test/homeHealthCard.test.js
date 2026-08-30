import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('账户健康度使用三段风险尺并标出当前保证金区间', async () => {
  const source = await readFile(new URL('../src/components/HomeOverviewCards.jsx', import.meta.url), 'utf8')

  assert.match(source, /marginRiskMarkerPosition/)
  assert.match(source, /bg-emerald-500/)
  assert.match(source, /bg-amber-400/)
  assert.match(source, /bg-red-500/)
  assert.match(source, /安全 ≤70%/)
  assert.match(source, /警戒 70–75%/)
  assert.match(source, /危险 &gt;75%/)
  assert.match(source, /保证金风险：\$\{usageText\}/)
})
