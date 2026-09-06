import { formatCurrency } from '../utils/format.js'
import { getTargetAdjustmentAmount, getTargetAllocationStatus, getTargetAllowedRange, getTargetTrackPositions } from '../utils/targetAllocation.js'
import AppDialog from './AppDialog.jsx'

function percent(value, digits = 1) {
  return Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(digits)}%` : '未设置'
}

function statusPresentation(currentRatio, targetRatio) {
  const { status } = getTargetAllocationStatus(currentRatio, targetRatio)
  if (status === 'over') return { label: '超出范围', className: 'text-red-500', dot: 'bg-red-500' }
  if (status === 'under') return { label: '低于范围', className: 'text-green-600', dot: 'bg-green-500' }
  if (status === 'balanced') return { label: '范围合理', className: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
  return { label: '未设目标', className: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
}

export default function TargetDetailDialog({ open, row, detail, totalMarketValue, onClose, onEdit }) {
  if (!row) return null
  const allocation = detail?.allocation || null
  const topStatus = statusPresentation(row.currentRatio, row.targetRatio)
  const allowedRange = getTargetAllowedRange(row.targetRatio)
  const difference = Number.isFinite(Number(row.diff)) ? Number(row.diff) : null
  const adjustment = Math.abs(getTargetAdjustmentAmount(Number(row.marketValue), Number(totalMarketValue), Number(row.targetRatio)) || 0)

  return (
    <AppDialog open={open} onClose={onClose} title={`${row.category}配置详情`} description={allocation ? `查看${row.category}内部配置目标与符合度` : `查看${row.category}目标与配置思路`} ariaLabel={`${row.category}配置详情`} maxWidth="sm:max-w-xl">
      <div className="space-y-4">
        <section className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
          <div className="text-xs text-gray-400">大类配置符合度</div>
          <div className={`mt-1 flex items-center gap-1.5 text-base font-semibold ${topStatus.className}`}><span className={`h-1.5 w-1.5 rounded-full ${topStatus.dot}`} />{topStatus.label}</div>
          <div className="mt-3 grid grid-cols-3 border-t border-gray-100 pt-3 text-center dark:border-gray-700">
            <div className="border-r border-gray-100 dark:border-gray-700"><div className="text-[11px] text-gray-400">当前配置</div><div className="font-num mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{percent(row.currentRatio)}</div></div>
            <div className="border-r border-gray-100 dark:border-gray-700"><div className="text-[11px] text-gray-400">计划目标</div><div className="font-num mt-1 text-sm font-medium text-gray-800 dark:text-gray-100">{percent(row.targetRatio)}</div></div>
            <div><div className="text-[11px] text-gray-400">目标偏差</div><div className={`font-num mt-1 text-sm font-medium ${topStatus.className}`}>{difference === null ? '—' : `${difference > 0 ? '+' : ''}${(difference * 100).toFixed(1)}%`}</div></div>
          </div>
          {allowedRange && <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-700/40 dark:text-gray-300">合理区间：{percent(allowedRange.lower)}～{percent(allowedRange.upper)}</div>}
          {(topStatus.label === '超出范围' || topStatus.label === '低于范围') && <div className={`mt-2 text-xs ${topStatus.className}`}>{topStatus.label === '超出范围' ? '建议减少' : '建议增加'} {formatCurrency(adjustment, { decimals: 0 })}</div>}
        </section>

        {allocation ? (
          <section>
            <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
              <div><h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.category}内部配置</h4><p className="mt-0.5 text-xs text-gray-400">当前比例按该类资产内部市值计算</p></div>
              <button type="button" onClick={onEdit} className="h-8 shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-600 transition-transform active:scale-95 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">调整细分目标</button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
              {(allocation.items || []).map((item, index) => {
                const itemStatus = statusPresentation(item.currentRatio, item.targetRatio)
                const itemRange = item.targetRatio !== null ? getTargetAllowedRange(item.targetRatio) : null
                const track = getTargetTrackPositions(item.currentRatio, item.targetRatio, itemRange, 18)
                const trackColor = itemStatus.label === '超出范围' ? '#ef4444' : itemStatus.label === '低于范围' ? '#10b981' : '#3b82f6'
                return (
                  <div key={item.name} className={`px-3.5 py-3 ${index ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{item.name}</div><div className={`mt-0.5 flex items-center gap-1 text-[11px] ${itemStatus.className}`}><span className={`h-1.5 w-1.5 rounded-full ${itemStatus.dot}`} />{itemStatus.label}</div></div>{item.targetRatio !== null && <span className="font-num shrink-0 text-sm font-medium text-gray-600 dark:text-gray-300">目标 {percent(item.targetRatio)}</span>}</div>
                    {track ? (
                      <div className="mt-2.5 px-0.5">
                        <div className="relative h-[68px]" aria-label={`${item.name}偏离目标范围尺：当前 ${percent(item.currentRatio)}，目标 ${percent(item.targetRatio)}`}>
                          <span className="absolute left-0 top-0 text-[10px] font-medium text-gray-400">低配</span><span className="absolute left-1/2 top-0 -translate-x-1/2 text-[10px] font-semibold text-gray-700 dark:text-gray-200">目标</span><span className="absolute right-0 top-0 text-[10px] font-medium text-gray-400">超配</span>
                          <div className="absolute inset-x-0 top-[30px] h-px bg-gray-300 dark:bg-gray-600" /><div className="absolute top-[23px] h-[15px] rounded-md bg-emerald-50 ring-1 ring-inset ring-emerald-100/70 dark:bg-emerald-500/10 dark:ring-emerald-400/10" style={{ left: `${track.rangeStart}%`, width: `${track.rangeEnd - track.rangeStart}%` }} /><div className="absolute top-[17px] h-7 w-px -translate-x-1/2 bg-gray-800 dark:bg-gray-100" style={{ left: `${track.targetPosition}%` }} /><div className="absolute top-[30px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-sm dark:border-gray-800" style={{ left: `${track.currentPosition}%`, backgroundColor: trackColor }} /><span className="absolute top-[44px] -translate-x-1/2 whitespace-nowrap text-[9px] font-medium" style={{ left: `${Math.min(96, Math.max(4, track.currentPosition))}%`, color: trackColor }}>当前</span>
                        </div>
                        <div className="grid grid-cols-3 border-t border-gray-100 pt-2 text-center dark:border-gray-700/80"><div><div className="text-[10px] text-gray-400">当前</div><div className={`font-num mt-0.5 text-sm font-medium ${itemStatus.className}`}>{percent(item.currentRatio)}</div></div><div><div className="text-[10px] text-gray-400">目标</div><div className="font-num mt-0.5 text-sm font-medium text-gray-700 dark:text-gray-200">{percent(item.targetRatio)}</div></div><div><div className="text-[10px] text-gray-400">偏差</div><div className={`font-num mt-0.5 text-sm font-medium ${itemStatus.className}`}>{`${item.diff > 0 ? '+' : ''}${(item.diff * 100).toFixed(1)}%`}</div></div></div>
                      </div>
                    ) : <div className="mt-2 rounded-lg bg-gray-50 px-2 py-2 text-center text-xs text-gray-400 dark:bg-gray-700/35">当前占该类资产 {percent(item.currentRatio)}，尚未设置细分目标</div>}
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">配置思路</h4><button type="button" onClick={onEdit} className="h-8 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-600 active:scale-95 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400">编辑配置思路</button></div>
            <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${detail?.strategy ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>{detail?.strategy || '暂未填写配置思路'}</p>
          </section>
        )}
      </div>
    </AppDialog>
  )
}
