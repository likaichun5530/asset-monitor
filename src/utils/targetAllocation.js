export const TARGET_ABSOLUTE_DEVIATION = 0.02
export const TARGET_RELATIVE_DEVIATION = 0.4
const COMPARISON_EPSILON = 1e-12

export function getTargetAllocationStatus(currentRatio, targetRatio) {
  if (!Number.isFinite(currentRatio) || !Number.isFinite(targetRatio)) {
    return {
      status: 'unset',
      absoluteDiff: null,
      relativeDiff: null,
      triggeredBy: null,
    }
  }

  const absoluteDiff = currentRatio - targetRatio
  const relativeDiff = targetRatio > 0 ? absoluteDiff / targetRatio : null
  const absoluteOver = absoluteDiff >= TARGET_ABSOLUTE_DEVIATION - COMPARISON_EPSILON
  const absoluteUnder = absoluteDiff <= -TARGET_ABSOLUTE_DEVIATION + COMPARISON_EPSILON
  const relativeOver = relativeDiff !== null && relativeDiff >= TARGET_RELATIVE_DEVIATION - COMPARISON_EPSILON
  const relativeUnder = relativeDiff !== null && relativeDiff <= -TARGET_RELATIVE_DEVIATION + COMPARISON_EPSILON

  let status = 'balanced'
  if (absoluteOver || relativeOver) status = 'over'
  else if (absoluteUnder || relativeUnder) status = 'under'

  const absoluteTriggered = absoluteOver || absoluteUnder
  const relativeTriggered = relativeOver || relativeUnder
  const triggeredBy = absoluteTriggered && relativeTriggered
    ? 'both'
    : absoluteTriggered
      ? 'absolute'
      : relativeTriggered
        ? 'relative'
        : null

  return { status, absoluteDiff, relativeDiff, triggeredBy }
}

export function getTargetAdjustmentAmount(marketValue, totalMarketValue, targetRatio) {
  if (!Number.isFinite(marketValue) || !Number.isFinite(totalMarketValue) || !Number.isFinite(targetRatio)) {
    return null
  }
  return totalMarketValue * targetRatio - marketValue
}
