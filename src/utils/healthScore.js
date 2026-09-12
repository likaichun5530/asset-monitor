import { getTargetAllocationStatus, getTargetAllowedRange } from './targetAllocation.js'

const MIN_SCORE = 5

function isOtherItem(item) {
  return /^(其他|其它|other|others)$/i.test(String(item?.name || '').trim())
}

function isOutOfRange(currentRatio, targetRatio) {
  const status = getTargetAllocationStatus(currentRatio, targetRatio).status
  return status === 'over' || status === 'under'
}

function hasTarget(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

function issueSeverity(currentRatio, targetRatio) {
  const current = Number(currentRatio)
  const target = Number(targetRatio)
  const range = getTargetAllowedRange(target)
  if (!range) return { level: 'severe', label: '严重' }
  const allowedDistance = current < target ? target - range.lower : range.upper - target
  const multiple = allowedDistance > 0 ? Math.abs(current - target) / allowedDistance : Infinity
  if (multiple <= 1.5) return { level: 'minor', label: '轻微' }
  if (multiple <= 2.5) return { level: 'moderate', label: '明显' }
  return { level: 'severe', label: '严重' }
}

function issueDeduction(severity, kind) {
  if (kind === 'major') return { minor: 4, moderate: 6, severe: 9 }[severity.level]
  return { minor: 1, moderate: 2, severe: 4 }[severity.level]
}

export function calculateHealthScore({ targetRows = [], targetDetails = [], icMarginUsageRate = 0 } = {}) {
  const majorIssueDetails = targetRows.filter((row) => (
    !row.isTotal
    && hasTarget(row.targetRatio)
    && isOutOfRange(Number(row.currentRatio), Number(row.targetRatio))
  )).map((row) => {
    const severity = issueSeverity(row.currentRatio, row.targetRatio)
    return { name: row.category || row.name || '未命名分类', severity: severity.label, deduction: issueDeduction(severity, 'major') }
  })

  const detailIssueDetails = targetDetails.flatMap((detail) => (
    (detail?.allocation?.items || []).filter((item) => (
      !isOtherItem(item)
      && hasTarget(item.targetRatio)
      && isOutOfRange(Number(item.currentRatio), Number(item.targetRatio))
    )).map((item) => {
      const severity = issueSeverity(item.currentRatio, item.targetRatio)
      return { name: `${detail.category ? `${detail.category} · ` : ''}${item.name}`, severity: severity.label, deduction: issueDeduction(severity, 'detail') }
    })
  ))

  const majorIssues = majorIssueDetails.map((item) => `${item.name}（${item.severity}，-${item.deduction}）`)
  const detailIssues = detailIssueDetails.map((item) => `${item.name}（${item.severity}，-${item.deduction}）`)
  const majorIssueCount = majorIssueDetails.length
  const detailIssueCount = detailIssueDetails.length

  const majorDeduction = Math.min(majorIssueDetails.reduce((sum, item) => sum + item.deduction, 0), 50)
  const detailDeduction = Math.min(detailIssueDetails.reduce((sum, item) => sum + item.deduction, 0), 30)
  const marginDeduction = icMarginUsageRate > 85 ? 30 : icMarginUsageRate > 75 ? 20 : icMarginUsageRate > 70 ? 12 : 0
  const score = Math.max(MIN_SCORE, Math.min(100, 100 - majorDeduction - detailDeduction - marginDeduction))

  return { score, majorIssues, detailIssues, majorIssueCount, detailIssueCount, majorDeduction, detailDeduction, marginDeduction }
}
