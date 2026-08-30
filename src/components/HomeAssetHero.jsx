import { formatCurrency, formatDateLong } from '../utils/format.js'

function SnapshotIcon({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7.2 7 8.5 4.8c.3-.5.8-.8 1.4-.8h4.2c.6 0 1.1.3 1.4.8L16.8 7H19a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3h2.2Z" fill="currentColor" />
      <circle cx="12" cy="13.5" r="4.2" fill="#60a5fa" />
      <circle cx="12" cy="13.5" r="2.45" fill="#dbeafe" />
      <circle cx="11.15" cy="12.65" r=".8" fill="#fff" />
      <circle cx="18.2" cy="10.1" r="1" fill="#fbbf24" />
      <path d="m20.2 3 .45 1.1 1.1.45-1.1.45-.45 1.1-.45-1.1-1.1-.45 1.1-.45.45-1.1Z" fill="#fde68a" />
    </svg>
  )
}

export default function HomeAssetHero({ total, updateDate, pendingCount, snapshotMsg, snapshotLoading, editMode, onToggleEdit, onSnapshot }) {
  return (
    <div className="card home-hero-card py-2 px-4 sm:p-5 flex flex-col justify-center min-h-[85px] sm:min-h-[150px] relative overflow-hidden">
      <div>
        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-500 sm:text-sm">总资产（人民币）</div>
            <div className="text-3xl sm:text-[38px] sm:leading-tight font-bold mt-1 sm:mt-3 text-gray-900 tracking-tight">{formatCurrency(total)}</div>
            <div className="mt-1 sm:mt-3 text-xs text-gray-400">更新于 {updateDate ? formatDateLong(updateDate) : '--'}</div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <button type="button" onClick={onToggleEdit} className="hidden sm:inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-4 text-sm font-medium text-slate-600 shadow-sm hover:border-brand-200 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
              {editMode ? '退出编辑' : '编辑布局'}
            </button>
            <button onClick={onSnapshot} disabled={snapshotLoading} className="inline-flex h-7 w-7 shrink-0 items-center justify-center gap-2 rounded-full border border-gray-200 bg-transparent text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 sm:h-10 sm:w-auto sm:rounded-xl sm:px-4 sm:text-sm sm:font-medium">
              {snapshotLoading ? (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
              ) : (
                <SnapshotIcon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
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
