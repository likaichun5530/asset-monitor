import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = p => readFileSync(new URL('../'+p, import.meta.url),'utf8')
test('income update date is below amount, without duplicate timestamp row',()=>{
 const source=read('src/pages/Income.jsx')
 assert.doesNotMatch(source,/数据更新时间：/)
 assert.match(source,/income-year-total[\s\S]*更新于 \{formatDateLong\(data.snapshotAt.slice\(0,10\)\)\}/)
 assert.match(source,/import \{ formatDateLong \}/)
})
test('income entry reuses target outlined button',()=>{
 assert.match(read('src/pages/Income.jsx'),/<TargetEditButton onClick=.*>录入<\/TargetEditButton>/)
})
test('only hero-to-following-content spacing adds eight pixels',()=>{
 assert.match(read('src/index.css'),/\.home-hero-composite \{\s*padding-bottom: 8px;\s*\}/)
 assert.match(read('src/index.css'),/padding-bottom: 0;\s*margin-bottom: 8px;/)
})
