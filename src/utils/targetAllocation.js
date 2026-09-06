import {
  TARGET_ABSOLUTE_DEVIATION,
  TARGET_RELATIVE_DEVIATION,
  getTargetAdjustmentAmount,
  getTargetAllowedRange,
  getTargetDeviation,
} from '../../shared/allocation.js'

export { TARGET_ABSOLUTE_DEVIATION, TARGET_RELATIVE_DEVIATION, getTargetAdjustmentAmount, getTargetAllowedRange }

export function getTargetAllocationStatus(currentRatio, targetRatio) {
  const result = getTargetDeviation(currentRatio, targetRatio)
  return {
    status: result.status,
    absoluteDiff: result.difference,
    relativeDiff: result.relativeDifference,
    triggeredBy: result.triggeredBy,
  }
}

// 偏差尺以目标为固定中心，表达相对于目标的偏离，而不是绝对占比进度。
export function getTargetTrackPositions(currentRatio, targetRatio, allowedRange, rangeHalfWidth = 25) {
  if (!allowedRange) return null
  const rangeStart = 50 - rangeHalfWidth
  const rangeEnd = 50 + rangeHalfWidth
  const current = Number.isFinite(currentRatio) ? currentRatio : 0
  const target = Number.isFinite(targetRatio) ? targetRatio : allowedRange.lower
  const lowerTolerance = Math.max(target - allowedRange.lower, 0.0001)
  const upperTolerance = Math.max(allowedRange.upper - target, 0.0001)
  const relativePosition = current <= target
    ? 50 - ((target - current) / lowerTolerance) * rangeHalfWidth
    : 50 + ((current - target) / upperTolerance) * rangeHalfWidth
  return {
    rangeStart,
    rangeEnd,
    currentPosition: Math.min(98.5, Math.max(1.5, relativePosition)),
    targetPosition: 50,
  }
}
