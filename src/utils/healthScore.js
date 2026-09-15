import { getTargetTolerance } from '../../shared/allocation.js'

const valid = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
const noDetailTarget = (category) => ['现金', '期货', '黄金'].includes(category)
const optionalOther = (item) => /^(其他|其它|other|others)$/i.test(String(item?.name || '').trim()) && !valid(item.targetRatio)
const points = (value) => Number(value.toFixed(2))

export function calculateHealthScore({ targetRows = [], targetDetails = [], icMarginUsageRate = 0, holdingsAvailable = true } = {}) {
  const dataWarnings = []
  const rows = targetRows.filter((row) => !row.isTotal)
  if (!holdingsAvailable) dataWarnings.push('持仓数据不可用')
  if (!rows.length) dataWarnings.push('配置目标数据不可用')
  function evaluate(row, name, multiplier) {
    if (!valid(row.targetRatio) || !valid(row.currentRatio)) {
      dataWarnings.push(`${name}：目标或实际占比未配置`)
      return null
    }
    const target = Number(row.targetRatio)
    const current = Number(row.currentRatio)
    const tolerance = getTargetTolerance(target)
    const excess = Math.max(0, Math.abs(current - target) - tolerance)
    if (excess < 1e-12) return null
    const deduction = excess * 100 * multiplier
    return { deduction, text: `${name}：实际 ${points(current * 100)}%，目标 ${points(target * 100)}%，容忍 ${points(tolerance * 100)} 个百分点，超额 ${points(excess * 100)} 个百分点，扣 ${points(deduction)} 分` }
  }
  const major = rows.map((row) => evaluate(row, row.category || row.name || '未命名分类', 2.5)).filter(Boolean)
  if (rows.some((row) => !noDetailTarget(row.category || row.name)) && !targetDetails.length) dataWarnings.push('细分配置数据不可用')
  const details = targetDetails.flatMap((detail) => {
    if (noDetailTarget(detail.category)) return []
    if (!detail?.allocation?.items?.length) {
      dataWarnings.push(`${detail.category}：细分目标未配置`)
      return []
    }
    const parent = rows.find((row) => (row.category || row.name) === detail.category)
    if (!parent || !valid(parent.targetRatio) || !valid(parent.currentRatio)) {
      dataWarnings.push(`${detail.category}：大类权重数据不可用`)
      return []
    }
    const weight = Math.max(0, Number(parent.targetRatio), Number(parent.currentRatio))
    return (detail?.allocation?.items || []).filter((item) => !optionalOther(item)).map((item) => evaluate(item, `${detail.category} · ${item.name}`, weight * 1.5)).filter(Boolean)
  })
  const majorDeduction = Math.min(50, major.reduce((sum, item) => sum + item.deduction, 0))
  const detailDeduction = Math.min(30, details.reduce((sum, item) => sum + item.deduction, 0))
  const marginAvailable = valid(icMarginUsageRate) && Number(icMarginUsageRate) >= 0
  if (!marginAvailable) dataWarnings.push('IC 保证金数据不完整')
  const usage = marginAvailable ? Number(icMarginUsageRate) : 0
  const marginDeduction = Math.min(60, Math.min(Math.max(usage - 70, 0), 5) + Math.min(Math.max(usage - 75, 0), 5) * 2 + Math.max(usage - 80, 0) * 3)
  const score = Math.round(Math.max(5, 100 - majorDeduction - detailDeduction - marginDeduction))
  return { score, majorDeduction, detailDeduction, marginDeduction, majorIssues: major.map((item) => item.text), detailIssues: details.map((item) => item.text), majorIssueCount: major.length, detailIssueCount: details.length, dataWarnings: [...new Set(dataWarnings)] }
}
