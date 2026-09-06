import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { findStrategyColumn, parseTargetStrategies, serializeTargetConfig, sheetColumnName, validateTargetConfig, validateTargetStrategy } from '../api/_target-config.js'
import { parseTargetMap } from '../api/_allocation.js'
import { TARGET_CATEGORIES } from '../shared/targetCategories.js'

const VALID_TARGETS = [25, 15, 5, 5, 15, 10, 10, 5, 10]
  .map((targetPercent, index) => ({ category: TARGET_CATEGORIES[index], targetPercent }))

test('目标配置仅接受完整九类且合计为 100%', () => {
  const result = validateTargetConfig(VALID_TARGETS)
  assert.equal(result.length, TARGET_CATEGORIES.length)
  assert.equal(result.reduce((sum, item) => sum + item.targetRatio, 0), 1)
  assert.throws(() => validateTargetConfig(VALID_TARGETS.slice(0, -1)), /缺少目标类别/)
  assert.throws(() => validateTargetConfig(VALID_TARGETS.map((item, index) => index === 0 ? { ...item, targetPercent: 26 } : item)), /合计必须为 100%/)
})

test('目标配置拒绝未知类别、重复类别和超过两位小数', () => {
  assert.throws(() => validateTargetConfig([...VALID_TARGETS.slice(0, -1), { category: '其他', targetPercent: 10 }]), /不支持的资产类别/)
  assert.throws(() => validateTargetConfig([...VALID_TARGETS, VALID_TARGETS[0]]), /资产类别重复/)
  assert.throws(() => validateTargetConfig(VALID_TARGETS.map((item, index) => index === 0 ? { ...item, targetPercent: 25.001 } : item)), /最多保留两位小数/)
})

test('目标配置序列化和工作表列定位保持百分比口径', () => {
  const map = new Map(VALID_TARGETS.map((item) => [item.category, item.targetPercent / 100]))
  assert.deepEqual(serializeTargetConfig(map), VALID_TARGETS)
  assert.equal(sheetColumnName(1), 'B')
  assert.equal(sheetColumnName(26), 'AA')
})

test('target 表英文类别兼容为 APP 使用的中文资产类别', () => {
  const sheet = {
    headers: ['类别', '当前金额', '当前占比', '配置目标', '配置思路'],
    data: [
      { 类别: 'Bond', 配置目标: '15%' },
      { 类别: 'Gold', 配置目标: '10%' },
      { 类别: 'Future', 配置目标: '5%' },
      { 类别: 'Cash', 配置目标: '10%' },
    ],
    rawRows: [
      ['Bond', '', '', '15%', '稳健配置'],
      ['Gold', '', '', '10%', '对冲风险'],
      ['Future', '', '', '5%', '控制保证金'],
      ['Cash', '', '', '10%', '保留流动性'],
    ],
  }
  const targets = parseTargetMap(sheet)
  assert.equal(targets.get('债基'), 0.15)
  assert.equal(targets.get('黄金'), 0.1)
  assert.equal(targets.get('期货'), 0.05)
  assert.equal(targets.get('现金'), 0.1)
  assert.equal(findStrategyColumn(sheet.headers), 4)
  assert.equal(parseTargetStrategies(sheet).get('现金'), '保留流动性')
})

test('配置思路允许留空但限制类别和长度', () => {
  assert.deepEqual(validateTargetStrategy('Gold', '  长期对冲  '), { category: '黄金', strategy: '长期对冲' })
  assert.deepEqual(validateTargetStrategy('现金', ''), { category: '现金', strategy: '' })
  assert.throws(() => validateTargetStrategy('其他', '测试'), /不支持的资产类别/)
  assert.throws(() => validateTargetStrategy('黄金', 'a'.repeat(2001)), /不能超过 2000/)
})

test('目标页面提供统一弹窗编辑入口并通过现有 target 接口保存', async () => {
  const page = await readFile(new URL('../src/pages/Target.jsx', import.meta.url), 'utf8')
  const dialog = await readFile(new URL('../src/components/TargetConfigDialog.jsx', import.meta.url), 'utf8')
  const detailDialog = await readFile(new URL('../src/components/TargetDetailDialog.jsx', import.meta.url), 'utf8')
  const api = await readFile(new URL('../api/target.js', import.meta.url), 'utf8')
  assert.match(page, /调整目标/)
  assert.match(page, /<TargetConfigDialog/)
  assert.match(dialog, /<AppDialog/)
  assert.match(dialog, /saveTargetConfig/)
  assert.match(page, /setDetailCategory\(r\.category\)/)
  assert.match(page, /<TargetDetailDialog/)
  assert.match(detailDialog, /配置符合度/)
  assert.match(detailDialog, /saveTargetStrategy/)
  assert.match(api, /\['GET', 'PUT'\]/)
  assert.match(api, /invalidateAiDataCache\('target'\)/)
})
