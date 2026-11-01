import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
test('income and asset trends share axes, units, margins and card padding', () => {
 for (const file of ['src/pages/Income.jsx', 'src/components/TrendChart.jsx']) {
  const page = read(file)
  for (const name of ['TREND_MARGIN', 'TREND_X_AXIS', 'TREND_Y_AXIS', 'TREND_CARD_CLASS', 'toWanNum']) assert.ok(page.includes(name), `${file} must reuse ${name}`)
 }
 const page = read('src/pages/Income.jsx')
 assert.match(page, /cursor=\{false\}/)
 assert.doesNotMatch(page, /amount: row.amount \/ 1000000/)
 assert.match(page, /minTickGap=\{24\}/)
 assert.match(page, /maxBarSize=\{18\}/)
})
