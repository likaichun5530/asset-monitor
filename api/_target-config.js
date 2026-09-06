import { normalizeTargetCategory, TARGET_CATEGORIES } from '../shared/targetCategories.js'

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
