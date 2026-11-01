// Shared by asset and income charts: keep mobile gutters and axis geometry in sync.
export const TREND_MARGIN = { top: 24, right: 12, bottom: 0, left: 0 }
export const TREND_CARD_CLASS = 'card pb-[1px] sm:pb-6 px-[1px] sm:px-6'
const tick = { fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif', fontSize: 12, fontWeight: 500, fill: '#94a3b8' }
export const TREND_X_AXIS = { tick, tickLine: false, axisLine: { stroke: '#e2e8f0' } }
export const TREND_Y_AXIS = { tick, tickLine: false, axisLine: false, width: 44 }
export const toWanNum = value => (Number(value) / 10000).toFixed(0)

// Compress only a fully understood consecutive month list; preserve unknown/gapped coverage.
export function compactCoverage(coverage) {
  const text = String(coverage || '')
  if (!/^\d{1,2}月(?:[、，,]\s*\d{1,2}月)+$/.test(text)) return text
  const months = text.match(/\d+/g).map(Number)
  if (months.some((m, i) => m < 1 || m > 12 || (i > 0 && m !== months[i - 1] + 1))) return text
  return `${months[0]}—${months.at(-1)}月`
}
