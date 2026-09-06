import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { serializeTargetConfig, sheetColumnName, validateTargetConfig } from '../api/_target-config.js'
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

test('目标页面提供统一弹窗编辑入口并通过现有 target 接口保存', async () => {
  const page = await readFile(new URL('../src/pages/Target.jsx', import.meta.url), 'utf8')
  const dialog = await readFile(new URL('../src/components/TargetConfigDialog.jsx', import.meta.url), 'utf8')
  const api = await readFile(new URL('../api/target.js', import.meta.url), 'utf8')
  assert.match(page, /调整目标/)
  assert.match(page, /<TargetConfigDialog/)
  assert.match(dialog, /<AppDialog/)
  assert.match(dialog, /saveTargetConfig/)
  assert.match(api, /\['GET', 'PUT'\]/)
  assert.match(api, /invalidateAiDataCache\('target'\)/)
})
