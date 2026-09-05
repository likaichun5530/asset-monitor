import { formatChange, formatDateLong, formatNumber, formatPercent } from '../utils/format.js'

export default function HomeAssetHero({ total, todayChange, todayChangePct, updateDate, pendingCount, editMode, valuesHidden, onToggleEdit, onToggleValuesHidden, onOpenTodayDetail }) {
  const isUp = Number(todayChange) > 0
  const isDown = Number(todayChange) < 0
  const changeColor = valuesHidden
    ? 'text-gray-500'
    : isUp
    ? 'text-red-500'
    : isDown
      ? 'text-green-600'
      : 'text-gray-500'

  return (
    <div className="card home-hero-card flex min-h-[92px] flex-col justify-center overflow-hidden px-4 py-3 sm:min-h-[150px] sm:p-5">
      <div className="flex min-h-[68px] items-stretch justify-between gap-3 sm:min-h-[110px] sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
            <span>总资产（人民币）</span>
            <button type="button" onClick={onToggleValuesHidden} aria-label={valuesHidden ? '显示资产金额' : '隐藏资产金额'} aria-pressed={valuesHidden} className="no-sort inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-95 dark:hover:bg-gray-700 dark:hover:text-gray-200">
              {valuesHidden ? (
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 3 18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.2A10.6 10.6 0 0 1 12 4c5.5 0 9 5 9 5a15.8 15.8 0 0 1-2.1 2.7" /><path d="M6.6 6.6C4.4 8 3 10 3 10s3.5 5 9 5c1 0 1.9-.2 2.7-.4" /></svg>
              ) : (
                <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" /><circle cx="12" cy="12" r="2.5" /></svg>
              )}
            </button>
          </div>
          <div className="font-num mt-1 whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.04em] text-gray-900 dark:text-gray-100 sm:mt-3">
            {valuesHidden ? '******' : formatNumber(total)}
          </div>
          <div className="font-num-regular mt-1.5 text-xs text-gray-400 sm:mt-3">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center text-right">
          <button type="button" onClick={onOpenTodayDetail} disabled={valuesHidden} aria-label={valuesHidden ? '资产金额已隐藏' : '查看今日盈亏明细'} className="font-num flex flex-col items-end rounded-lg bg-transparent text-right transition-opacity hover:opacity-75 disabled:cursor-default disabled:hover:opacity-100">
            <span className="text-xs font-medium text-gray-400">今日盈亏</span>
            <span className={`mt-1 text-base font-medium leading-none ${changeColor}`}>
              {valuesHidden ? '******' : todayChange === null || todayChange === undefined ? '--' : formatChange(todayChange)}
            </span>
            <span className={`mt-1 text-xs font-medium ${changeColor}`}>
              {valuesHidden ? '******' : todayChangePct === null || todayChangePct === undefined ? '--' : formatPercent(todayChangePct, { withSign: true })}
            </span>
          </button>
          <button type="button" onClick={onToggleEdit} className="mt-3 hidden h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white/80 px-3 text-xs font-medium text-slate-500 transition-colors hover:border-brand-200 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 sm:inline-flex">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
              {editMode ? '退出编辑' : '编辑布局'}
          </button>
        </div>
      </div>
      {pendingCount > 0 && <div className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xs text-yellow-600">{pendingCount} 条待同步</span></div>}
    </div>
  )
}
