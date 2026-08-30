import { formatCurrency, formatDateLong } from '../utils/format.js'

function SnapshotIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="7" width="15" height="13" rx="3" />
      <path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4H17" opacity=".75" />
      <path d="M11.5 11v5M9 13.5h5" />
      <path d="m19.5 3 .45 1.05L21 4.5l-1.05.45L19.5 6l-.45-1.05L18 4.5l1.05-.45L19.5 3Z" fill="currentColor" stroke="none" />
    </svg>
  )
}

export default function HomeAssetHero({ total, updateDate, pendingCount, snapshotMsg, snapshotLoading, editMode, onToggleEdit, onSnapshot }) {
  return (
    <div className="card home-hero-card py-2 px-4 sm:p-5 flex flex-col justify-center min-h-[85px] sm:min-h-[150px] relative overflow-hidden">
      <div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-gray-500"><span className="hidden sm:inline-block h-2 w-2 rounded-full bg-brand-500" />总资产（人民币）</div>
            <div className="text-3xl sm:text-[38px] sm:leading-tight font-bold mt-1 sm:mt-3 text-gray-900 tracking-tight">{formatCurrency(total)}</div>
            <div className="mt-1 sm:mt-3 text-xs text-gray-400">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <button type="button" onClick={onToggleEdit} className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand-200 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
              {editMode ? '退出编辑' : '编辑布局'}
            </button>
            <button onClick={onSnapshot} disabled={snapshotLoading} className="inline-flex items-center justify-center gap-2 w-7 h-7 sm:w-auto sm:h-10 sm:px-4 rounded-full sm:rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs sm:text-sm font-medium shadow-sm transition-colors disabled:opacity-60 shrink-0">
              {snapshotLoading ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              ) : (
                <SnapshotIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              )}
              <span className="hidden sm:inline">生成快照</span>
            </button>
          </div>
        </div>
      </div>
      <div className="mt-1 flex items-center gap-2 flex-wrap">
        {pendingCount > 0 && <span className="text-xs text-yellow-600">{pendingCount} 条待同步</span>}
        {snapshotMsg && <span className={`text-xs truncate ${snapshotMsg.type === 'error' ? 'text-red-500' : snapshotMsg.type === 'warn' ? 'text-yellow-600' : 'text-green-600'}`}>{snapshotMsg.text}</span>}
      </div>
    </div>
  )
}
