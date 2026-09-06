import { getTargetAllocationStatus } from '../utils/targetAllocation.js'
import { formatCurrency, formatWan } from '../utils/format.js'
import AppDialog from './AppDialog.jsx'
import TargetAllocationScale from './TargetAllocationScale.jsx'
import TargetEditButton from './TargetEditButton.jsx'

function statusPresentation(currentRatio, targetRatio) {
  const { status } = getTargetAllocationStatus(currentRatio, targetRatio)
  if (status === 'over') return { label: '超出范围', className: 'text-red-500', dot: 'bg-red-500' }
  if (status === 'under') return { label: '低于范围', className: 'text-green-600', dot: 'bg-green-500' }
  if (status === 'balanced') return { label: '范围合理', className: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' }
  return { label: '未设目标', className: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' }
}

export default function TargetDetailDialog({ open, row, detail, onClose, onEdit, editDisabled = false }) {
  if (!row) return null
  const allocation = detail?.allocation || null
  const detailItems = allocation?.items || []
  const overItems = detailItems.filter((item) => getTargetAllocationStatus(item.currentRatio, item.targetRatio).status === 'over')
  const underItems = detailItems.filter((item) => getTargetAllocationStatus(item.currentRatio, item.targetRatio).status === 'under')
  const balancedItems = detailItems.filter((item) => getTargetAllocationStatus(item.currentRatio, item.targetRatio).status === 'balanced')
  const unsetItems = detailItems.filter((item) => item.targetRatio === null)
  const attentionItems = [...overItems, ...underItems, ...unsetItems]
  const isDetailBalanced = Boolean(allocation) && detailItems.length > 0 && attentionItems.length === 0

  return (
    <AppDialog open={open} onClose={onClose} title={`${row.category}配置详情`} description={allocation ? `查看${row.category}内部配置目标与符合度` : `查看${row.category}目标与配置思路`} ariaLabel={`${row.category}配置详情`} maxWidth="sm:max-w-xl">
      <div className="space-y-4">
        <section className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-gray-400">细分配置符合度</div>
              <div className={`mt-1 text-base font-semibold leading-6 ${isDetailBalanced ? 'text-emerald-600 dark:text-emerald-400' : allocation ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
                {!allocation ? '未设置细分目标' : isDetailBalanced ? '当前细分配置合理' : attentionItems.length ? `${attentionItems.map((item) => item.name).join('、')}需要关注` : '暂无细分配置数据'}
              </div>
            </div>
            {allocation && <div className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl border ${attentionItems.length ? 'border-orange-200 bg-orange-50 text-orange-600 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-400' : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400'}`}><span className="font-num text-lg font-semibold leading-none">{attentionItems.length}</span><span className="mt-0.5 text-[9px] leading-none">需关注</span></div>}
          </div>
          {allocation && (
            <div className="mt-3 grid grid-cols-4 rounded-xl bg-gray-50 py-2.5 text-center dark:bg-gray-700/35">
              <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-sm font-semibold text-red-500">{overItems.length}</div><div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">超出范围</div></div>
              <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-sm font-semibold text-green-600">{underItems.length}</div><div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">低于范围</div></div>
              <div className="border-r border-gray-100 dark:border-gray-700"><div className="font-num text-sm font-semibold text-gray-700 dark:text-gray-200">{balancedItems.length}</div><div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">范围合理</div></div>
              <div><div className="font-num text-sm font-semibold text-amber-500">{unsetItems.length}</div><div className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">未设目标</div></div>
            </div>
          )}
        </section>

        {allocation ? (
          <section>
            <div className="mb-2 flex items-end justify-between gap-3 px-0.5">
              <div><h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{row.category}内部配置</h4><p className="mt-0.5 text-xs text-gray-400">当前比例按该类资产内部市值计算</p></div>
              <TargetEditButton onClick={onEdit} disabled={editDisabled}>调整目标</TargetEditButton>
            </div>
            <div className="space-y-2">
              {detailItems.map((item) => {
                const itemStatus = statusPresentation(item.currentRatio, item.targetRatio)
                const status = getTargetAllocationStatus(item.currentRatio, item.targetRatio).status
                const hasTarget = item.targetRatio !== null && item.targetRatio !== undefined
                const driftAmount = hasTarget ? Math.abs(item.diff * 100) : null
                const adjustmentAmount = hasTarget ? Math.abs(allocation.marketValue * item.targetRatio - item.marketValue) : null
                return (
                  <div key={item.name} className="target-allocation-card rounded-xl border border-gray-100 bg-white px-3.5 pb-3 pt-3.5 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0"><div className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.name}</div><div className="mt-0.5 text-[11px] text-gray-400">当前金额 {formatWan(item.marketValue)}</div></div>
                      <span className={`inline-flex shrink-0 items-center gap-1.5 pt-0.5 text-xs font-medium ${itemStatus.className}`}><span className={`h-1.5 w-1.5 rounded-full ${itemStatus.dot}`} />{itemStatus.label}</span>
                    </div>
                    <TargetAllocationScale currentRatio={item.currentRatio} targetRatio={item.targetRatio} diff={item.diff} status={status} label={item.name} />
                    <div className={`mt-3 flex min-h-10 items-center rounded-lg border px-3 py-2 text-xs ${status === 'over' ? 'border-red-100 bg-red-50/70 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400' : status === 'under' ? 'border-green-100 bg-green-50/70 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400' : hasTarget ? 'border-gray-100 bg-gray-50/70 text-gray-600 dark:border-gray-700 dark:bg-gray-700/30 dark:text-gray-300' : 'border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                      <span className="font-medium">
                        {status === 'over' && <>超出 {driftAmount.toFixed(1)}%<span className="ml-1 font-normal opacity-70">· 建议减少 {formatCurrency(adjustmentAmount, { decimals: 0 })}</span></>}
                        {status === 'under' && <>低于 {driftAmount.toFixed(1)}%<span className="ml-1 font-normal opacity-70">· 建议增加 {formatCurrency(adjustmentAmount, { decimals: 0 })}</span></>}
                        {hasTarget && status !== 'over' && status !== 'under' && '当前配置在合理区间内，无需调整'}
                        {!hasTarget && '请先设置计划目标比例'}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-xl border border-gray-100 p-3.5 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">配置思路</h4><TargetEditButton onClick={onEdit} disabled={editDisabled}>编辑配置思路</TargetEditButton></div>
            <p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${detail?.strategy ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400'}`}>{detail?.strategy || '暂未填写配置思路'}</p>
          </section>
        )}
      </div>
    </AppDialog>
  )
}
