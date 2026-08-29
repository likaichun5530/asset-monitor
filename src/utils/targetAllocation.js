import {
  TARGET_ABSOLUTE_DEVIATION,
  TARGET_RELATIVE_DEVIATION,
  getTargetAdjustmentAmount,
  getTargetDeviation,
} from '../../shared/allocation.js'

export { TARGET_ABSOLUTE_DEVIATION, TARGET_RELATIVE_DEVIATION, getTargetAdjustmentAmount }

export function getTargetAllocationStatus(currentRatio, targetRatio) {
  const result = getTargetDeviation(currentRatio, targetRatio)
  return {
    status: result.status,
    absoluteDiff: result.difference,
    relativeDiff: result.relativeDifference,
    triggeredBy: result.triggeredBy,
  }
}
