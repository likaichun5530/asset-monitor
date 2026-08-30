import { formatChange, formatDateLong, formatNumber, formatPercent } from '../utils/format.js'

export default function HomeAssetHero({ total, todayChange, todayChangePct, updateDate, pendingCount, editMode, onToggleEdit, onOpenTodayDetail }) {
  const isUp = Number(todayChange) > 0
  const isDown = Number(todayChange) < 0
  const changeColor = isUp
    ? 'text-red-500 dark:text-red-400'
    : isDown
      ? 'text-green-600 dark:text-green-400'
      : 'text-gray-500 dark:text-gray-400'

  return (
    <div className="card home-hero-card flex min-h-[92px] flex-col justify-center overflow-hidden px-4 py-3 sm:min-h-[150px] sm:p-5">
      <div className="flex min-h-[68px] items-stretch justify-between gap-3 sm:min-h-[110px] sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <div className="text-xs font-medium text-gray-500 sm:text-sm">总资产（人民币）</div>
          <div
            className="mt-1 whitespace-nowrap text-[27px] font-semibold leading-none tracking-[-0.04em] text-gray-900 tabular-nums dark:text-gray-100 sm:mt-3 sm:text-[36px]"
            style={{ fontFamily: "'Arial Narrow', 'Roboto Condensed', 'SF Pro Display', Inter, system-ui, sans-serif", fontStretch: 'condensed' }}
          >
            {formatNumber(total)}
          </div>
          <div className="mt-1.5 text-[11px] text-gray-400 sm:mt-3 sm:text-xs">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
        </div>

        <div className="flex shrink-0 flex-col items-end justify-center text-right">
          <button type="button" onClick={onOpenTodayDetail} aria-label="查看今日盈亏明细" className="flex flex-col items-end rounded-lg bg-transparent text-right transition-opacity hover:opacity-75">
            <span className="text-xs font-medium text-gray-400 sm:text-[13px]">今日盈亏</span>
            <span className={`font-num mt-1 text-base font-semibold leading-none sm:text-[19px] ${changeColor}`}>
              {todayChange === null || todayChange === undefined ? '--' : formatChange(todayChange)}
            </span>
            <span className={`font-num mt-1 text-[13px] font-medium sm:text-[15px] ${changeColor}`}>
              {todayChangePct === null || todayChangePct === undefined ? '--' : formatPercent(todayChangePct, { withSign: true })}
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
