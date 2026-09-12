import { getTargetAllocationStatus } from './targetAllocation.js'

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

export function calculateHealthScore({ targetRows = [], targetDetails = [], icMarginUsageRate = 0 } = {}) {
  const majorIssueCount = targetRows.filter((row) => (
    !row.isTotal
    && hasTarget(row.targetRatio)
    && isOutOfRange(Number(row.currentRatio), Number(row.targetRatio))
  )).length

  const detailIssueCount = targetDetails.reduce((count, detail) => {
    const issues = (detail?.allocation?.items || []).filter((item) => (
      !isOtherItem(item)
      && hasTarget(item.targetRatio)
      && isOutOfRange(Number(item.currentRatio), Number(item.targetRatio))
    )).length
    return count + issues
  }, 0)

  const majorDeduction = Math.min(majorIssueCount * 6, 50)
  const detailDeduction = Math.min(detailIssueCount * 2, 30)
  const marginDeduction = icMarginUsageRate > 75 ? 30 : icMarginUsageRate > 70 ? 12 : 0
  const score = Math.max(MIN_SCORE, Math.min(100, 100 - majorDeduction - detailDeduction - marginDeduction))

  return { score, majorIssueCount, detailIssueCount, majorDeduction, detailDeduction, marginDeduction }
}

export function healthScoreColor(score) {
  if (score < 60) return 'text-red-500'
  if (score < 80) return 'text-amber-500'
  return 'text-emerald-600 dark:text-emerald-400'
}
