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
            <button type="button" onClick={onToggleValuesHidden} aria-label={valuesHidden ? '显示资产金额' : '隐藏资产金额'} aria-pressed={valuesHidden} className="no-sort inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition duration-200 hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 active:scale-90 dark:hover:bg-gray-700 dark:hover:text-gray-200 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-gray-800">
              <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {valuesHidden ? (
                  <>
                    <path d="M3.5 10.5c1.8 3.2 4.6 5 8.5 5s6.7-1.8 8.5-5" />
                    <path d="m5.5 13-1.5 2M9.5 15.2 9 17.5m5.5-2.3.5 2.3m3.5-4.5 1.5 2" />
                  </>
                ) : (
                  <>
                    <path d="M3.2 10.7C5.2 7.6 8.2 6 12 6s6.8 1.6 8.8 4.7a2.4 2.4 0 0 1 0 2.6C18.8 16.4 15.8 18 12 18s-6.8-1.6-8.8-4.7a2.4 2.4 0 0 1 0-2.6Z" />
                    <circle cx="12" cy="12" r="2.8" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <div className="font-num mt-1 whitespace-nowrap text-[28px] font-bold leading-none tracking-[-0.04em] text-gray-900 dark:text-gray-100 sm:mt-3">
            {valuesHidden ? '******' : formatNumber(total)}
          </div>
          <div className="font-num-regular mt-1.5 text-xs text-gray-400 sm:mt-3">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center text-right">
          <button type="button" onClick={onOpenTodayDetail} disabled={valuesHidden} aria-label={valuesHidden ? '资产金额已隐藏' : '查看今日盈亏明细'} className="font-num flex flex-col items-end rounded-lg bg-transparent text-right transition-transform active:scale-[0.99] disabled:cursor-default disabled:active:scale-100">
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
