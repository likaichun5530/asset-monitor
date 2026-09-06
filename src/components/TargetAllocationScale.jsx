import { getTargetAllowedRange, getTargetTrackPositions } from '../utils/targetAllocation.js'

function percent(value) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : '未设置'
}

function getRangeRuleLabel(targetRatio) {
  return targetRatio > 0 && targetRatio * 0.4 < 0.02 ? '目标比例 ±40%' : '±2 个百分点'
}

export function getTargetCardTone(status) {
  if (status === 'over') return 'bg-gradient-to-b from-red-100/90 via-red-50/60 to-red-50/25 dark:from-red-500/[0.20] dark:via-red-500/[0.10] dark:to-red-500/[0.04]'
  if (status === 'under') return 'bg-gradient-to-b from-green-100/90 via-green-50/60 to-green-50/25 dark:from-green-500/[0.20] dark:via-green-500/[0.10] dark:to-green-500/[0.04]'
  return 'bg-white dark:bg-gray-800'
}

export default function TargetAllocationScale({ currentRatio, targetRatio, diff, status, color = '#3b82f6', label = '配置' }) {
  const hasTarget = targetRatio !== null && targetRatio !== undefined && Number.isFinite(Number(targetRatio))
  if (!hasTarget) {
    return <div className="mt-3 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">设置计划目标后，这里会显示合理区间。</div>
  }

  const allowedRange = getTargetAllowedRange(Number(targetRatio))
  const track = getTargetTrackPositions(Number(currentRatio), Number(targetRatio), allowedRange, 18)
  const pointColor = status === 'over' ? '#ef4444' : status === 'under' ? '#10b981' : color
  const valueClass = status === 'over' ? 'text-red-500' : status === 'under' ? 'text-green-600' : 'text-gray-700 dark:text-gray-200'
  const difference = Number.isFinite(Number(diff)) ? Number(diff) : Number(currentRatio) - Number(targetRatio)
  const rangeRuleLabel = getRangeRuleLabel(Number(targetRatio))

  return (
    <div className="mt-3 px-1">
      <div className="relative h-[68px]" aria-label={`${label}偏离目标范围尺：当前 ${percent(currentRatio)}，目标 ${percent(targetRatio)}，合理区间 ${percent(allowedRange.lower)} 至 ${percent(allowedRange.upper)}`}>
        <span className="sr-only">合理区间按 {rangeRuleLabel} 计算，低配线 {percent(allowedRange.lower)}，超配线 {percent(allowedRange.upper)}</span>
        <span className="absolute left-0 top-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">低配</span>
        <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-semibold text-gray-700 dark:text-gray-200">目标</span>
        <span className="absolute right-0 top-0 text-[10px] font-medium text-gray-400 dark:text-gray-500">超配</span>
        <div className="absolute inset-x-0 top-[30px] h-px bg-gray-300 dark:bg-gray-600" aria-hidden="true" />
        <div className="absolute top-[23px] h-[15px] rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-100/70 dark:bg-emerald-500/10 dark:ring-emerald-400/10" style={{ left: `${track.rangeStart}%`, width: `${Math.max(track.rangeEnd - track.rangeStart, 1)}%` }} aria-label="合理区间" />
        <div className="absolute top-[17px] h-7 w-px -translate-x-1/2 bg-gray-800 dark:bg-gray-100" style={{ left: `${track.targetPosition}%` }} aria-label="目标中心位置" />
        <div className="absolute top-[30px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-sm transition-all dark:border-gray-800" style={{ left: `${track.currentPosition}%`, backgroundColor: pointColor }} aria-label={`当前配置 ${percent(currentRatio)}`} />
        <span className="absolute top-[44px] -translate-x-1/2 whitespace-nowrap text-[9px] font-medium" style={{ left: `${Math.min(96, Math.max(4, track.currentPosition))}%`, color: pointColor }}>当前</span>
      </div>
      <div className="grid grid-cols-3 border-t border-gray-100 pt-2 text-center dark:border-gray-700/80">
        <div><div className="text-[10px] text-gray-400">当前</div><div className={`font-num mt-0.5 text-sm font-medium ${valueClass}`}>{percent(currentRatio)}</div></div>
        <div><div className="text-[10px] text-gray-400">目标</div><div className="font-num mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{percent(targetRatio)}</div></div>
        <div><div className="text-[10px] text-gray-400">偏差</div><div className={`font-num mt-0.5 text-sm font-medium ${valueClass}`}>{`${difference > 0 ? '+' : ''}${(difference * 100).toFixed(1)}%`}</div></div>
      </div>
    </div>
  )
}
