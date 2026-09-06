export default function TargetEditButton({ onClick, disabled = false, children = '调整目标', className = '' }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`h-8 shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 text-xs font-medium text-brand-600 transition-all hover:bg-brand-100 active:scale-95 disabled:scale-100 disabled:opacity-40 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-400 dark:hover:bg-brand-500/15 ${className}`}>
      {children}
    </button>
  )
}
