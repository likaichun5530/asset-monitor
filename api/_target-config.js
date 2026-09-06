import { normalizeTargetCategory, TARGET_CATEGORIES } from '../shared/targetCategories.js'
import { toNumber } from './_google.js'

export { normalizeTargetCategory, TARGET_CATEGORIES } from '../shared/targetCategories.js'

function inputError(message) {
  return Object.assign(new Error(message), { statusCode: 400 })
}

export function validateTargetConfig(input) {
  if (!Array.isArray(input)) throw inputError('目标配置格式无效')
  const allowed = new Set(TARGET_CATEGORIES)
  const percentages = new Map()

  for (const item of input) {
    const category = normalizeTargetCategory(item?.category)
    if (!allowed.has(category)) throw inputError(`不支持的资产类别：${category || '空'}`)
    if (percentages.has(category)) throw inputError(`资产类别重复：${category}`)
    const percentage = Number(item?.targetPercent)
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw inputError(`${category}的目标比例必须在 0%～100% 之间`)
    }
    const percentageCents = Math.round(percentage * 100)
    if (Math.abs(percentage * 100 - percentageCents) > 1e-7) {
      throw inputError(`${category}的目标比例最多保留两位小数`)
    }
    percentages.set(category, percentageCents)
  }

  const missing = TARGET_CATEGORIES.filter((category) => !percentages.has(category))
  if (missing.length) throw inputError(`缺少目标类别：${missing.join('、')}`)
  const totalCents = [...percentages.values()].reduce((sum, value) => sum + value, 0)
  if (totalCents !== 10_000) throw inputError('各类资产目标比例合计必须为 100%')

  return TARGET_CATEGORIES.map((category) => ({
    category,
    targetPercent: percentages.get(category) / 100,
    targetRatio: percentages.get(category) / 10_000,
  }))
}

export function serializeTargetConfig(targetMap) {
  return TARGET_CATEGORIES.map((category) => ({
    category,
    targetPercent: Math.round((targetMap.get(category) || 0) * 10_000) / 100,
  }))
}

export function validateTargetStrategy(categoryValue, strategyValue) {
  const category = normalizeTargetCategory(categoryValue)
  if (!TARGET_CATEGORIES.includes(category)) throw inputError(`不支持的资产类别：${category || '空'}`)
  const strategy = String(strategyValue ?? '').trim()
  if (strategy.length > 2000) throw inputError('配置思路不能超过 2000 个字符')
  return { category, strategy }
}

export function normalizeTargetGroupCategory(value) {
  const label = String(value ?? '').trim()
  if (label === '基金') return '债基'
  return normalizeTargetCategory(label)
}

function normalizeDetailName(value) {
  return String(value ?? '').trim().toLocaleUpperCase('zh-CN')
}

export function parseTargetGroups(result) {
  if (!result?.headers?.length) return []
  const groups = []
  for (let nameColumnIndex = 3; nameColumnIndex < result.headers.length; nameColumnIndex += 3) {
    const label = String(result.headers[nameColumnIndex] || '').trim()
    const category = normalizeTargetGroupCategory(label)
    if (!label || !TARGET_CATEGORIES.includes(category)) continue
    const targetColumnIndex = nameColumnIndex + 1
    const items = []
    for (let rowIndex = 0; rowIndex < (result.rawRows || []).length; rowIndex += 1) {
      const name = String(result.rawRows[rowIndex]?.[nameColumnIndex] || '').trim()
      if (!name || name === '合计') continue
      const targetRatio = toNumber(result.rawRows[rowIndex]?.[targetColumnIndex])
      if (targetRatio === null) continue
      items.push({ name, targetRatio, rowNumber: rowIndex + 2 })
    }
    groups.push({ category, label, nameColumnIndex, targetColumnIndex, items })
  }
  return groups
}

export function findTargetGroup(result, categoryValue) {
  const category = normalizeTargetGroupCategory(categoryValue)
  return parseTargetGroups(result).find((group) => group.category === category) || null
}

export function validateTargetGroup(categoryValue, input, result) {
  const group = findTargetGroup(result, categoryValue)
  if (!group) throw inputError('该资产类别没有细分目标配置')
  if (!Array.isArray(input)) throw inputError('细分目标格式无效')
  const existing = new Map(group.items.map((item) => [normalizeDetailName(item.name), item]))
  const values = new Map()
  let totalCents = 0
  for (const item of input) {
    const key = normalizeDetailName(item?.name)
    const sheetItem = existing.get(key)
    if (!sheetItem) throw inputError(`target 表中找不到细分项目：${String(item?.name || '空')}`)
    if (values.has(key)) throw inputError(`细分项目重复：${sheetItem.name}`)
    const percentage = Number(item?.targetPercent)
    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      throw inputError(`${sheetItem.name}的目标比例必须在 0%～100% 之间`)
    }
    const percentageCents = Math.round(percentage * 100)
    if (Math.abs(percentage * 100 - percentageCents) > 1e-7) {
      throw inputError(`${sheetItem.name}的目标比例最多保留两位小数`)
    }
    totalCents += percentageCents
    values.set(key, { ...sheetItem, targetPercent: percentageCents / 100, targetRatio: percentageCents / 10_000 })
  }
  if (values.size !== existing.size) throw inputError('请完整填写该类别现有的全部细分目标')
  if (totalCents > 10_000) throw inputError('细分目标比例合计不能超过 100%')
  return { group, items: group.items.map((item) => values.get(normalizeDetailName(item.name))), totalPercent: totalCents / 100 }
}

export function findStrategyColumn(headers = []) {
  return headers.findIndex((header) => /配置思路|配置说明|投资思路|配置备注/.test(String(header)))
}

export function parseTargetStrategies(result) {
  const strategies = new Map()
  if (!result?.headers?.length) return strategies
  const strategyColumnIndex = findStrategyColumn(result.headers)
  if (strategyColumnIndex < 0) return strategies
  for (const row of result.rawRows || []) {
    const category = normalizeTargetCategory(row?.[0])
    if (TARGET_CATEGORIES.includes(category)) strategies.set(category, String(row?.[strategyColumnIndex] || '').trim())
  }
  return strategies
}

export function serializeTargetDetails(targetMap, strategyMap = new Map()) {
  return serializeTargetConfig(targetMap).map((item) => ({
    ...item,
    strategy: strategyMap.get(item.category) || '',
  }))
}

export function sheetColumnName(index) {
  if (!Number.isInteger(index) || index < 0) throw new Error('工作表列索引无效')
  let value = index + 1
  let name = ''
  while (value > 0) {
    value -= 1
    name = String.fromCharCode(65 + (value % 26)) + name
    value = Math.floor(value / 26)
  }
  return name
}
